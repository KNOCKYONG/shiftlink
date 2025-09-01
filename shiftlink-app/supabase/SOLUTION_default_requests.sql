-- SOLUTION: Complete script to create default_requests table without errors
-- This script handles all dependencies and common issues

-- STEP 1: Ensure prerequisites are met
-- =====================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum type if needed
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'manager', 'employee');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- STEP 2: Create base tables if they don't exist
-- ================================================

-- Create tenants table
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    subscription_tier VARCHAR(50) DEFAULT 'basic',
    max_employees INTEGER DEFAULT 50,
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create teams table
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create employees table
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    auth_user_id UUID, -- Reference to auth.users when available
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    employee_code VARCHAR(100),
    role user_role DEFAULT 'employee',
    phone VARCHAR(50),
    hire_date DATE,
    skills JSONB DEFAULT '[]',
    preferences JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, email)
);

-- STEP 3: Drop existing default_requests objects if they exist
-- =============================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own default requests" ON default_requests;
DROP POLICY IF EXISTS "Users can insert own default requests" ON default_requests;
DROP POLICY IF EXISTS "Users can update own pending default requests" ON default_requests;
DROP POLICY IF EXISTS "Managers can manage all default requests" ON default_requests;

-- Drop existing triggers
DROP TRIGGER IF EXISTS default_requests_updated_at ON default_requests;
DROP TRIGGER IF EXISTS auto_approve_simple_default_requests ON default_requests;

-- Drop existing functions
DROP FUNCTION IF EXISTS update_default_requests_updated_at() CASCADE;
DROP FUNCTION IF EXISTS auto_approve_simple_requests() CASCADE;
DROP FUNCTION IF EXISTS expire_old_requests() CASCADE;
DROP FUNCTION IF EXISTS validate_default_request(VARCHAR, INTEGER, DATE, VARCHAR, BOOLEAN, VARCHAR) CASCADE;

-- Drop existing view
DROP VIEW IF EXISTS active_default_requests;

-- Drop existing table
DROP TABLE IF EXISTS default_requests CASCADE;

-- STEP 4: Create the default_requests table
-- ==========================================

CREATE TABLE default_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- 요청 유형
    request_type VARCHAR(30) NOT NULL CHECK (request_type IN (
        'fixed_shift',     -- 고정 근무
        'leave',          -- 휴가
        'constraint',     -- 제약사항
        'preferred_off',  -- 선호 휴무
        'emergency_contact', -- 비상 연락처
        'training',       -- 교육/회의
        'medical'         -- 의료 관련
    )),
    
    -- 요청 정보
    title VARCHAR(200) NOT NULL,
    description TEXT,
    
    -- 시간 설정
    day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
    specific_date DATE,
    start_date DATE,
    end_date DATE,
    
    -- 근무 시간대
    shift_type VARCHAR(20) CHECK (shift_type IN ('day', 'evening', 'night', 'off')),
    
    -- 반복 설정
    is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
    recurrence_pattern VARCHAR(20) CHECK (recurrence_pattern IN (
        'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'
    )),
    
    -- 우선순위
    priority INTEGER NOT NULL DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
    
    -- 승인 관련
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'approved', 'rejected', 'expired'
    )),
    approved_by UUID REFERENCES employees(id),
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    
    -- 적용 설정
    auto_apply BOOLEAN NOT NULL DEFAULT TRUE,
    apply_from_date DATE,
    apply_until_date DATE,
    
    -- 충돌 처리
    conflict_resolution VARCHAR(20) DEFAULT 'manual' CHECK (conflict_resolution IN (
        'manual', 'override', 'skip', 'notify'
    )),
    
    -- 메타데이터
    additional_info JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES employees(id)
);

-- STEP 5: Create indexes
-- =======================

CREATE INDEX idx_default_requests_employee ON default_requests(employee_id);
CREATE INDEX idx_default_requests_tenant ON default_requests(tenant_id);
CREATE INDEX idx_default_requests_type ON default_requests(request_type);
CREATE INDEX idx_default_requests_status ON default_requests(status);
CREATE INDEX idx_default_requests_recurring ON default_requests(is_recurring);
CREATE INDEX idx_default_requests_auto_apply ON default_requests(auto_apply);
CREATE INDEX idx_default_requests_date_range ON default_requests(start_date, end_date);
CREATE INDEX idx_default_requests_day_of_week ON default_requests(day_of_week) WHERE day_of_week IS NOT NULL;

-- STEP 6: Enable RLS
-- ==================

ALTER TABLE default_requests ENABLE ROW LEVEL SECURITY;

-- STEP 7: Create RLS policies with proper column qualification
-- =============================================================

-- Policy for viewing requests
CREATE POLICY "Users can view own default requests"
    ON default_requests
    FOR SELECT
    USING (
        employee_id IN (
            SELECT e.id 
            FROM employees e 
            WHERE e.auth_user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 
            FROM employees e 
            WHERE e.auth_user_id = auth.uid()
            AND e.tenant_id = default_requests.tenant_id
            AND e.role IN ('admin', 'manager')
        )
    );

