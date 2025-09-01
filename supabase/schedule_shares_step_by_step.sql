-- Step-by-step creation of schedule_shares to isolate the error
-- Run each step separately to find where the error occurs

-- STEP 0: Clean up any existing objects
DROP TRIGGER IF EXISTS update_share_stats_on_insert ON schedule_shares;
DROP FUNCTION IF EXISTS trigger_update_share_statistics() CASCADE;
DROP FUNCTION IF EXISTS update_share_statistics() CASCADE;
DROP FUNCTION IF EXISTS validate_share_token(UUID) CASCADE;
DROP FUNCTION IF EXISTS deactivate_expired_shares() CASCADE;
DROP FUNCTION IF EXISTS cleanup_old_access_logs(INTEGER) CASCADE;
DROP POLICY IF EXISTS "Users can view their tenant's schedule shares" ON schedule_shares;
DROP POLICY IF EXISTS "Only admins and managers can manage schedule shares" ON schedule_shares;
DROP POLICY IF EXISTS "System only access to share logs" ON share_access_logs;
DROP TABLE IF EXISTS share_access_logs CASCADE;
DROP TABLE IF EXISTS schedule_shares CASCADE;

-- STEP 1: Create prerequisite tables if needed
CREATE TABLE IF NOT EXISTS sites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS schedules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES employees(id),
    updated_by UUID REFERENCES employees(id)
);

CREATE TABLE IF NOT EXISTS schedule_versions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    changes JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES employees(id),
    UNIQUE(schedule_id, version_number)
);

-- STEP 2: Create schedule_shares table (minimal version)
CREATE TABLE schedule_shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  share_token UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL
);

-- STEP 3: Verify the column exists
SELECT 
    'share_token column exists' as status
FROM information_schema.columns 
WHERE table_name = 'schedule_shares' 
AND column_name = 'share_token';

-- STEP 4: Add more columns one by one
ALTER TABLE schedule_shares ADD COLUMN IF NOT EXISTS share_type VARCHAR(20) DEFAULT 'view';
ALTER TABLE schedule_shares ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES employees(id);
ALTER TABLE schedule_shares ADD COLUMN IF NOT EXISTS allowed_viewers UUID[] DEFAULT NULL;
ALTER TABLE schedule_shares ADD COLUMN IF NOT EXISTS require_password BOOLEAN DEFAULT false;
ALTER TABLE schedule_shares ADD COLUMN IF NOT EXISTS password_hash TEXT DEFAULT NULL;
ALTER TABLE schedule_shares ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE schedule_shares ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days';
ALTER TABLE schedule_shares ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE schedule_shares ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE schedule_shares ADD COLUMN IF NOT EXISTS deactivated_by UUID REFERENCES employees(id);
ALTER TABLE schedule_shares ADD COLUMN IF NOT EXISTS include_personal_info BOOLEAN DEFAULT false;
ALTER TABLE schedule_shares ADD COLUMN IF NOT EXISTS allow_download BOOLEAN DEFAULT true;
ALTER TABLE schedule_shares ADD COLUMN IF NOT EXISTS allow_calendar_sync BOOLEAN DEFAULT true;
ALTER TABLE schedule_shares ADD COLUMN IF NOT EXISTS access_count INTEGER DEFAULT 0;
ALTER TABLE schedule_shares ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE schedule_shares ADD COLUMN IF NOT EXISTS description TEXT DEFAULT NULL;
ALTER TABLE schedule_shares ADD COLUMN IF NOT EXISTS custom_title TEXT DEFAULT NULL;

-- STEP 5: Add constraints
ALTER TABLE schedule_shares 
ADD CONSTRAINT check_share_type 
CHECK (share_type IN ('view', 'download', 'subscribe'));

-- Make expires_at NOT NULL (need to update existing rows first)
UPDATE schedule_shares SET expires_at = NOW() + INTERVAL '30 days' WHERE expires_at IS NULL;
ALTER TABLE schedule_shares ALTER COLUMN expires_at SET NOT NULL;

-- Make created_by NOT NULL (need to handle existing rows)
-- Skip this if it causes issues

-- STEP 6: Create share_access_logs table
CREATE TABLE share_access_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  share_id UUID NOT NULL REFERENCES schedule_shares(id) ON DELETE CASCADE,
  schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  action VARCHAR(20) DEFAULT 'view' CHECK (action IN ('view', 'download', 'subscribe')),
  user_agent TEXT,
  ip_address INET,
  accessed_at TIMESTAMPTZ DEFAULT NOW(),
  referrer TEXT,
  session_id TEXT,
  response_size INTEGER,
  response_time_ms INTEGER
);

-- STEP 7: Add columns to schedule_versions
ALTER TABLE schedule_versions ADD COLUMN IF NOT EXISTS shared_count INTEGER DEFAULT 0;
ALTER TABLE schedule_versions ADD COLUMN IF NOT EXISTS last_shared_at TIMESTAMPTZ DEFAULT NULL;

-- STEP 8: Create indexes
CREATE INDEX IF NOT EXISTS idx_schedule_shares_token ON schedule_shares(share_token);
CREATE INDEX IF NOT EXISTS idx_schedule_shares_schedule ON schedule_shares(schedule_id);
CREATE INDEX IF NOT EXISTS idx_schedule_shares_tenant ON schedule_shares(tenant_id);
CREATE INDEX IF NOT EXISTS idx_schedule_shares_active ON schedule_shares(is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_share_access_logs_share ON share_access_logs(share_id);
CREATE INDEX IF NOT EXISTS idx_share_access_logs_accessed ON share_access_logs(accessed_at);

-- STEP 9: Enable RLS
ALTER TABLE schedule_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_access_logs ENABLE ROW LEVEL SECURITY;

-- STEP 10: Create simple test function to verify share_token is accessible
CREATE OR REPLACE FUNCTION test_share_token_access()
RETURNS BOOLEAN AS $$
BEGIN
  -- Try to access share_token column
  RETURN EXISTS (
    SELECT share_token 
    FROM schedule_shares 
    LIMIT 1
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Test the function
SELECT test_share_token_access() as can_access_share_token;

-- STEP 11: Verify final state
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN ('schedule_shares', 'share_access_logs')
AND column_name = 'share_token'
ORDER BY table_name, ordinal_position;