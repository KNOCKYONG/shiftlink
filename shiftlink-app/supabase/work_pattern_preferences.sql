-- 근무 패턴 선호도 테이블 (Work Pattern Preferences)
-- 직원별 근무 스타일과 선호도를 저장

CREATE TABLE IF NOT EXISTS work_pattern_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE UNIQUE,
    
    -- 기본 패턴 유형
    pattern_type VARCHAR(50) NOT NULL CHECK (pattern_type IN ('short_frequent', 'long_break', 'balanced', 'custom')),
    work_intensity VARCHAR(20) NOT NULL CHECK (work_intensity IN ('high', 'medium', 'low')),
    rest_preference VARCHAR(30) NOT NULL CHECK (rest_preference IN ('short_frequent', 'long_concentrated', 'flexible')),
    
    -- 근무 주기 설정
    preferred_consecutive_work_days INTEGER NOT NULL DEFAULT 3 CHECK (preferred_consecutive_work_days BETWEEN 1 AND 7),
    preferred_consecutive_rest_days INTEGER NOT NULL DEFAULT 2 CHECK (preferred_consecutive_rest_days BETWEEN 1 AND 5),
    max_consecutive_work_days INTEGER NOT NULL DEFAULT 4 CHECK (max_consecutive_work_days BETWEEN 1 AND 10),
    min_rest_between_cycles INTEGER NOT NULL DEFAULT 1 CHECK (min_rest_between_cycles BETWEEN 1 AND 3),
    
    -- 시간대별 선호도 (1-10 점수)
    shift_type_preferences JSONB NOT NULL DEFAULT '{
        "day": 7,
        "evening": 6,
        "night": 5
    }'::JSONB,
    
    -- 요일별 선호도 (1-10 점수)
    weekday_preferences JSONB NOT NULL DEFAULT '{
        "monday": 7,
        "tuesday": 7,
        "wednesday": 7,
        "thursday": 7,
        "friday": 7,
        "saturday": 6,
        "sunday": 6
    }'::JSONB,
    
    -- 특별 설정
    avoid_friday_night BOOLEAN NOT NULL DEFAULT FALSE,
    prefer_weekend_off BOOLEAN NOT NULL DEFAULT TRUE,
    flexible_schedule BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- 메타데이터
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_work_pattern_preferences_employee ON work_pattern_preferences(employee_id);
CREATE INDEX IF NOT EXISTS idx_work_pattern_preferences_pattern_type ON work_pattern_preferences(pattern_type);
CREATE INDEX IF NOT EXISTS idx_work_pattern_preferences_updated_at ON work_pattern_preferences(updated_at);

-- RLS (Row Level Security) 정책 설정
ALTER TABLE work_pattern_preferences ENABLE ROW LEVEL SECURITY;

-- 직원은 자신의 패턴만 조회 가능
CREATE POLICY "Users can view own work pattern preferences"
    ON work_pattern_preferences
    FOR SELECT
    TO authenticated
    USING (
        employee_id IN (
            SELECT e.id 
            FROM employees e 
            WHERE e.auth_user_id = auth.uid()
        )
    );

-- 직원은 자신의 패턴만 수정 가능
CREATE POLICY "Users can update own work pattern preferences"
    ON work_pattern_preferences
    FOR UPDATE
    TO authenticated
    USING (
        employee_id IN (
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

-- 직원은 자신의 패턴만 생성 가능
CREATE POLICY "Users can insert own work pattern preferences"
    ON work_pattern_preferences
    FOR INSERT
    TO authenticated
    WITH CHECK (
        employee_id IN (
            SELECT e.id 
            FROM employees e 
            WHERE e.auth_user_id = auth.uid()
        )
    );

-- 관리자와 매니저는 모든 패턴 조회 가능
CREATE POLICY "Managers can view all work pattern preferences"
    ON work_pattern_preferences
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 
            FROM employees e 
            WHERE e.auth_user_id = auth.uid() 
            AND e.role IN ('admin', 'manager')
        )
    );

-- 관리자와 매니저는 모든 패턴 수정 가능
CREATE POLICY "Managers can update all work pattern preferences"
    ON work_pattern_preferences
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 
            FROM employees e 
            WHERE e.auth_user_id = auth.uid() 
            AND e.role IN ('admin', 'manager')
        )
    );

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_work_pattern_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER work_pattern_preferences_updated_at
    BEFORE UPDATE ON work_pattern_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_work_pattern_preferences_updated_at();

