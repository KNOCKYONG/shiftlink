-- 확장된 직원 선호도 시스템
-- 개인의 실제 선호와 공정성 옵션을 명확히 구분

-- 기존 employee_preferences 테이블 확장
ALTER TABLE employee_preferences 
ADD COLUMN IF NOT EXISTS lifestyle_preference VARCHAR(20) DEFAULT 'flexible' 
  CHECK (lifestyle_preference IN ('night_owl', 'morning_person', 'flexible')),
ADD COLUMN IF NOT EXISTS fairness_option VARCHAR(30) DEFAULT 'auto'
  CHECK (fairness_option IN ('prefer_my_preference', 'prefer_team_balance', 'auto')),
ADD COLUMN IF NOT EXISTS accept_day BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS accept_evening BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS accept_night BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS special_needs TEXT,
ADD COLUMN IF NOT EXISTS weekend_night_ok BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS prefer_consecutive_nights BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS prefer_consecutive_days_off BOOLEAN DEFAULT true;

-- 공정성 추적 테이블 (혜택-기여 원장)
CREATE TABLE IF NOT EXISTS employee_fairness_ledger (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  
  -- 받은 혜택 (positive)
  preferred_shifts_received INTEGER DEFAULT 0,  -- 선호 시간대 받은 횟수
  fixed_shifts_received INTEGER DEFAULT 0,      -- 고정 근무 혜택
  time_off_requests_granted INTEGER DEFAULT 0,  -- 승인된 휴가
  avoided_undesirable_shifts INTEGER DEFAULT 0, -- 피한 비선호 시간
  mentorship_benefits INTEGER DEFAULT 0,        -- 멘토십 페어링 혜택
  
  -- 제공한 기여 (negative)
  undesirable_shifts_taken INTEGER DEFAULT 0,   -- 비선호 시간 수용
  weekend_nights_worked INTEGER DEFAULT 0,      -- 주말 야간 근무
  emergency_covers INTEGER DEFAULT 0,           -- 긴급 대체 근무
  holiday_shifts_worked INTEGER DEFAULT 0,      -- 공휴일 근무
  consecutive_nights_worked INTEGER DEFAULT 0,  -- 연속 야간 근무
  
  -- 계산된 밸런스
  balance_score DECIMAL(5,2) DEFAULT 0,         -- +는 혜택 초과, -는 기여 초과
  
  -- 메타 정보
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT unique_employee_month UNIQUE (employee_id, month)
);

-- 스케줄 배정 설명 테이블 (투명성)
CREATE TABLE IF NOT EXISTS schedule_assignment_explanations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  assignment_id UUID NOT NULL REFERENCES schedule_assignments(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  
  -- 점수 내역
  preference_score INTEGER,
  pattern_score INTEGER,
  mentorship_score INTEGER,
  safety_score INTEGER,
  fairness_score INTEGER,
  hierarchy_score INTEGER,
  total_score INTEGER,
  
  -- 설명
  primary_reason TEXT,           -- "선호하는 야간 근무 배정"
  fairness_explanation TEXT,     -- "지난달 기여도 높아 우선 배정"
  competition_note TEXT,          -- "5명 중 3위로 선발"
  special_considerations TEXT,    -- "멘토와 동일 시프트 필요"
  
  -- 상태
  was_preferred BOOLEAN,          -- 선호했던 시간대인가?
  competition_level VARCHAR(10),  -- 'high', 'medium', 'low'
  
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 시프트 경쟁 현황 테이블
CREATE TABLE IF NOT EXISTS shift_competition_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  shift_date DATE NOT NULL,
  shift_type VARCHAR(20) NOT NULL,
  
  required_count INTEGER NOT NULL,
  applicant_count INTEGER NOT NULL,
  
  -- JSON 형태로 저장
  applicants JSONB,              -- [{employee_id, score, selected, reason}]
  selection_criteria TEXT,
  
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT unique_shift_competition UNIQUE (tenant_id, shift_date, shift_type)
);

-- 인덱스 생성
CREATE INDEX idx_fairness_ledger_employee ON employee_fairness_ledger(employee_id);
CREATE INDEX idx_fairness_ledger_month ON employee_fairness_ledger(month);
CREATE INDEX idx_fairness_ledger_balance ON employee_fairness_ledger(balance_score);
CREATE INDEX idx_assignment_explanations_employee ON schedule_assignment_explanations(employee_id);
CREATE INDEX idx_competition_logs_date ON shift_competition_logs(shift_date);

