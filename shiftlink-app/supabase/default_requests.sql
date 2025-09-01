-- 기본 요청사항 테이블 (Default Requests)
-- 직원들이 미리 요청하는 고정 근무, 휴가, 제약사항들을 저장

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

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_default_requests_employee ON default_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_default_requests_tenant ON default_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_default_requests_type ON default_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_default_requests_status ON default_requests(status);
CREATE INDEX IF NOT EXISTS idx_default_requests_recurring ON default_requests(is_recurring);
CREATE INDEX IF NOT EXISTS idx_default_requests_auto_apply ON default_requests(auto_apply);
CREATE INDEX IF NOT EXISTS idx_default_requests_date_range ON default_requests(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_default_requests_day_of_week ON default_requests(day_of_week);

-- RLS (Row Level Security) 정책 설정
ALTER TABLE default_requests ENABLE ROW LEVEL SECURITY;

-- 직원은 자신의 요청사항만 조회 가능
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
        default_requests.tenant_id IN (
            SELECT e.tenant_id 
            FROM employees e 
            WHERE e.auth_user_id = auth.uid()
            AND e.role IN ('admin', 'manager')
        )
    );

-- 직원은 자신의 요청사항만 생성 가능
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
        default_requests.tenant_id IN (
            SELECT e.tenant_id 
            FROM employees e 
            WHERE e.auth_user_id = auth.uid()
        )
    );

-- 직원은 자신의 요청사항만 수정 가능 (승인된 건은 제외)
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

-- 관리자/매니저는 모든 요청사항 조회 및 승인/거부 가능
CREATE POLICY "Managers can manage all default requests"
    ON default_requests
    FOR ALL
    TO authenticated
    USING (
        default_requests.tenant_id IN (
            SELECT e.tenant_id 
            FROM employees e 
            WHERE e.auth_user_id = auth.uid()
            AND e.role IN ('admin', 'manager')
        )
    );

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_default_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER default_requests_updated_at
    BEFORE UPDATE ON default_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_default_requests_updated_at();

-- 자동 승인 트리거 (특정 조건에서)
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

CREATE TRIGGER auto_approve_simple_default_requests
    BEFORE INSERT ON default_requests
    FOR EACH ROW
    EXECUTE FUNCTION auto_approve_simple_requests();

-- 만료 처리 함수
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

-- 요청사항 검증 함수
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

-- 검증 제약조건 추가
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

-- 기간 검증 제약조건
ALTER TABLE default_requests 
ADD CONSTRAINT check_date_range 
CHECK (
    (start_date IS NULL OR end_date IS NULL OR start_date <= end_date)
    AND 
    (apply_from_date IS NULL OR apply_until_date IS NULL OR apply_from_date <= apply_until_date)
);

-- 샘플 데이터 (개발/테스트용)
-- INSERT INTO default_requests (employee_id, tenant_id, request_type, title, description, day_of_week, shift_type, is_recurring, recurrence_pattern, priority) VALUES
-- ('employee-uuid-1', 'tenant-uuid-1', 'fixed_shift', '매주 화요일 주간 근무', '대학원 수업으로 인한 고정 근무', 2, 'day', true, 'weekly', 9),
-- ('employee-uuid-2', 'tenant-uuid-1', 'preferred_off', '매주 일요일 휴무 선호', '가족과의 시간을 위해', 0, 'off', true, 'weekly', 7),
-- ('employee-uuid-3', 'tenant-uuid-1', 'leave', '2024-12-25 연말 휴가', '크리스마스 휴가', NULL, 'off', false, NULL, 10);

-- 뷰 생성: 승인된 활성 요청사항만
CREATE OR REPLACE VIEW active_default_requests AS
SELECT * FROM default_requests 
WHERE status = 'approved' 
AND auto_apply = TRUE
AND (apply_from_date IS NULL OR apply_from_date <= CURRENT_DATE)
AND (apply_until_date IS NULL OR apply_until_date >= CURRENT_DATE);

-- 테이블 설명
COMMENT ON TABLE default_requests IS '직원별 사전 요청사항 (고정 근무, 휴가, 제약사항 등)';
COMMENT ON COLUMN default_requests.request_type IS '요청 유형 (fixed_shift: 고정근무, leave: 휴가, constraint: 제약사항)';
COMMENT ON COLUMN default_requests.priority IS '우선순위 (1: 최고, 10: 최저)';
COMMENT ON COLUMN default_requests.is_recurring IS '반복 요청 여부';
COMMENT ON COLUMN default_requests.recurrence_pattern IS '반복 패턴 (weekly, monthly 등)';
COMMENT ON COLUMN default_requests.auto_apply IS '스케줄 생성 시 자동 적용 여부';
COMMENT ON COLUMN default_requests.conflict_resolution IS '충돌 시 처리 방법';
COMMENT ON VIEW active_default_requests IS '현재 활성화된 승인 요청사항들';