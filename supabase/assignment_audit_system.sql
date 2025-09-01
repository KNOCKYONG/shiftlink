-- 배정 근거 저장 및 추적 시스템

-- 배정 근거 감사 추적 테이블
CREATE TABLE IF NOT EXISTS assignment_audit_trail (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    schedule_id UUID REFERENCES schedules(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    shift_type VARCHAR(20) NOT NULL,
    
    -- 배정 결정 근거
    assignment_reasons JSONB NOT NULL, -- 점수와 근거 저장
    confidence_score DECIMAL(3,2) DEFAULT 0.0, -- 0.0-1.0
    
    -- 대안 선택지
    alternative_options JSONB, -- 고려되었던 다른 옵션들
    
    -- 점수 세부사항
    scoring_breakdown JSONB NOT NULL, -- 각 요소별 점수
    
    -- 제약사항 및 규칙 적용
    constraints_applied JSONB, -- 적용된 제약사항들
    rules_checked JSONB, -- 검증된 규칙들
    
    -- 패턴 분석 결과
    pattern_analysis JSONB, -- 위험 패턴 분석 결과
    safety_score DECIMAL(3,2), -- 안전도 점수
    
    -- 공정성 정보
    fairness_context JSONB, -- 공정성 고려사항
    team_balance_impact JSONB, -- 팀 밸런스 영향
    
    -- 메타데이터
    decision_timestamp TIMESTAMPTZ DEFAULT NOW(),
    engine_version VARCHAR(50), -- 스케줄링 엔진 버전
    created_by UUID REFERENCES employees(id),
    
    -- 인덱스
    UNIQUE(schedule_id, employee_id, date)
);

-- 스케줄 리포팅 로그 테이블
CREATE TABLE IF NOT EXISTS schedule_reporting_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    schedule_id UUID REFERENCES schedules(id) ON DELETE CASCADE,
    generation_date TIMESTAMPTZ NOT NULL,
    
    -- 처리 통계
    total_employees INTEGER NOT NULL,
    reports_generated JSONB NOT NULL, -- {individual_reports: 0, team_reports: 0, safety_reports: 0}
    notifications_sent JSONB NOT NULL, -- {emails_sent: 0, app_notifications_sent: 0, failed_notifications: 0}
    
    -- 공정성 알림
    fairness_alerts JSONB, -- {critical_issues: 0, high_priority_issues: 0, affected_employees: []}
    
    -- 성능 메트릭
    processing_time_ms INTEGER,
    status VARCHAR(20) DEFAULT 'completed', -- 'completed', 'partial', 'failed'
    error_details JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 개인별 스케줄 설명 저장 테이블
CREATE TABLE IF NOT EXISTS individual_schedule_explanations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    schedule_id UUID REFERENCES schedules(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    
    -- 설명 내용
    explanation_data JSONB NOT NULL, -- ScheduleExplanation 전체 데이터
    
    -- 요약 정보 (빠른 조회용)
    main_message TEXT,
    fairness_score INTEGER,
    safety_score INTEGER,
    total_assignments INTEGER,
    night_shift_count INTEGER,
    weekend_shift_count INTEGER,
    
    -- 상태 관리
    is_sent BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMPTZ,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    
    -- 피드백
    employee_feedback TEXT,
    feedback_date TIMESTAMPTZ,
    trade_requests_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(schedule_id, employee_id)
);

-- 팀 공정성 분석 결과 저장 테이블
CREATE TABLE IF NOT EXISTS team_fairness_analyses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    schedule_id UUID REFERENCES schedules(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- 분석 기간
    analysis_period VARCHAR(7), -- "YYYY-MM"
    
    -- 분석 결과
    analysis_data JSONB NOT NULL, -- TeamFairnessAnalysis 전체 데이터
    
    -- 요약 지표 (빠른 조회용)
    fairness_score INTEGER,
    fairness_grade VARCHAR(20),
    total_employees INTEGER,
    critical_issues INTEGER,
    high_priority_issues INTEGER,
    
    -- 불평등 지표
    night_shift_gini DECIMAL(4,3), -- 지니 계수
    weekend_shift_gini DECIMAL(4,3),
    work_hours_gini DECIMAL(4,3),
    
    -- 개선 우선순위
    improvement_priorities JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(schedule_id, team_id)
);

-- 배정 근거 조회 뷰 (성능 최적화)
CREATE VIEW assignment_explanation_view AS
SELECT 
    aat.schedule_id,
    aat.employee_id,
    e.name as employee_name,
    aat.date,
    aat.shift_type,
    aat.assignment_reasons,
    aat.confidence_score,
    aat.scoring_breakdown,
    aat.pattern_analysis,
    aat.safety_score,
    aat.fairness_context,
    s.name as schedule_name,
    s.start_date as schedule_start_date,
    s.end_date as schedule_end_date,
    aat.decision_timestamp
FROM assignment_audit_trail aat
JOIN employees e ON aat.employee_id = e.id
JOIN schedules s ON aat.schedule_id = s.id;

-- RLS 정책 설정
ALTER TABLE assignment_audit_trail ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_reporting_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE individual_schedule_explanations ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_fairness_analyses ENABLE ROW LEVEL SECURITY;

-- 조직 멤버는 자신의 배정 근거 조회 가능
CREATE POLICY "Employees can view their assignment reasons" ON assignment_audit_trail
    FOR SELECT USING (
        employee_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM employees 
            WHERE id = auth.uid() 
            AND tenant_id IN (
                SELECT tenant_id FROM employees WHERE id = assignment_audit_trail.employee_id
            )
            AND role IN ('admin', 'manager')
        )
    );

