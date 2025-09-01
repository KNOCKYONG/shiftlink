-- Complete Deployment Script for ShiftLink Database
-- Execute this script to set up all database objects in the correct order
-- 
-- IMPORTANT: This assumes you have already enabled necessary extensions:
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- First, check if base tables exist to avoid duplicates
DO $$ 
BEGIN
    -- Check if tenants table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenants') THEN
        RAISE NOTICE 'Base tables do not exist. Please run schema.sql first.';
        -- You should run schema.sql before this script
    ELSE
        RAISE NOTICE 'Base tables exist. Proceeding with additional tables...';
    END IF;
END $$;

-- Now create the default_requests table with corrected syntax
-- Only create if it doesn't already exist
CREATE TABLE IF NOT EXISTS default_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- 요청 유형
    request_type VARCHAR(30) NOT NULL CHECK (request_type IN (
        'fixed_shift',     -- 고정 근무 (매주 화요일 day 근무)
        'leave',          -- 휴가 (특정 날짜 또는 반복)
        'constraint',     -- 제약사항 (야간 근무 불가 등)
        'preferred_off',  -- 선호 휴무 (매주 일요일 쉬기 선호)
        'emergency_contact', -- 비상 연락처 (특정 날짜에 연락 가능)
        'training',       -- 교육/회의 (정기적 교육 일정)
        'medical'         -- 의료 관련 (정기 검진 등)
    )),
    
    -- 요청 제목 및 설명
    title VARCHAR(200) NOT NULL,
    description TEXT,
    
    -- 시간 관련 설정
    day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 6=Saturday
    specific_date DATE, -- 특정 날짜 지정
    start_date DATE,    -- 기간 시작 (반복 요청의 경우)
    end_date DATE,      -- 기간 종료
    
    -- 근무 시간대 (fixed_shift인 경우)
    shift_type VARCHAR(20) CHECK (shift_type IN ('day', 'evening', 'night', 'off')),
    
    -- 반복 설정
    is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
    recurrence_pattern VARCHAR(20) CHECK (recurrence_pattern IN (
        'weekly',    -- 매주 반복
        'biweekly',  -- 격주 반복
        'monthly',   -- 매월 반복
        'quarterly', -- 분기별 반복
        'yearly'     -- 연간 반복
    )),
    
    -- 우선순위 (1=최고, 10=최저)
    priority INTEGER NOT NULL DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
    
    -- 승인 관련
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending',   -- 대기중
        'approved',  -- 승인됨
        'rejected',  -- 거부됨
        'expired'    -- 만료됨
    )),
    approved_by UUID REFERENCES employees(id), -- 승인자
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    
    -- 자동 적용 설정
    auto_apply BOOLEAN NOT NULL DEFAULT TRUE, -- 스케줄 생성 시 자동 반영 여부
    apply_from_date DATE, -- 언제부터 적용할지
    apply_until_date DATE, -- 언제까지 적용할지
    
    -- 충돌 시 처리 방법
    conflict_resolution VARCHAR(20) DEFAULT 'manual' CHECK (conflict_resolution IN (
        'manual',     -- 수동 해결
        'override',   -- 기존 스케줄 덮어쓰기
        'skip',       -- 해당 날짜 건너뛰기
        'notify'      -- 알림만 전송
    )),
    
    -- 추가 메타데이터
    additional_info JSONB, -- 추가 정보 (연락처, 특이사항 등)
    
    -- 생성/수정 시간
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES employees(id) -- 요청한 직원 (본인 또는 관리자)
);

