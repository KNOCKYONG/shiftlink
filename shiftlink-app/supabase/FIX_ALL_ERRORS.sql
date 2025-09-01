-- ================================================
-- ShiftLink 데이터베이스 완전 수정 스크립트
-- 모든 테이블과 함수를 올바른 순서로 생성
-- ================================================

-- 1. 필요한 익스텐션 활성화
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. 커스텀 타입 생성
DO $$ 
BEGIN
    -- user_role enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('admin', 'manager', 'employee');
    END IF;
END $$;

-- 3. 기본 테이블 생성 (순서 중요!)

-- 3.1 tenants 테이블
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

-- 3.2 sites 테이블
CREATE TABLE IF NOT EXISTS sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.3 teams 테이블
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.4 employees 테이블
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    auth_user_id UUID,
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

-- 3.5 schedules 테이블
CREATE TABLE IF NOT EXISTS schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- 3.6 schedule_versions 테이블
CREATE TABLE IF NOT EXISTS schedule_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    changes JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES employees(id),
    UNIQUE(schedule_id, version_number)
);

-- ================================================
-- 4. default_requests 테이블 생성 (수정된 버전)
-- ================================================

-- 기존 객체 삭제
DROP TABLE IF EXISTS default_requests CASCADE;

CREATE TABLE default_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    request_type VARCHAR(30) NOT NULL CHECK (request_type IN (
        'fixed_shift', 'leave', 'constraint', 'preferred_off',
        'emergency_contact', 'training', 'medical'
    )),
    
    title VARCHAR(200) NOT NULL,
    description TEXT,
    
    day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
    specific_date DATE,
    start_date DATE,
    end_date DATE,
    
    shift_type VARCHAR(20) CHECK (shift_type IN ('day', 'evening', 'night', 'off')),
    
    is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
    recurrence_pattern VARCHAR(20) CHECK (recurrence_pattern IN (
        'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'
    )),
    
    priority INTEGER NOT NULL DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
    
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'approved', 'rejected', 'expired'
    )),
    approved_by UUID REFERENCES employees(id),
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    
    auto_apply BOOLEAN NOT NULL DEFAULT TRUE,
    apply_from_date DATE,
    apply_until_date DATE,
    
    conflict_resolution VARCHAR(20) DEFAULT 'manual' CHECK (conflict_resolution IN (
        'manual', 'override', 'skip', 'notify'
    )),
    
    additional_info JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES employees(id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_default_requests_employee ON default_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_default_requests_tenant ON default_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_default_requests_type ON default_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_default_requests_status ON default_requests(status);

-- ================================================
-- 5. schedule_shares 테이블 생성 (수정된 버전)
-- ================================================

-- 기존 객체 삭제
DROP TABLE IF EXISTS share_access_logs CASCADE;
DROP TABLE IF EXISTS schedule_shares CASCADE;

CREATE TABLE schedule_shares (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    share_token UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
    share_type VARCHAR(20) DEFAULT 'view' CHECK (share_type IN ('view', 'download', 'subscribe')),
    
    created_by UUID NOT NULL REFERENCES employees(id),
    allowed_viewers UUID[] DEFAULT NULL,
    require_password BOOLEAN DEFAULT false,
    password_hash TEXT DEFAULT NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
    is_active BOOLEAN DEFAULT true,
    deactivated_at TIMESTAMPTZ DEFAULT NULL,
    deactivated_by UUID REFERENCES employees(id),
    
    include_personal_info BOOLEAN DEFAULT false,
    allow_download BOOLEAN DEFAULT true,
    allow_calendar_sync BOOLEAN DEFAULT true,
    
    access_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMPTZ DEFAULT NULL,
    
    description TEXT DEFAULT NULL,
    custom_title TEXT DEFAULT NULL
);

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

-- schedule_versions에 컬럼 추가
ALTER TABLE schedule_versions ADD COLUMN IF NOT EXISTS shared_count INTEGER DEFAULT 0;
ALTER TABLE schedule_versions ADD COLUMN IF NOT EXISTS last_shared_at TIMESTAMPTZ DEFAULT NULL;

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_schedule_shares_token ON schedule_shares(share_token);
CREATE INDEX IF NOT EXISTS idx_schedule_shares_schedule ON schedule_shares(schedule_id);
CREATE INDEX IF NOT EXISTS idx_schedule_shares_tenant ON schedule_shares(tenant_id);

-- ================================================
-- 6. swap_settings 테이블 생성 (수정된 버전)
-- ================================================

-- 기존 테이블 삭제
DROP TABLE IF EXISTS swap_settings CASCADE;

CREATE TABLE swap_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    admin_approval_required BOOLEAN DEFAULT false,
    allow_cross_shift_type BOOLEAN DEFAULT true,
    allow_cross_team BOOLEAN DEFAULT false,
    max_advance_days INTEGER DEFAULT 30,
    
    auto_approve_same_level BOOLEAN DEFAULT true,
    auto_approve_same_team BOOLEAN DEFAULT true,
    auto_approve_within_hours INTEGER DEFAULT 24,
    
    max_pending_requests_per_employee INTEGER DEFAULT 5,
    cooldown_hours INTEGER DEFAULT 24,
    
    notify_managers BOOLEAN DEFAULT true,
    notify_team_members BOOLEAN DEFAULT false,
    send_email_notifications BOOLEAN DEFAULT true,
    send_kakao_notifications BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES employees(id),
    updated_by UUID REFERENCES employees(id),
    
    UNIQUE(tenant_id)
);

