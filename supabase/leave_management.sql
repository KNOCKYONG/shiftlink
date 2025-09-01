-- 휴가/결근 관리 시스템

-- 휴가 정책 테이블
CREATE TABLE IF NOT EXISTS leave_policies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- 정책 정보
  name VARCHAR(100) NOT NULL,
  leave_type VARCHAR(30) NOT NULL CHECK (leave_type IN (
    'annual', 'sick', 'personal', 'maternity', 'paternity', 
    'emergency', 'bereavement', 'other'
  )),
  
  -- 정책 설정
  annual_days INTEGER DEFAULT 15, -- 연차 일수
  max_consecutive_days INTEGER DEFAULT 10, -- 최대 연속 사용일
  advance_notice_days INTEGER DEFAULT 7, -- 사전 신청 일수
  carryover_days INTEGER DEFAULT 5, -- 이월 가능 일수
  
  -- 승인 설정
  auto_approve_days INTEGER DEFAULT 1, -- 자동 승인 일수 (1일 이하)
  requires_manager_approval BOOLEAN DEFAULT true,
  requires_hr_approval BOOLEAN DEFAULT false,
  
  -- 제한 설정
  blackout_dates DATE[] DEFAULT '{}', -- 사용 금지 날짜
  min_staff_required INTEGER DEFAULT 1, -- 최소 근무 인원
  
  -- 메타데이터
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES employees(id)
);

-- 직원별 휴가 잔여일수 테이블
CREATE TABLE IF NOT EXISTS employee_leave_balances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- 년도별 잔여일수
  year INTEGER NOT NULL,
  annual_total INTEGER DEFAULT 15,
  annual_used INTEGER DEFAULT 0,
  annual_remaining INTEGER DEFAULT 15,
  
  sick_total INTEGER DEFAULT 10,
  sick_used INTEGER DEFAULT 0,
  sick_remaining INTEGER DEFAULT 10,
  
  personal_total INTEGER DEFAULT 5,
  personal_used INTEGER DEFAULT 0,
  personal_remaining INTEGER DEFAULT 5,
  
  -- 이월 정보
  carryover_from_previous INTEGER DEFAULT 0,
  carryover_to_next INTEGER DEFAULT 0,
  
  -- 메타데이터
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 제약 조건
  UNIQUE(employee_id, year),
  CHECK (annual_used >= 0 AND annual_used <= annual_total + carryover_from_previous),
  CHECK (sick_used >= 0 AND sick_used <= sick_total),
  CHECK (personal_used >= 0 AND personal_used <= personal_total)
);

-- 휴가 신청 테이블 (leaves 테이블 확장)
ALTER TABLE leaves ADD COLUMN IF NOT EXISTS leave_policy_id UUID REFERENCES leave_policies(id);
ALTER TABLE leaves ADD COLUMN IF NOT EXISTS is_emergency BOOLEAN DEFAULT false;
ALTER TABLE leaves ADD COLUMN IF NOT EXISTS attachment_url TEXT;
ALTER TABLE leaves ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES employees(id);
ALTER TABLE leaves ADD COLUMN IF NOT EXISTS hr_approved_by UUID REFERENCES employees(id);
ALTER TABLE leaves ADD COLUMN IF NOT EXISTS hr_approved_at TIMESTAMPTZ;
ALTER TABLE leaves ADD COLUMN IF NOT EXISTS auto_approved BOOLEAN DEFAULT false;

-- 인덱스 생성
CREATE INDEX idx_leave_policies_tenant ON leave_policies(tenant_id);
CREATE INDEX idx_leave_policies_type ON leave_policies(leave_type);
CREATE INDEX idx_employee_leave_balances_employee ON employee_leave_balances(employee_id);
CREATE INDEX idx_employee_leave_balances_year ON employee_leave_balances(year);

-- RLS 정책 설정
ALTER TABLE leave_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_leave_balances ENABLE ROW LEVEL SECURITY;

-- 휴가 정책 조회: 같은 테넌트만
CREATE POLICY "Users can view their tenant's leave policies" ON leave_policies
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT e.tenant_id 
      FROM employees e 
      WHERE e.auth_user_id = auth.uid()
    )
  );

-- 휴가 정책 관리: 관리자/HR만
CREATE POLICY "Only admins can manage leave policies" ON leave_policies
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 
      FROM employees e 
      WHERE e.auth_user_id = auth.uid() 
        AND e.tenant_id = leave_policies.tenant_id 
        AND e.role IN ('admin', 'manager')
    )
  );