-- RLS 정책
ALTER TABLE employee_fairness_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_assignment_explanations ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_competition_logs ENABLE ROW LEVEL SECURITY;

-- 직원은 자신의 공정성 원장만 조회 가능
CREATE POLICY "Employees can view own fairness ledger" ON employee_fairness_ledger
  FOR SELECT USING (employee_id = auth.uid());

-- 관리자는 모든 원장 조회 가능
CREATE POLICY "Managers can view all fairness ledgers" ON employee_fairness_ledger
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM employees 
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- 직원은 자신의 배정 설명만 조회 가능
CREATE POLICY "Employees can view own assignment explanations" ON schedule_assignment_explanations
  FOR SELECT USING (employee_id = auth.uid());

-- 팀 전체는 경쟁 현황 조회 가능 (투명성)
CREATE POLICY "Team can view competition logs" ON shift_competition_logs
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM employees WHERE id = auth.uid()
    )
  );

-- 함수: 공정성 밸런스 계산
CREATE OR REPLACE FUNCTION calculate_fairness_balance(
  p_employee_id UUID,
  p_month DATE
) RETURNS DECIMAL AS $$
DECLARE
  v_benefits INTEGER;
  v_contributions INTEGER;
  v_balance DECIMAL;
BEGIN
  SELECT 
    (preferred_shifts_received * 3 + 
     fixed_shifts_received * 5 + 
     time_off_requests_granted * 4 +
     avoided_undesirable_shifts * 2 +
     mentorship_benefits * 2),
    (undesirable_shifts_taken * 3 +
     weekend_nights_worked * 4 +
     emergency_covers * 5 +
     holiday_shifts_worked * 5 +
     consecutive_nights_worked * 2)
  INTO v_benefits, v_contributions
  FROM employee_fairness_ledger
  WHERE employee_id = p_employee_id AND month = p_month;
  
  v_balance := COALESCE(v_benefits, 0) - COALESCE(v_contributions, 0);
  
  RETURN v_balance;
END;
$$ LANGUAGE plpgsql;

-- 함수: 선호도 매칭률 계산
CREATE OR REPLACE FUNCTION calculate_preference_match_rate(
  p_employee_id UUID,
  p_start_date DATE,
  p_end_date DATE
) RETURNS INTEGER AS $$
DECLARE
  v_total_shifts INTEGER;
  v_preferred_shifts INTEGER;
  v_match_rate INTEGER;
BEGIN
  -- 전체 근무 수
  SELECT COUNT(*)
  INTO v_total_shifts
  FROM schedule_assignments sa
  JOIN shift_templates st ON sa.shift_template_id = st.id
  WHERE sa.employee_id = p_employee_id
    AND sa.date BETWEEN p_start_date AND p_end_date
    AND st.type != 'off';
  
  -- 선호 시간대 근무 수
  SELECT COUNT(*)
  INTO v_preferred_shifts
  FROM schedule_assignments sa
  JOIN shift_templates st ON sa.shift_template_id = st.id
  JOIN employee_preferences ep ON ep.employee_id = sa.employee_id
  WHERE sa.employee_id = p_employee_id
    AND sa.date BETWEEN p_start_date AND p_end_date
    AND st.type != 'off'
    AND (
      (ep.lifestyle_preference = 'night_owl' AND st.type = 'night') OR
      (ep.lifestyle_preference = 'morning_person' AND st.type = 'day') OR
      ep.lifestyle_preference = 'flexible'
    );
  
  IF v_total_shifts > 0 THEN
    v_match_rate := (v_preferred_shifts * 100) / v_total_shifts;
  ELSE
    v_match_rate := 0;
  END IF;
  
  RETURN v_match_rate;
END;
$$ LANGUAGE plpgsql;

-- 트리거: 공정성 밸런스 자동 업데이트
CREATE OR REPLACE FUNCTION update_fairness_balance()
RETURNS TRIGGER AS $$
BEGIN
  NEW.balance_score = calculate_fairness_balance(NEW.employee_id, NEW.month);
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_fairness_balance
  BEFORE INSERT OR UPDATE ON employee_fairness_ledger
  FOR EACH ROW EXECUTE FUNCTION update_fairness_balance();