-- ================================================
-- 7. RLS 정책 활성화 (모든 테이블)
-- ================================================

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE default_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE swap_settings ENABLE ROW LEVEL SECURITY;

-- ================================================
-- 8. 함수 생성 (올바른 $$ 문법 사용)
-- ================================================

-- default_requests 관련 함수
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

-- schedule_shares 관련 함수
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
    WHERE EXISTS (
        SELECT 1
        FROM schedule_shares ss
        WHERE ss.schedule_id = sv.schedule_id
    );
END;
$$ LANGUAGE plpgsql;

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
    v_share RECORD;
BEGIN
    SELECT * INTO v_share
    FROM schedule_shares
    WHERE share_token = p_token;
    
    IF FOUND THEN
        RETURN QUERY
        SELECT 
            v_share.id,
            v_share.schedule_id,
            v_share.tenant_id,
            v_share.share_type::VARCHAR,
            v_share.require_password,
            v_share.include_personal_info,
            CASE 
                WHEN NOT v_share.is_active THEN false
                WHEN v_share.expires_at < NOW() THEN false
                ELSE true
            END,
            CASE 
                WHEN NOT v_share.is_active THEN 'Share has been deactivated'::TEXT
                WHEN v_share.expires_at < NOW() THEN 'Share has expired'::TEXT
                ELSE NULL::TEXT
            END;
    ELSE
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

-- swap_settings 관련 함수
CREATE OR REPLACE FUNCTION update_swap_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- 9. 트리거 생성
-- ================================================

-- default_requests 트리거
DROP TRIGGER IF EXISTS default_requests_updated_at ON default_requests;
CREATE TRIGGER default_requests_updated_at
    BEFORE UPDATE ON default_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_default_requests_updated_at();

DROP TRIGGER IF EXISTS auto_approve_simple_default_requests ON default_requests;
CREATE TRIGGER auto_approve_simple_default_requests
    BEFORE INSERT ON default_requests
    FOR EACH ROW
    EXECUTE FUNCTION auto_approve_simple_requests();

-- swap_settings 트리거
DROP TRIGGER IF EXISTS update_swap_settings_updated_at ON swap_settings;
CREATE TRIGGER update_swap_settings_updated_at
    BEFORE UPDATE ON swap_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_swap_settings_updated_at();

-- ================================================
-- 10. 뷰 생성
-- ================================================

CREATE OR REPLACE VIEW active_default_requests AS
SELECT * FROM default_requests 
WHERE status = 'approved' 
AND auto_apply = TRUE
AND (apply_from_date IS NULL OR apply_from_date <= CURRENT_DATE)
AND (apply_until_date IS NULL OR apply_until_date >= CURRENT_DATE);

-- ================================================
-- 11. 검증
-- ================================================

-- 생성된 테이블 확인
SELECT 
    table_name,
    CASE 
        WHEN table_name IN (
            'tenants', 'sites', 'teams', 'employees', 
            'schedules', 'schedule_versions',
            'default_requests', 'schedule_shares', 
            'share_access_logs', 'swap_settings'
        ) THEN '✓ Created'
        ELSE '✗ Missing'
    END as status
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
    'tenants', 'sites', 'teams', 'employees', 
    'schedules', 'schedule_versions',
    'default_requests', 'schedule_shares', 
    'share_access_logs', 'swap_settings'
)
ORDER BY table_name;

-- share_token 컬럼 확인
SELECT 
    'share_token column exists in schedule_shares' as check_result,
    EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'schedule_shares' 
        AND column_name = 'share_token'
    ) as exists;

-- 함수 생성 확인
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
    'update_default_requests_updated_at',
    'auto_approve_simple_requests',
    'expire_old_requests',
    'deactivate_expired_shares',
    'update_share_statistics',
    'validate_share_token',
    'update_swap_settings_updated_at'
)
ORDER BY routine_name;