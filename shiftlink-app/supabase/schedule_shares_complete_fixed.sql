-- Complete fixed version of schedule_shares with all corrections
-- This version ensures all dependencies exist and uses correct syntax

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Ensure prerequisite tables exist
CREATE TABLE IF NOT EXISTS sites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS schedules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
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

-- Drop existing objects to ensure clean creation
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

-- Create schedule_shares table
CREATE TABLE schedule_shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- 공유 정보
  share_token UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  share_type VARCHAR(20) DEFAULT 'view' CHECK (share_type IN ('view', 'download', 'subscribe')),
  
  -- 접근 제어
  created_by UUID NOT NULL REFERENCES employees(id),
  allowed_viewers UUID[] DEFAULT NULL,
  require_password BOOLEAN DEFAULT false,
  password_hash TEXT DEFAULT NULL,
  
  -- 만료 및 상태
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  is_active BOOLEAN DEFAULT true,
  deactivated_at TIMESTAMPTZ DEFAULT NULL,
  deactivated_by UUID REFERENCES employees(id),
  
  -- 설정
  include_personal_info BOOLEAN DEFAULT false,
  allow_download BOOLEAN DEFAULT true,
  allow_calendar_sync BOOLEAN DEFAULT true,
  
  -- 통계
  access_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ DEFAULT NULL,
  
  -- 메타데이터
  description TEXT DEFAULT NULL,
  custom_title TEXT DEFAULT NULL
);

-- Create share_access_logs table
CREATE TABLE share_access_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  share_id UUID NOT NULL REFERENCES schedule_shares(id) ON DELETE CASCADE,
  schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- 접근 정보
  action VARCHAR(20) DEFAULT 'view' CHECK (action IN ('view', 'download', 'subscribe')),
  user_agent TEXT,
  ip_address INET,
  accessed_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 추가 데이터
  referrer TEXT,
  session_id TEXT,
  response_size INTEGER,
  response_time_ms INTEGER
);

-- Add columns to schedule_versions
ALTER TABLE schedule_versions ADD COLUMN IF NOT EXISTS shared_count INTEGER DEFAULT 0;
ALTER TABLE schedule_versions ADD COLUMN IF NOT EXISTS last_shared_at TIMESTAMPTZ DEFAULT NULL;

-- Create indexes
CREATE INDEX idx_schedule_shares_token ON schedule_shares(share_token);
CREATE INDEX idx_schedule_shares_schedule ON schedule_shares(schedule_id);
CREATE INDEX idx_schedule_shares_tenant ON schedule_shares(tenant_id);
CREATE INDEX idx_schedule_shares_active ON schedule_shares(is_active, expires_at);
CREATE INDEX idx_share_access_logs_share ON share_access_logs(share_id);
CREATE INDEX idx_share_access_logs_accessed ON share_access_logs(accessed_at);

-- Enable RLS
ALTER TABLE schedule_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_access_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their tenant's schedule shares" 
ON schedule_shares
FOR SELECT
USING (
    EXISTS (
        SELECT 1 
        FROM employees e 
        WHERE e.auth_user_id = auth.uid()
        AND e.tenant_id = schedule_shares.tenant_id
    )
);

CREATE POLICY "Only admins and managers can manage schedule shares" 
ON schedule_shares
FOR ALL
USING (
    EXISTS (
        SELECT 1 
        FROM employees e 
        WHERE e.auth_user_id = auth.uid() 
        AND e.tenant_id = schedule_shares.tenant_id 
        AND e.role IN ('admin', 'manager')
    )
);

CREATE POLICY "System only access to share logs" 
ON share_access_logs
FOR ALL
USING (false);

-- Create functions with proper $$ syntax

-- Function: deactivate_expired_shares
CREATE OR REPLACE FUNCTION deactivate_expired_shares()
RETURNS INTEGER AS $$
DECLARE
  affected_count INTEGER;
BEGIN
  UPDATE schedule_shares 
  SET 
    is_active = false,
    deactivated_at = NOW()
  WHERE 
    is_active = true 
    AND expires_at < NOW();
    
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RETURN affected_count;
END;
$$ LANGUAGE plpgsql;