-- 관리자는 팀 전체 배정 근거 조회/수정 가능
CREATE POLICY "Managers can manage assignment reasons" ON assignment_audit_trail
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE id = auth.uid() 
            AND tenant_id IN (
                SELECT tenant_id FROM employees WHERE id = assignment_audit_trail.employee_id
            )
            AND role IN ('admin', 'manager')
        )
    );

-- 직원은 자신의 스케줄 설명 조회 가능
CREATE POLICY "Employees can view their schedule explanations" ON individual_schedule_explanations
    FOR SELECT USING (employee_id = auth.uid());

-- 직원은 자신의 피드백 작성 가능
CREATE POLICY "Employees can update their feedback" ON individual_schedule_explanations
    FOR UPDATE USING (employee_id = auth.uid());

-- 관리자는 팀 공정성 분석 결과 조회 가능
CREATE POLICY "Managers can view team fairness analyses" ON team_fairness_analyses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE id = auth.uid() 
            AND tenant_id = team_fairness_analyses.tenant_id
            AND role IN ('admin', 'manager')
        )
    );

-- 인덱스 생성 (성능 최적화)
CREATE INDEX idx_assignment_audit_schedule_employee ON assignment_audit_trail(schedule_id, employee_id);
CREATE INDEX idx_assignment_audit_date ON assignment_audit_trail(date);
CREATE INDEX idx_assignment_audit_employee ON assignment_audit_trail(employee_id);
CREATE INDEX idx_assignment_audit_shift_type ON assignment_audit_trail(shift_type);
CREATE INDEX idx_assignment_audit_timestamp ON assignment_audit_trail(decision_timestamp);

CREATE INDEX idx_reporting_logs_schedule ON schedule_reporting_logs(schedule_id);
CREATE INDEX idx_reporting_logs_date ON schedule_reporting_logs(generation_date);
CREATE INDEX idx_reporting_logs_status ON schedule_reporting_logs(status);

CREATE INDEX idx_explanations_schedule_employee ON individual_schedule_explanations(schedule_id, employee_id);
CREATE INDEX idx_explanations_employee ON individual_schedule_explanations(employee_id);
CREATE INDEX idx_explanations_sent ON individual_schedule_explanations(is_sent);
CREATE INDEX idx_explanations_read ON individual_schedule_explanations(is_read);

CREATE INDEX idx_fairness_analyses_schedule ON team_fairness_analyses(schedule_id);
CREATE INDEX idx_fairness_analyses_team ON team_fairness_analyses(team_id);
CREATE INDEX idx_fairness_analyses_period ON team_fairness_analyses(analysis_period);
CREATE INDEX idx_fairness_analyses_grade ON team_fairness_analyses(fairness_grade);

-- 트리거 함수: 업데이트 시간 자동 갱신
CREATE OR REPLACE FUNCTION update_explanation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_explanation_timestamp
    BEFORE UPDATE ON individual_schedule_explanations
    FOR EACH ROW
    EXECUTE FUNCTION update_explanation_timestamp();

-- 유틸리티 함수들

-- 직원별 배정 근거 조회 함수
CREATE OR REPLACE FUNCTION get_employee_assignment_reasons(
    p_employee_id UUID,
    p_schedule_id UUID DEFAULT NULL,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
    schedule_name TEXT,
    date DATE,
    shift_type VARCHAR(20),
    assignment_reasons JSONB,
    confidence_score DECIMAL(3,2),
    safety_score DECIMAL(3,2),
    decision_timestamp TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.name::TEXT,
        aat.date,
        aat.shift_type,
        aat.assignment_reasons,
        aat.confidence_score,
        aat.safety_score,
        aat.decision_timestamp
    FROM assignment_audit_trail aat
    JOIN schedules s ON aat.schedule_id = s.id
    WHERE aat.employee_id = p_employee_id
        AND (p_schedule_id IS NULL OR aat.schedule_id = p_schedule_id)
        AND (p_start_date IS NULL OR aat.date >= p_start_date)
        AND (p_end_date IS NULL OR aat.date <= p_end_date)
    ORDER BY aat.date DESC, aat.decision_timestamp DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 팀 공정성 히스토리 조회 함수
CREATE OR REPLACE FUNCTION get_team_fairness_history(
    p_team_id UUID,
    p_months INTEGER DEFAULT 6
)
RETURNS TABLE (
    analysis_period VARCHAR(7),
    fairness_score INTEGER,
    fairness_grade VARCHAR(20),
    critical_issues INTEGER,
    night_shift_gini DECIMAL(4,3),
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tfa.analysis_period,
        tfa.fairness_score,
        tfa.fairness_grade,
        tfa.critical_issues,
        tfa.night_shift_gini,
        tfa.created_at
    FROM team_fairness_analyses tfa
    WHERE tfa.team_id = p_team_id
        AND tfa.created_at >= NOW() - INTERVAL '1 month' * p_months
    ORDER BY tfa.analysis_period DESC, tfa.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;