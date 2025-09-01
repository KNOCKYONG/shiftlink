-- 교환/트레이드 설정 테이블
CREATE TABLE IF NOT EXISTS swap_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- 기본 교환 설정
  admin_approval_required BOOLEAN DEFAULT false,
  allow_cross_shift_type BOOLEAN DEFAULT true,
  allow_cross_team BOOLEAN DEFAULT false,
  max_advance_days INTEGER DEFAULT 30,
  
  -- 자동 승인 조건
  auto_approve_same_level BOOLEAN DEFAULT true,
  auto_approve_same_team BOOLEAN DEFAULT true,
  auto_approve_within_hours INTEGER DEFAULT 24, -- 24시간 내 교환만 자동 승인
  
  -- 제한사항
  max_pending_requests_per_employee INTEGER DEFAULT 5,
  cooldown_hours INTEGER DEFAULT 24, -- 거부된 후 재요청까지 대기시간
  
  -- 알림 설정
  notify_managers BOOLEAN DEFAULT true,
  notify_team_members BOOLEAN DEFAULT false,
  send_email_notifications BOOLEAN DEFAULT true,
  send_kakao_notifications BOOLEAN DEFAULT false,
  
  -- 메타데이터
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES employees(id),
  updated_by UUID REFERENCES employees(id),
  
  -- 제약 조건
  UNIQUE(tenant_id),
  CHECK (max_advance_days > 0 AND max_advance_days <= 90),
  CHECK (max_pending_requests_per_employee > 0 AND max_pending_requests_per_employee <= 20),
  CHECK (cooldown_hours >= 0 AND cooldown_hours <= 168), -- 최대 1주일
  CHECK (auto_approve_within_hours > 0 AND auto_approve_within_hours <= 720) -- 최대 30일
);

-- 트리거: updated_at 자동 업데이트
CREATE OR REPLACE FUNCTION update_swap_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_swap_settings_updated_at
  BEFORE UPDATE ON swap_settings
  FOR EACH ROW
  EXECUTE PROCEDURE update_swap_settings_updated_at();

-- RLS 정책
ALTER TABLE swap_settings ENABLE ROW LEVEL SECURITY;

-- 조회: 같은 테넌트의 직원들만
CREATE POLICY "Users can view their tenant's swap settings" ON swap_settings
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT e.tenant_id 
      FROM employees e 
      WHERE e.auth_user_id = auth.uid()
    )
  );

-- 수정: 관리자/매니저만
CREATE POLICY "Only admins and managers can modify swap settings" ON swap_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 
      FROM employees e 
      WHERE e.auth_user_id = auth.uid() 
        AND e.tenant_id = swap_settings.tenant_id 
        AND e.role IN ('admin', 'manager')
    )
  );

-- 기본 설정 생성 함수
CREATE OR REPLACE FUNCTION create_default_swap_settings(p_tenant_id UUID)
RETURNS UUID AS $$
DECLARE
  setting_id UUID;
  admin_employee_id UUID;
BEGIN
  -- 테넌트의 관리자 찾기
  SELECT id INTO admin_employee_id
  FROM employees
  WHERE tenant_id = p_tenant_id AND role = 'admin'
  LIMIT 1;
  
  -- 기본 설정 생성
  INSERT INTO swap_settings (
    tenant_id,
    admin_approval_required,
    allow_cross_shift_type,
    allow_cross_team,
    max_advance_days,
    auto_approve_same_level,
    auto_approve_same_team,
    auto_approve_within_hours,
    max_pending_requests_per_employee,
    cooldown_hours,
    notify_managers,
    notify_team_members,
    send_email_notifications,
    created_by
  ) VALUES (
    p_tenant_id,
    false, -- 기본적으로 관리자 승인 불필요
    true,  -- 다른 시프트 타입과 교환 허용
    false, -- 다른 팀과 교환 기본적으로 불허용
    30,    -- 30일 전까지 교환 가능
    true,  -- 같은 레벨끼리 자동 승인
    true,  -- 같은 팀끼리 자동 승인
    24,    -- 24시간 내 교환만 자동 승인
    5,     -- 직원당 최대 5개 대기 요청
    24,    -- 거부 후 24시간 대기
    true,  -- 매니저에게 알림
    false, -- 팀원들에게 알림 안함
    true,  -- 이메일 알림
    admin_employee_id
  ) RETURNING id INTO setting_id;
  
  RETURN setting_id;
END;
$$ LANGUAGE plpgsql;

-- 교환 요청 자동 승인 판단 함수
CREATE OR REPLACE FUNCTION should_auto_approve_swap(
  p_requester_id UUID,
  p_target_id UUID,
  p_original_date DATE,
  p_target_date DATE
) RETURNS BOOLEAN AS $$
DECLARE
  settings RECORD;
  requester RECORD;
  target RECORD;
  hours_diff INTEGER;
BEGIN
  -- 요청자와 대상자 정보 조회
  SELECT e1.*, e2.* INTO requester, target
  FROM employees e1, employees e2
  WHERE e1.id = p_requester_id AND e2.id = p_target_id;
  
  -- 설정 조회
  SELECT * INTO settings
  FROM swap_settings
  WHERE tenant_id = requester.tenant_id;
  
  -- 설정이 없거나 관리자 승인이 필수면 false
  IF settings IS NULL OR settings.admin_approval_required THEN
    RETURN false;
  END IF;
  
  -- 날짜 차이 계산 (시간 단위)
  hours_diff := ABS(EXTRACT(EPOCH FROM (p_target_date - p_original_date)) / 3600);
  
  -- 자동 승인 조건 확인
  IF settings.auto_approve_within_hours IS NOT NULL 
     AND hours_diff > settings.auto_approve_within_hours THEN
    RETURN false;
  END IF;
  
  -- 같은 레벨 확인
  IF settings.auto_approve_same_level 
     AND requester.level = target.level THEN
    RETURN true;
  END IF;
  
  -- 같은 팀 확인
  IF settings.auto_approve_same_team 
     AND requester.team_id = target.team_id THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql;

-- 인덱스 생성
CREATE INDEX idx_swap_settings_tenant ON swap_settings(tenant_id);

-- 샘플 데이터 (개발용)
-- INSERT INTO swap_settings (tenant_id, admin_approval_required, created_by)
-- SELECT t.id, false, e.id
-- FROM tenants t
-- JOIN employees e ON e.tenant_id = t.id AND e.role = 'admin'
-- WHERE NOT EXISTS (SELECT 1 FROM swap_settings s WHERE s.tenant_id = t.id)
-- LIMIT 1;