-- 휴가 잔여일수 조회: 본인 또는 관리자
CREATE POLICY "Users can view their own leave balance or admins can view all" ON employee_leave_balances
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
        AND e.tenant_id = employee_leave_balances.tenant_id 
        AND e.role IN ('admin', 'manager')
    )
  );

-- 휴가 잔여일수 수정: 시스템 또는 관리자만
CREATE POLICY "Only system or admins can modify leave balances" ON employee_leave_balances
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 
      FROM employees e 
      WHERE e.auth_user_id = auth.uid() 
        AND e.tenant_id = employee_leave_balances.tenant_id 
        AND e.role IN ('admin', 'manager')
    )
  );

-- 휴가 잔여일수 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_leave_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- 휴가 승인 시 잔여일수 차감
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    UPDATE employee_leave_balances 
    SET 
      annual_used = CASE 
        WHEN NEW.leave_type = 'annual' THEN annual_used + NEW.days_count
        ELSE annual_used
      END,
      sick_used = CASE 
        WHEN NEW.leave_type = 'sick' THEN sick_used + NEW.days_count  
        ELSE sick_used
      END,
      personal_used = CASE 
        WHEN NEW.leave_type = 'personal' THEN personal_used + NEW.days_count
        ELSE personal_used
      END,
      updated_at = NOW()
    WHERE employee_id = NEW.employee_id 
      AND year = EXTRACT(YEAR FROM NEW.start_date::DATE);
      
    -- 잔여일수 재계산
    UPDATE employee_leave_balances 
    SET 
      annual_remaining = annual_total + carryover_from_previous - annual_used,
      sick_remaining = sick_total - sick_used,
      personal_remaining = personal_total - personal_used
    WHERE employee_id = NEW.employee_id 
      AND year = EXTRACT(YEAR FROM NEW.start_date::DATE);
  END IF;
  
  -- 휴가 취소 시 잔여일수 복구
  IF NEW.status IN ('cancelled', 'rejected') AND OLD.status = 'approved' THEN
    UPDATE employee_leave_balances 
    SET 
      annual_used = CASE 
        WHEN OLD.leave_type = 'annual' THEN GREATEST(0, annual_used - OLD.days_count)
        ELSE annual_used
      END,
      sick_used = CASE 
        WHEN OLD.leave_type = 'sick' THEN GREATEST(0, sick_used - OLD.days_count)
        ELSE sick_used  
      END,
      personal_used = CASE 
        WHEN OLD.leave_type = 'personal' THEN GREATEST(0, personal_used - OLD.days_count)
        ELSE personal_used
      END,
      updated_at = NOW()
    WHERE employee_id = OLD.employee_id 
      AND year = EXTRACT(YEAR FROM OLD.start_date::DATE);
      
    -- 잔여일수 재계산
    UPDATE employee_leave_balances 
    SET 
      annual_remaining = annual_total + carryover_from_previous - annual_used,
      sick_remaining = sick_total - sick_used,
      personal_remaining = personal_total - personal_used
    WHERE employee_id = OLD.employee_id 
      AND year = EXTRACT(YEAR FROM OLD.start_date::DATE);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_leave_balance_trigger
  AFTER UPDATE ON leaves
  FOR EACH ROW
  EXECUTE FUNCTION update_leave_balance();

-- 휴가 자동 승인 함수
CREATE OR REPLACE FUNCTION auto_approve_leave()
RETURNS TRIGGER AS $$
DECLARE
  policy RECORD;
  current_employee RECORD;
BEGIN
  -- 휴가 정책 조회
  SELECT * INTO policy
  FROM leave_policies 
  WHERE tenant_id = (
    SELECT tenant_id FROM employees WHERE id = NEW.employee_id
  ) AND leave_type = NEW.leave_type
  LIMIT 1;
  
  -- 직원 정보 조회
  SELECT * INTO current_employee
  FROM employees
  WHERE id = NEW.employee_id;
  
  -- 자동 승인 조건 확인
  IF policy IS NOT NULL AND policy.auto_approve_days IS NOT NULL THEN
    IF NEW.days_count <= policy.auto_approve_days THEN
      NEW.status := 'approved';
      NEW.auto_approved := true;
      NEW.approved_at := NOW();
    END IF;
  END IF;
  
  -- 응급 휴가는 자동 승인
  IF NEW.is_emergency = true THEN
    NEW.status := 'approved';
    NEW.auto_approved := true;
    NEW.approved_at := NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_approve_leave_trigger
  BEFORE INSERT ON leaves
  FOR EACH ROW
  EXECUTE FUNCTION auto_approve_leave();

