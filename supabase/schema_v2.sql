-- 버전 관리를 포함한 확장된 스키마
-- 기존 스키마에 추가되는 테이블들

-- 스케줄 버전 관리 테이블
CREATE TABLE schedule_versions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    schedule_id UUID REFERENCES schedules(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES employees(id),
    change_type VARCHAR(50), -- 'initial', 'swap', 'absence', 'leave', 'manual_edit', 'auto_regenerate'
    change_description TEXT,
    snapshot JSONB NOT NULL, -- 전체 스케줄 스냅샷
    affected_employees UUID[], -- 영향받은 직원들
    is_published BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMPTZ,
    UNIQUE(schedule_id, version_number)
);

-- 스케줄 변경 로그 (세부 변경사항 추적)
CREATE TABLE schedule_change_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    version_id UUID REFERENCES schedule_versions(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id),
    date DATE NOT NULL,
    old_shift VARCHAR(20),
    new_shift VARCHAR(20),
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 스케줄 공유 기록
CREATE TABLE schedule_shares (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    version_id UUID REFERENCES schedule_versions(id) ON DELETE CASCADE,
    shared_by UUID REFERENCES employees(id),
    share_method VARCHAR(20), -- 'email', 'kakao', 'calendar'
    recipients JSONB, -- [{employee_id, email/phone, status}]
    shared_at TIMESTAMPTZ DEFAULT NOW(),
    share_status VARCHAR(20) DEFAULT 'pending' -- 'pending', 'sent', 'failed'
);

-- 스케줄 생성 요청 (초안 생성을 위한 파라미터 저장)
CREATE TABLE schedule_generation_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id UUID REFERENCES teams(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    parameters JSONB NOT NULL, -- 모든 생성 옵션 저장
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    requested_by UUID REFERENCES employees(id),
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    result_schedule_id UUID REFERENCES schedules(id),
    error_message TEXT
);

-- 직원 선호 패턴 테이블 (구체화)
CREATE TABLE employee_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    preference_pattern JSONB, -- ["night", "day", "evening", "off"]
    pattern_start_date DATE, -- 패턴 시작 기준일
    priority INTEGER DEFAULT 50, -- 0-100, 높을수록 우선
    is_active BOOLEAN DEFAULT TRUE,
    effective_from DATE DEFAULT CURRENT_DATE,
    effective_to DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(employee_id, effective_from)
);

-- 조직 계층 구조 테이블
CREATE TABLE organization_hierarchy (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    level INTEGER NOT NULL, -- 1=팀장, 2=시니어, 3=주니어 등
    role_name VARCHAR(100) NOT NULL,
    min_required INTEGER DEFAULT 1, -- 각 시프트당 최소 필요 인원
    priority_on_conflict VARCHAR(20) DEFAULT 'balanced', -- 'higher', 'lower', 'balanced'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(team_id, level)
);

-- 직원-조직계층 매핑
CREATE TABLE employee_hierarchy (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    hierarchy_id UUID REFERENCES organization_hierarchy(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(employee_id)
);

-- 기본 요청사항 테이블
CREATE TABLE default_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    request_type VARCHAR(20) NOT NULL, -- 'fixed_shift', 'leave', 'constraint'
    day_of_week INTEGER, -- 0-6 (일-토)
    specific_date DATE,
    date_from DATE,
    date_to DATE,
    shift_type VARCHAR(20), -- 'day', 'evening', 'night', 'off'
    reason TEXT,
    priority INTEGER DEFAULT 50,
    is_recurring BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (
        (request_type = 'fixed_shift' AND day_of_week IS NOT NULL) OR
        (request_type = 'leave' AND specific_date IS NOT NULL) OR
        (request_type = 'constraint')
    )
);

-- 스케줄 평가 메트릭 (생성된 스케줄의 품질 평가)
CREATE TABLE schedule_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    schedule_id UUID REFERENCES schedules(id) ON DELETE CASCADE,
    version_id UUID REFERENCES schedule_versions(id),
    fairness_score DECIMAL(5,2), -- 공정성 점수 (0-100)
    compliance_score DECIMAL(5,2), -- 법규 준수 점수 (0-100)
    preference_match_score DECIMAL(5,2), -- 선호도 반영 점수 (0-100)
    hierarchy_coverage_score DECIMAL(5,2), -- 조직 계층 충족 점수 (0-100)
    total_conflicts INTEGER DEFAULT 0,
    total_warnings INTEGER DEFAULT 0,
    metrics_detail JSONB,
    calculated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 추가
CREATE INDEX idx_schedule_versions_schedule_id ON schedule_versions(schedule_id);
CREATE INDEX idx_schedule_versions_created_at ON schedule_versions(created_at);
CREATE INDEX idx_schedule_change_logs_version_id ON schedule_change_logs(version_id);
CREATE INDEX idx_schedule_shares_version_id ON schedule_shares(version_id);
CREATE INDEX idx_employee_preferences_employee_id ON employee_preferences(employee_id);
CREATE INDEX idx_default_requests_employee_id ON default_requests(employee_id);
CREATE INDEX idx_schedule_metrics_schedule_id ON schedule_metrics(schedule_id);

-- 트리거: 버전 번호 자동 증가
CREATE OR REPLACE FUNCTION increment_version_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.version_number := COALESCE(
        (SELECT MAX(version_number) FROM schedule_versions WHERE schedule_id = NEW.schedule_id),
        0
    ) + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_version_number
    BEFORE INSERT ON schedule_versions
    FOR EACH ROW
    EXECUTE FUNCTION increment_version_number();

-- 트리거: updated_at 자동 업데이트
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_employee_preferences_updated_at
    BEFORE UPDATE ON employee_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();