-- JSON 스키마 검증 함수들
CREATE OR REPLACE FUNCTION validate_shift_type_preferences(preferences JSONB)
RETURNS BOOLEAN AS $$
BEGIN
    -- 필요한 키들이 모두 존재하는지 확인
    IF NOT (preferences ? 'day' AND preferences ? 'evening' AND preferences ? 'night') THEN
        RETURN FALSE;
    END IF;
    
    -- 모든 값이 1-10 범위인지 확인
    IF NOT (
        (preferences->>'day')::INTEGER BETWEEN 1 AND 10 AND
        (preferences->>'evening')::INTEGER BETWEEN 1 AND 10 AND
        (preferences->>'night')::INTEGER BETWEEN 1 AND 10
    ) THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION validate_weekday_preferences(preferences JSONB)
RETURNS BOOLEAN AS $$
BEGIN
    -- 필요한 키들이 모두 존재하는지 확인
    IF NOT (
        preferences ? 'monday' AND preferences ? 'tuesday' AND preferences ? 'wednesday' AND 
        preferences ? 'thursday' AND preferences ? 'friday' AND preferences ? 'saturday' AND 
        preferences ? 'sunday'
    ) THEN
        RETURN FALSE;
    END IF;
    
    -- 모든 값이 1-10 범위인지 확인
    IF NOT (
        (preferences->>'monday')::INTEGER BETWEEN 1 AND 10 AND
        (preferences->>'tuesday')::INTEGER BETWEEN 1 AND 10 AND
        (preferences->>'wednesday')::INTEGER BETWEEN 1 AND 10 AND
        (preferences->>'thursday')::INTEGER BETWEEN 1 AND 10 AND
        (preferences->>'friday')::INTEGER BETWEEN 1 AND 10 AND
        (preferences->>'saturday')::INTEGER BETWEEN 1 AND 10 AND
        (preferences->>'sunday')::INTEGER BETWEEN 1 AND 10
    ) THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- JSON 검증 제약 조건 추가
ALTER TABLE work_pattern_preferences 
ADD CONSTRAINT check_shift_type_preferences 
CHECK (validate_shift_type_preferences(shift_type_preferences));

ALTER TABLE work_pattern_preferences 
ADD CONSTRAINT check_weekday_preferences 
CHECK (validate_weekday_preferences(weekday_preferences));

-- 논리적 일관성 검증 제약 조건
ALTER TABLE work_pattern_preferences 
ADD CONSTRAINT check_work_rest_logic 
CHECK (max_consecutive_work_days >= preferred_consecutive_work_days);

-- 샘플 데이터 (개발/테스트용)
-- INSERT INTO work_pattern_preferences (employee_id, pattern_type, work_intensity, rest_preference) VALUES
-- ('employee-uuid-1', 'balanced', 'medium', 'flexible'),
-- ('employee-uuid-2', 'short_frequent', 'high', 'short_frequent'),
-- ('employee-uuid-3', 'long_break', 'low', 'long_concentrated');

-- 테이블 설명
COMMENT ON TABLE work_pattern_preferences IS '직원별 근무 패턴 선호도 설정';
COMMENT ON COLUMN work_pattern_preferences.pattern_type IS '기본 패턴 유형 (short_frequent: 짧은 주기, long_break: 긴 주기, balanced: 균형, custom: 커스텀)';
COMMENT ON COLUMN work_pattern_preferences.work_intensity IS '근무 강도 (high: 높음, medium: 중간, low: 낮음)';
COMMENT ON COLUMN work_pattern_preferences.rest_preference IS '휴식 선호도 (short_frequent: 짧고 자주, long_concentrated: 길고 집중, flexible: 유연)';
COMMENT ON COLUMN work_pattern_preferences.shift_type_preferences IS '시간대별 선호도 점수 (1-10)';
COMMENT ON COLUMN work_pattern_preferences.weekday_preferences IS '요일별 선호도 점수 (1-10)';
COMMENT ON COLUMN work_pattern_preferences.avoid_friday_night IS '금요일 야간 근무 기피 여부';
COMMENT ON COLUMN work_pattern_preferences.prefer_weekend_off IS '주말 휴무 선호 여부';
COMMENT ON COLUMN work_pattern_preferences.flexible_schedule IS '스케줄 유연성 허용 여부';