-- 연도별 휴가 잔여일수 초기화 함수
CREATE OR REPLACE FUNCTION initialize_yearly_leave_balance(
  p_employee_id UUID,
  p_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)
)
RETURNS VOID AS $$
DECLARE
  emp_record RECORD;
  policy RECORD;
  prev_balance RECORD;
BEGIN
  -- 직원 정보 조회
  SELECT * INTO emp_record
  FROM employees
  WHERE id = p_employee_id;
  
  -- 기본 휴가 정책 조회
  SELECT * INTO policy
  FROM leave_policies
  WHERE tenant_id = emp_record.tenant_id 
    AND leave_type = 'annual'
    AND is_active = true
  LIMIT 1;
  
  -- 전년도 잔여일수 조회 (이월용)
  SELECT * INTO prev_balance
  FROM employee_leave_balances
  WHERE employee_id = p_employee_id AND year = p_year - 1;
  
  -- 새 년도 잔여일수 생성
  INSERT INTO employee_leave_balances (
    employee_id,
    tenant_id,
    year,
    annual_total,
    annual_remaining,
    sick_total,
    sick_remaining,
    personal_total,
    personal_remaining,
    carryover_from_previous
  ) VALUES (
    p_employee_id,
    emp_record.tenant_id,
    p_year,
    COALESCE(policy.annual_days, 15),
    COALESCE(policy.annual_days, 15) + COALESCE(LEAST(prev_balance.annual_remaining, policy.carryover_days), 0),
    10, -- 기본 병가 일수
    10,
    5,  -- 기본 개인사유 일수
    5,
    COALESCE(LEAST(prev_balance.annual_remaining, policy.carryover_days), 0)
  )
  ON CONFLICT (employee_id, year) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- 휴가 사용 가능 여부 확인 함수
CREATE OR REPLACE FUNCTION can_take_leave(
  p_employee_id UUID,
  p_leave_type VARCHAR,
  p_start_date DATE,
  p_end_date DATE,
  p_days_count INTEGER
) RETURNS TABLE (
  can_take BOOLEAN,
  reason TEXT,
  remaining_days INTEGER
) AS $$
DECLARE
  balance_record RECORD;
  policy_record RECORD;
  year_val INTEGER;
  remaining INTEGER;
BEGIN
  year_val := EXTRACT(YEAR FROM p_start_date);
  
  -- 휴가 잔여일수 조회
  SELECT * INTO balance_record
  FROM employee_leave_balances
  WHERE employee_id = p_employee_id AND year = year_val;
  
  -- 휴가 정책 조회
  SELECT * INTO policy_record
  FROM leave_policies p
  JOIN employees e ON e.tenant_id = p.tenant_id
  WHERE e.id = p_employee_id AND p.leave_type = p_leave_type
  LIMIT 1;
  
  -- 잔여일수가 없으면 생성
  IF balance_record IS NULL THEN
    PERFORM initialize_yearly_leave_balance(p_employee_id, year_val);
    
    SELECT * INTO balance_record
    FROM employee_leave_balances
    WHERE employee_id = p_employee_id AND year = year_val;
  END IF;
  
  -- 잔여일수 확인
  CASE p_leave_type
    WHEN 'annual' THEN
      remaining := balance_record.annual_remaining;
    WHEN 'sick' THEN
      remaining := balance_record.sick_remaining;
    WHEN 'personal' THEN
      remaining := balance_record.personal_remaining;
    ELSE
      remaining := 999; -- 기타 휴가는 제한 없음
  END CASE;
  
  -- 잔여일수 충분한지 확인
  IF remaining < p_days_count THEN
    RETURN QUERY SELECT false, format('잔여 %s 일수가 부족합니다. (신청: %s일, 잔여: %s일)', p_leave_type, p_days_count, remaining), remaining;
    RETURN;
  END IF;
  
  -- 연속 사용일 제한 확인
  IF policy_record IS NOT NULL AND policy_record.max_consecutive_days IS NOT NULL THEN
    IF p_days_count > policy_record.max_consecutive_days THEN
      RETURN QUERY SELECT false, format('최대 연속 사용일(%s일)을 초과했습니다.', policy_record.max_consecutive_days), remaining;
      RETURN;
    END IF;
  END IF;
  
  -- 사전 신청 일수 확인
  IF policy_record IS NOT NULL AND policy_record.advance_notice_days IS NOT NULL THEN
    IF p_start_date - CURRENT_DATE < policy_record.advance_notice_days THEN
      RETURN QUERY SELECT false, format('%s일 전 사전 신청이 필요합니다.', policy_record.advance_notice_days), remaining;
      RETURN;
    END IF;
  END IF;
  
  -- 금지 날짜 확인
  IF policy_record IS NOT NULL AND policy_record.blackout_dates IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM unnest(policy_record.blackout_dates) AS blackout_date
      WHERE blackout_date BETWEEN p_start_date AND p_end_date
    ) THEN
      RETURN QUERY SELECT false, '해당 기간에는 휴가를 사용할 수 없습니다.', remaining;
      RETURN;
    END IF;
  END IF;
  
  -- 모든 조건 통과
  RETURN QUERY SELECT true, '휴가 사용 가능합니다.', remaining;