-- Function: update_share_statistics
CREATE OR REPLACE FUNCTION update_share_statistics()
RETURNS VOID AS $$
BEGIN
  UPDATE schedule_versions sv
  SET 
    shared_count = (
      SELECT COUNT(*)
      FROM schedule_shares ss
      WHERE ss.schedule_id = sv.schedule_id
        AND ss.is_active = true
    ),
    last_shared_at = (
      SELECT MAX(ss.created_at)
      FROM schedule_shares ss
      WHERE ss.schedule_id = sv.schedule_id
        AND ss.is_active = true
    )
  WHERE sv.id IN (
    SELECT DISTINCT sv2.id
    FROM schedule_versions sv2
    JOIN schedule_shares ss ON ss.schedule_id = sv2.schedule_id
    WHERE ss.created_at > sv2.created_at - INTERVAL '1 hour'
  );
END;
$$ LANGUAGE plpgsql;

-- Function: validate_share_token
CREATE OR REPLACE FUNCTION validate_share_token(p_token UUID)
RETURNS TABLE (
  share_id UUID,
  schedule_id UUID,
  tenant_id UUID,
  share_type VARCHAR,
  require_password BOOLEAN,
  include_personal_info BOOLEAN,
  is_valid BOOLEAN,
  error_message TEXT
) AS $$
DECLARE
  v_share_record RECORD;
BEGIN
  -- Find the share record
  SELECT 
    ss.id,
    ss.schedule_id,
    ss.tenant_id,
    ss.share_type,
    ss.require_password,
    ss.include_personal_info,
    ss.is_active,
    ss.expires_at
  INTO v_share_record
  FROM schedule_shares ss
  WHERE ss.share_token = p_token;
  
  -- If found, return the record with validation
  IF FOUND THEN
    RETURN QUERY
    SELECT 
      v_share_record.id,
      v_share_record.schedule_id,
      v_share_record.tenant_id,
      v_share_record.share_type::VARCHAR,
      v_share_record.require_password,
      v_share_record.include_personal_info,
      CASE 
        WHEN NOT v_share_record.is_active THEN false
        WHEN v_share_record.expires_at < NOW() THEN false
        ELSE true
      END as is_valid,
      CASE 
        WHEN NOT v_share_record.is_active THEN 'Share has been deactivated'::TEXT
        WHEN v_share_record.expires_at < NOW() THEN 'Share has expired'::TEXT
        ELSE NULL::TEXT
      END as error_message;
  ELSE
    -- Record not found, return default values
    RETURN QUERY
    SELECT 
      NULL::UUID,
      NULL::UUID,
      NULL::UUID,
      NULL::VARCHAR,
      false,
      false,
      false,
      'Share not found'::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function: trigger_update_share_statistics
CREATE OR REPLACE FUNCTION trigger_update_share_statistics()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM update_share_statistics();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_share_stats_on_insert
  AFTER INSERT ON schedule_shares
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_share_statistics();

-- Function: cleanup_old_access_logs
CREATE OR REPLACE FUNCTION cleanup_old_access_logs(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM share_access_logs 
  WHERE accessed_at < NOW() - (days_to_keep || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Add comments
COMMENT ON TABLE schedule_shares IS '스케줄 공유 정보';
COMMENT ON COLUMN schedule_shares.share_token IS '공유 토큰 (URL에 사용)';
COMMENT ON COLUMN schedule_shares.share_type IS '공유 유형 (view/download/subscribe)';
COMMENT ON COLUMN schedule_shares.allowed_viewers IS 'NULL이면 모든 사람 접근 가능';
COMMENT ON TABLE share_access_logs IS '공유 접근 로그';

-- Verify creation
SELECT 
    table_name,
    COUNT(*) as column_count,
    array_agg(column_name ORDER BY ordinal_position) as columns
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN ('schedule_shares', 'share_access_logs')
GROUP BY table_name
ORDER BY table_name;