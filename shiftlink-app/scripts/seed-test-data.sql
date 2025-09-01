-- ShiftLink 테스트 데이터 생성 스크립트
-- Supabase SQL Editor에서 실행하세요

-- 1. 테스트 테넌트(회사) 생성
INSERT INTO tenants (name, slug, settings)
VALUES 
  ('ShiftLink 테스트 회사', 'shiftlink-test', 
   '{"theme": "default", "features": {"swap_requests": true, "auto_schedule": true}}')
RETURNING id as tenant_id;

-- tenant_id를 변수로 저장 (실제 실행시 위에서 반환된 ID 사용)
DO $$
DECLARE
  v_tenant_id UUID;
  v_site_id UUID;
  v_team_id UUID;
  v_ruleset_id UUID;
  v_employee_ids UUID[];
BEGIN
  -- 테넌트 ID 가져오기
  SELECT id INTO v_tenant_id FROM tenants WHERE slug = 'shiftlink-test' LIMIT 1;
  
  -- 2. 사이트(사업장) 생성
  INSERT INTO sites (tenant_id, name, address, timezone)
  VALUES 
    (v_tenant_id, '서울 본사', '서울시 강남구 테헤란로 123', 'Asia/Seoul')
  RETURNING id INTO v_site_id;
  
  -- 3. 팀 생성
  INSERT INTO teams (site_id, name, description)
  VALUES 
    (v_site_id, '생산 1팀', '24시간 3교대 운영팀')
  RETURNING id INTO v_team_id;
  
  -- 4. 규칙셋 생성
  INSERT INTO rulesets (tenant_id, name, rules, is_default)
  VALUES 
    (v_tenant_id, '기본 3교대 규칙', 
     '{
       "min_rest_hours": {"enabled": true, "value": 11},
       "max_week_hours": {"enabled": true, "value": 52},
       "max_consec_nights": {"enabled": true, "value": 3},
       "fairness": {"enabled": true, "target_score": 0.7},
       "preferences": {"enabled": true},
       "public_holidays": {"enabled": true, "source": "KR"}
     }', true)
  RETURNING id INTO v_ruleset_id;
  
  -- 5. 교대 템플릿 생성
  INSERT INTO shift_templates (tenant_id, name, type, start_time, end_time, duration_hours, break_minutes, color)
  VALUES 
    (v_tenant_id, '주간 근무', 'day', '07:00', '15:00', 8, 60, '#3B82F6'),
    (v_tenant_id, '저녁 근무', 'evening', '15:00', '23:00', 8, 60, '#F59E0B'),
    (v_tenant_id, '야간 근무', 'night', '23:00', '07:00', 8, 60, '#8B5CF6');
  
  -- 6. 직원 생성 (30명)
  INSERT INTO employees (tenant_id, team_id, email, name, employee_code, role, phone, hire_date, is_active)
  VALUES 
    -- 관리자
    (v_tenant_id, v_team_id, 'admin@shiftlink.test', '김관리', 'EMP001', 'admin', '010-1234-5678', '2020-01-01', true),
    (v_tenant_id, v_team_id, 'manager@shiftlink.test', '이매니저', 'EMP002', 'manager', '010-2345-6789', '2020-03-01', true),
    
    -- 일반 직원 (28명)
    (v_tenant_id, v_team_id, 'emp03@shiftlink.test', '박직원', 'EMP003', 'employee', '010-3456-7890', '2021-01-01', true),
    (v_tenant_id, v_team_id, 'emp04@shiftlink.test', '최근무', 'EMP004', 'employee', '010-4567-8901', '2021-02-01', true),
    (v_tenant_id, v_team_id, 'emp05@shiftlink.test', '정교대', 'EMP005', 'employee', '010-5678-9012', '2021-03-01', true),
    (v_tenant_id, v_team_id, 'emp06@shiftlink.test', '강시프트', 'EMP006', 'employee', '010-6789-0123', '2021-04-01', true),
    (v_tenant_id, v_team_id, 'emp07@shiftlink.test', '조근무', 'EMP007', 'employee', '010-7890-1234', '2021-05-01', true),
    (v_tenant_id, v_team_id, 'emp08@shiftlink.test', '윤교대', 'EMP008', 'employee', '010-8901-2345', '2021-06-01', true),
    (v_tenant_id, v_team_id, 'emp09@shiftlink.test', '장근로', 'EMP009', 'employee', '010-9012-3456', '2021-07-01', true),
    (v_tenant_id, v_team_id, 'emp10@shiftlink.test', '임직원', 'EMP010', 'employee', '010-0123-4567', '2021-08-01', true),
    (v_tenant_id, v_team_id, 'emp11@shiftlink.test', '한교대', 'EMP011', 'employee', '010-1234-5679', '2021-09-01', true),
    (v_tenant_id, v_team_id, 'emp12@shiftlink.test', '오근무', 'EMP012', 'employee', '010-2345-6780', '2021-10-01', true),
    (v_tenant_id, v_team_id, 'emp13@shiftlink.test', '서시프트', 'EMP013', 'employee', '010-3456-7891', '2021-11-01', true),
    (v_tenant_id, v_team_id, 'emp14@shiftlink.test', '신교대', 'EMP014', 'employee', '010-4567-8902', '2021-12-01', true),
    (v_tenant_id, v_team_id, 'emp15@shiftlink.test', '유근무', 'EMP015', 'employee', '010-5678-9013', '2022-01-01', true),
    (v_tenant_id, v_team_id, 'emp16@shiftlink.test', '권직원', 'EMP016', 'employee', '010-6789-0124', '2022-02-01', true),
    (v_tenant_id, v_team_id, 'emp17@shiftlink.test', '황교대', 'EMP017', 'employee', '010-7890-1235', '2022-03-01', true),
    (v_tenant_id, v_team_id, 'emp18@shiftlink.test', '안근무', 'EMP018', 'employee', '010-8901-2346', '2022-04-01', true),
    (v_tenant_id, v_team_id, 'emp19@shiftlink.test', '송시프트', 'EMP019', 'employee', '010-9012-3457', '2022-05-01', true),
    (v_tenant_id, v_team_id, 'emp20@shiftlink.test', '전교대', 'EMP020', 'employee', '010-0123-4568', '2022-06-01', true),
    (v_tenant_id, v_team_id, 'emp21@shiftlink.test', '홍근무', 'EMP021', 'employee', '010-1234-5680', '2022-07-01', true),
    (v_tenant_id, v_team_id, 'emp22@shiftlink.test', '양직원', 'EMP022', 'employee', '010-2345-6781', '2022-08-01', true),
    (v_tenant_id, v_team_id, 'emp23@shiftlink.test', '손교대', 'EMP023', 'employee', '010-3456-7892', '2022-09-01', true),
    (v_tenant_id, v_team_id, 'emp24@shiftlink.test', '배근무', 'EMP024', 'employee', '010-4567-8903', '2022-10-01', true),
    (v_tenant_id, v_team_id, 'emp25@shiftlink.test', '백시프트', 'EMP025', 'employee', '010-5678-9014', '2022-11-01', true),
    (v_tenant_id, v_team_id, 'emp26@shiftlink.test', '변교대', 'EMP026', 'employee', '010-6789-0125', '2022-12-01', true),
    (v_tenant_id, v_team_id, 'emp27@shiftlink.test', '노근무', 'EMP027', 'employee', '010-7890-1236', '2023-01-01', true),
    (v_tenant_id, v_team_id, 'emp28@shiftlink.test', '심직원', 'EMP028', 'employee', '010-8901-2347', '2023-02-01', true),
    (v_tenant_id, v_team_id, 'emp29@shiftlink.test', '곽교대', 'EMP029', 'employee', '010-9012-3458', '2023-03-01', true),
    (v_tenant_id, v_team_id, 'emp30@shiftlink.test', '성근무', 'EMP030', 'employee', '010-0123-4569', '2023-04-01', true);
  
  -- 7. 조직 계층 구조 생성
  INSERT INTO organization_hierarchy (tenant_id, team_id, level, role_name, min_required, priority_on_conflict)
  VALUES 
    (v_tenant_id, v_team_id, 1, '팀장급', 1, 'higher'),
    (v_tenant_id, v_team_id, 2, '시니어', 2, 'balanced'),
    (v_tenant_id, v_team_id, 3, '주니어', 3, 'lower');
  
  -- 8. 샘플 스케줄 생성 (2025년 1월)
  INSERT INTO schedules (tenant_id, site_id, name, start_date, end_date, ruleset_id, is_published)
  VALUES 
    (v_tenant_id, v_site_id, '2025년 1월 근무표', '2025-01-01', '2025-01-31', v_ruleset_id, false);
  
  RAISE NOTICE '테스트 데이터가 성공적으로 생성되었습니다!';
  RAISE NOTICE '테넌트 ID: %', v_tenant_id;
  RAISE NOTICE '사이트 ID: %', v_site_id;
  RAISE NOTICE '팀 ID: %', v_team_id;
  
END $$;

-- 생성된 데이터 확인
SELECT 'Tenants' as table_name, COUNT(*) as count FROM tenants
UNION ALL
SELECT 'Sites', COUNT(*) FROM sites
UNION ALL
SELECT 'Teams', COUNT(*) FROM teams
UNION ALL
SELECT 'Employees', COUNT(*) FROM employees
UNION ALL
SELECT 'Shift Templates', COUNT(*) FROM shift_templates
UNION ALL
SELECT 'Rulesets', COUNT(*) FROM rulesets
UNION ALL
SELECT 'Schedules', COUNT(*) FROM schedules;