END;
$$ LANGUAGE plpgsql;

-- 스케줄 자동 재배치 함수 (휴가 승인 시)
CREATE OR REPLACE FUNCTION reschedule_for_leave()
RETURNS TRIGGER AS $$
DECLARE
  schedule_dates DATE[];
  current_date DATE;
  affected_assignments RECORD;
BEGIN
  -- 휴가 승인 시에만 실행
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    
    -- 휴가 기간의 모든 날짜 생성
    SELECT ARRAY(
      SELECT generate_series(NEW.start_date::DATE, NEW.end_date::DATE, '1 day'::INTERVAL)::DATE
    ) INTO schedule_dates;
    
    -- 각 날짜별로 스케줄 배정 삭제/수정
    FOREACH current_date IN ARRAY schedule_dates LOOP
      
      -- 해당 직원의 해당 날짜 배정을 휴무로 변경
      UPDATE schedule_assignments 
      SET 
        shift_type = 'off',
        notes = COALESCE(notes || ' / ', '') || '휴가',
        updated_at = NOW()
      WHERE employee_id = NEW.employee_id 
        AND date = current_date
        AND shift_type != 'off';
      
      -- TODO: 여기에 대체 인력 자동 배정 로직 추가 가능
      -- (현재는 단순히 휴무 처리만 함)
      
    END LOOP;
    
    -- 감사 로그 생성
    INSERT INTO audit_logs (
      tenant_id,
      user_id,
      action,
      resource_type,
      resource_id,
      details
    )
    SELECT 
      e.tenant_id,
      NEW.employee_id,
      'leave_schedule_updated',
      'leave',
      NEW.id,
      json_build_object(
        'leave_type', NEW.leave_type,
        'start_date', NEW.start_date,
        'end_date', NEW.end_date,
        'days_affected', array_length(schedule_dates, 1)
      )
    FROM employees e
    WHERE e.id = NEW.employee_id;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reschedule_for_leave_trigger
  AFTER UPDATE ON leaves
  FOR EACH ROW
  EXECUTE FUNCTION reschedule_for_leave();

-- 기본 휴가 정책 생성 함수
CREATE OR REPLACE FUNCTION create_default_leave_policies(p_tenant_id UUID)
RETURNS VOID AS $$
BEGIN
  -- 연차 정책
  INSERT INTO leave_policies (
    tenant_id, name, leave_type, annual_days, max_consecutive_days, 
    advance_notice_days, carryover_days, auto_approve_days, 
    requires_manager_approval, is_active
  ) VALUES (
    p_tenant_id, '연차휴가', 'annual', 15, 10, 7, 5, 1, true, true
  );
  
  -- 병가 정책  
  INSERT INTO leave_policies (
    tenant_id, name, leave_type, annual_days, max_consecutive_days,
    advance_notice_days, auto_approve_days, requires_manager_approval, is_active
  ) VALUES (
    p_tenant_id, '병가', 'sick', 10, 5, 0, 2, false, true
  );
  
  -- 개인사유 정책
  INSERT INTO leave_policies (
    tenant_id, name, leave_type, annual_days, max_consecutive_days,
    advance_notice_days, auto_approve_days, requires_manager_approval, is_active  
  ) VALUES (
    p_tenant_id, '개인사유', 'personal', 5, 3, 3, 1, true, true
  );
  
  -- 경조사 정책
  INSERT INTO leave_policies (
    tenant_id, name, leave_type, annual_days, max_consecutive_days,
    advance_notice_days, auto_approve_days, requires_manager_approval, is_active
  ) VALUES (
    p_tenant_id, '경조사', 'bereavement', 5, 5, 1, 3, false, true
  );
END;
$$ LANGUAGE plpgsql;