-- Policy for inserting requests
CREATE POLICY "Users can insert own default requests"
    ON default_requests
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 
            FROM employees e 
            WHERE e.auth_user_id = auth.uid()
            AND (
                e.id = default_requests.employee_id
                OR e.role IN ('admin', 'manager')
            )
            AND e.tenant_id = default_requests.tenant_id
        )
    );

-- Policy for updating requests
CREATE POLICY "Users can update own pending default requests"
    ON default_requests
    FOR UPDATE
    USING (
        status = 'pending'
        AND employee_id IN (
            SELECT e.id 
            FROM employees e 
            WHERE e.auth_user_id = auth.uid()
        )
    )
    WITH CHECK (
        employee_id IN (
            SELECT e.id 
            FROM employees e 
            WHERE e.auth_user_id = auth.uid()
        )
    );

-- Policy for managers
CREATE POLICY "Managers can manage all default requests"
    ON default_requests
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 
            FROM employees e 
            WHERE e.auth_user_id = auth.uid()
            AND e.tenant_id = default_requests.tenant_id
            AND e.role IN ('admin', 'manager')
        )
    );

-- STEP 8: Create functions with proper $$ quoting
-- ================================================

CREATE OR REPLACE FUNCTION update_default_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION auto_approve_simple_requests()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.request_type = 'preferred_off' AND NEW.priority >= 7 THEN
        NEW.status = 'approved';
        NEW.approved_at = NOW();
        NEW.approved_by = NEW.created_by;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION expire_old_requests()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    UPDATE default_requests 
    SET status = 'expired'
    WHERE status = 'approved'
    AND apply_until_date IS NOT NULL
    AND apply_until_date < CURRENT_DATE;
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION validate_default_request(
    p_request_type VARCHAR,
    p_day_of_week INTEGER,
    p_specific_date DATE,
    p_shift_type VARCHAR,
    p_is_recurring BOOLEAN,
    p_recurrence_pattern VARCHAR
)
RETURNS BOOLEAN AS $$
BEGIN
    IF p_is_recurring AND p_day_of_week IS NULL THEN
        RETURN FALSE;
    END IF;
    
    IF p_is_recurring AND p_recurrence_pattern IS NULL THEN
        RETURN FALSE;
    END IF;
    
    IF p_request_type = 'fixed_shift' AND p_shift_type IS NULL THEN
        RETURN FALSE;
    END IF;
    
    IF p_specific_date IS NOT NULL AND p_is_recurring THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- STEP 9: Create triggers
-- ========================

CREATE TRIGGER default_requests_updated_at
    BEFORE UPDATE ON default_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_default_requests_updated_at();

CREATE TRIGGER auto_approve_simple_default_requests
    BEFORE INSERT ON default_requests
    FOR EACH ROW
    EXECUTE FUNCTION auto_approve_simple_requests();

-- STEP 10: Add constraints
-- =========================

ALTER TABLE default_requests 
ADD CONSTRAINT check_valid_request 
CHECK (validate_default_request(
    request_type, 
    day_of_week, 
    specific_date, 
    shift_type, 
    is_recurring, 
    recurrence_pattern
));

ALTER TABLE default_requests 
ADD CONSTRAINT check_date_range 
CHECK (
    (start_date IS NULL OR end_date IS NULL OR start_date <= end_date)
    AND 
    (apply_from_date IS NULL OR apply_until_date IS NULL OR apply_from_date <= apply_until_date)
);

-- STEP 11: Create view
-- =====================

CREATE VIEW active_default_requests AS
SELECT * FROM default_requests 
WHERE status = 'approved' 
AND auto_apply = TRUE
AND (apply_from_date IS NULL OR apply_from_date <= CURRENT_DATE)
AND (apply_until_date IS NULL OR apply_until_date >= CURRENT_DATE);

-- STEP 12: Add comments
-- ======================

COMMENT ON TABLE default_requests IS '직원별 사전 요청사항 (고정 근무, 휴가, 제약사항 등)';
COMMENT ON COLUMN default_requests.request_type IS '요청 유형';
COMMENT ON COLUMN default_requests.priority IS '우선순위 (1: 최고, 10: 최저)';
COMMENT ON COLUMN default_requests.is_recurring IS '반복 요청 여부';
COMMENT ON COLUMN default_requests.recurrence_pattern IS '반복 패턴';
COMMENT ON COLUMN default_requests.auto_apply IS '스케줄 생성 시 자동 적용 여부';
COMMENT ON COLUMN default_requests.conflict_resolution IS '충돌 시 처리 방법';

-- STEP 13: Verify creation
-- =========================

SELECT 
    'SUCCESS: All objects created' as status,
    COUNT(*) as table_count
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('tenants', 'employees', 'default_requests')
HAVING COUNT(*) = 3

UNION ALL

SELECT 
    'WARNING: Some tables missing' as status,
    COUNT(*) as table_count
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('tenants', 'employees', 'default_requests')
HAVING COUNT(*) < 3;