-- Create indexes only if they don't exist
CREATE INDEX IF NOT EXISTS idx_default_requests_employee ON default_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_default_requests_tenant ON default_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_default_requests_type ON default_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_default_requests_status ON default_requests(status);
CREATE INDEX IF NOT EXISTS idx_default_requests_recurring ON default_requests(is_recurring);
CREATE INDEX IF NOT EXISTS idx_default_requests_auto_apply ON default_requests(auto_apply);
CREATE INDEX IF NOT EXISTS idx_default_requests_date_range ON default_requests(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_default_requests_day_of_week ON default_requests(day_of_week);

-- Enable RLS
ALTER TABLE default_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "Users can view own default requests" ON default_requests;
CREATE POLICY "Users can view own default requests"
    ON default_requests
    FOR SELECT
    TO authenticated
    USING (
        employee_id IN (
            SELECT e.id 
            FROM employees e 
            WHERE e.auth_user_id = auth.uid()
        )
        OR
        tenant_id IN (
            SELECT e.tenant_id 
            FROM employees e 
            WHERE e.auth_user_id = auth.uid()
            AND e.role IN ('admin', 'manager')
        )
    );

DROP POLICY IF EXISTS "Users can insert own default requests" ON default_requests;
CREATE POLICY "Users can insert own default requests"
    ON default_requests
    FOR INSERT
    TO authenticated
    WITH CHECK (
        employee_id IN (
            SELECT e.id 
            FROM employees e 
            WHERE e.auth_user_id = auth.uid()
        )
        AND
        tenant_id IN (
            SELECT e.tenant_id 
            FROM employees e 
            WHERE e.auth_user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update own pending default requests" ON default_requests;
CREATE POLICY "Users can update own pending default requests"
    ON default_requests
    FOR UPDATE
    TO authenticated
    USING (
        employee_id IN (
            SELECT e.id 
            FROM employees e 
            WHERE e.auth_user_id = auth.uid()
        )
        AND status = 'pending'
    )
    WITH CHECK (
        employee_id IN (
            SELECT e.id 
            FROM employees e 
            WHERE e.auth_user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Managers can manage all default requests" ON default_requests;
CREATE POLICY "Managers can manage all default requests"
    ON default_requests
    FOR ALL
    TO authenticated
    USING (
        tenant_id IN (
            SELECT e.tenant_id 
            FROM employees e 
            WHERE e.auth_user_id = auth.uid()
            AND e.role IN ('admin', 'manager')
        )
    );

-- Create or replace functions with proper $$ syntax
CREATE OR REPLACE FUNCTION update_default_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS default_requests_updated_at ON default_requests;
CREATE TRIGGER default_requests_updated_at
    BEFORE UPDATE ON default_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_default_requests_updated_at();

-- Auto-approval function
CREATE OR REPLACE FUNCTION auto_approve_simple_requests()
RETURNS TRIGGER AS $$
BEGIN
    -- 단순한 휴무 선호 요청은 자동 승인
    IF NEW.request_type = 'preferred_off' AND NEW.priority >= 7 THEN
        NEW.status = 'approved';
        NEW.approved_at = NOW();
        NEW.approved_by = NEW.created_by;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_approve_simple_default_requests ON default_requests;
CREATE TRIGGER auto_approve_simple_default_requests
    BEFORE INSERT ON default_requests
    FOR EACH ROW
    EXECUTE FUNCTION auto_approve_simple_requests();

-- Expiration function
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

-- Validation function
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
    -- 반복 요청인 경우 day_of_week 필수
    IF p_is_recurring AND p_day_of_week IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- 반복 요청인 경우 recurrence_pattern 필수
    IF p_is_recurring AND p_recurrence_pattern IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- fixed_shift 타입인 경우 shift_type 필수
    IF p_request_type = 'fixed_shift' AND p_shift_type IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- 특정 날짜와 반복 요청은 동시에 사용 불가
    IF p_specific_date IS NOT NULL AND p_is_recurring THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Add constraints only if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_valid_request'
    ) THEN
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
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_date_range'
    ) THEN
        ALTER TABLE default_requests 
        ADD CONSTRAINT check_date_range 
        CHECK (
            (start_date IS NULL OR end_date IS NULL OR start_date <= end_date)
            AND 
            (apply_from_date IS NULL OR apply_until_date IS NULL OR apply_from_date <= apply_until_date)
        );
    END IF;
END $$;

-- Create view
CREATE OR REPLACE VIEW active_default_requests AS
SELECT * FROM default_requests 
WHERE status = 'approved' 
AND auto_apply = TRUE
AND (apply_from_date IS NULL OR apply_from_date <= CURRENT_DATE)
AND (apply_until_date IS NULL OR apply_until_date >= CURRENT_DATE);

-- Add comments
COMMENT ON TABLE default_requests IS '직원별 사전 요청사항 (고정 근무, 휴가, 제약사항 등)';
COMMENT ON COLUMN default_requests.request_type IS '요청 유형 (fixed_shift: 고정근무, leave: 휴가, constraint: 제약사항)';
COMMENT ON COLUMN default_requests.priority IS '우선순위 (1: 최고, 10: 최저)';
COMMENT ON COLUMN default_requests.is_recurring IS '반복 요청 여부';
COMMENT ON COLUMN default_requests.recurrence_pattern IS '반복 패턴 (weekly, monthly 등)';
COMMENT ON COLUMN default_requests.auto_apply IS '스케줄 생성 시 자동 적용 여부';
COMMENT ON COLUMN default_requests.conflict_resolution IS '충돌 시 처리 방법';
COMMENT ON VIEW active_default_requests IS '현재 활성화된 승인 요청사항들';

-- Verification
SELECT 'default_requests table created successfully' AS status
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'default_requests');