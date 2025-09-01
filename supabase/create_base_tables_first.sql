-- Create base tables first (if they don't exist)
-- This script ensures all dependencies are in place before creating default_requests

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create user_role enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'manager', 'employee');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 1: Create tenants table (if not exists)
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

-- Step 2: Create teams table (if not exists)
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Create employees table (if not exists)
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    auth_user_id UUID, -- Will reference auth.users(id) when auth schema is available
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

-- Step 4: Now create the default_requests table
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

-- Verify all tables were created
SELECT 
    table_name,
    CASE 
        WHEN table_name IN ('tenants', 'teams', 'employees', 'default_requests') 
        THEN '✓ Created'
        ELSE '✗ Missing'
    END as status
FROM (
    SELECT unnest(ARRAY['tenants', 'teams', 'employees', 'default_requests']) as table_name
) expected
LEFT JOIN information_schema.tables actual
    ON expected.table_name = actual.table_name
    AND actual.table_schema = 'public'
ORDER BY 
    CASE table_name
        WHEN 'tenants' THEN 1
        WHEN 'teams' THEN 2
        WHEN 'employees' THEN 3
        WHEN 'default_requests' THEN 4
    END;