-- 통합 스크립트: admin 계정에 수간호사와 동일한 스케줄 설정
-- 2025년 9월 2일(월) ~ 9월 8일(일)

-- 1. 필요한 데이터 준비 및 스케줄 추가
DO $$
DECLARE
  v_admin_id INTEGER;
  v_manager_id INTEGER;
  v_schedule_id INTEGER;
  v_tenant_id INTEGER;
  v_day_shift_id INTEGER;
  v_evening_shift_id INTEGER;
  v_night_shift_id INTEGER;
  v_off_shift_id INTEGER;
BEGIN
  -- admin 정보 가져오기
  SELECT e.id, e.tenant_id INTO v_admin_id, v_tenant_id
  FROM employees e
  JOIN auth.users au ON e.auth_user_id = au.id
  WHERE au.email = 'admin@shiftlink.com';
  
  -- manager(수간호사) 정보 가져오기 (참고용)
  SELECT e.id INTO v_manager_id
  FROM employees e
  WHERE e.role = 'manager' 
  AND e.tenant_id = v_tenant_id
  LIMIT 1;
  
  -- 스케줄 ID 가져오기
  SELECT id INTO v_schedule_id
  FROM schedules
  WHERE tenant_id = v_tenant_id
  AND month = '2025-09';
  
  -- shift template IDs 가져오기
  SELECT id INTO v_day_shift_id FROM shift_templates 
  WHERE tenant_id = v_tenant_id AND type = 'day' LIMIT 1;
  
  SELECT id INTO v_evening_shift_id FROM shift_templates 
  WHERE tenant_id = v_tenant_id AND type = 'evening' LIMIT 1;
  
  SELECT id INTO v_night_shift_id FROM shift_templates 
  WHERE tenant_id = v_tenant_id AND type = 'night' LIMIT 1;
  
  SELECT id INTO v_off_shift_id FROM shift_templates 
  WHERE tenant_id = v_tenant_id AND type = 'off' LIMIT 1;
  
  RAISE NOTICE 'Admin ID: %, Schedule ID: %, Tenant ID: %', v_admin_id, v_schedule_id, v_tenant_id;
  
  -- 수간호사와 동일한 패턴으로 스케줄 추가
  -- 월요일 (9/2) - 주간
  INSERT INTO schedule_assignments (schedule_id, employee_id, date, shift_template_id, is_published, created_at, updated_at)
  VALUES (v_schedule_id, v_admin_id, '2025-09-02', v_day_shift_id, true, NOW(), NOW())
  ON CONFLICT (schedule_id, employee_id, date) 
  DO UPDATE SET shift_template_id = v_day_shift_id, updated_at = NOW();
  
  -- 화요일 (9/3) - 저녁
  INSERT INTO schedule_assignments (schedule_id, employee_id, date, shift_template_id, is_published, created_at, updated_at)
  VALUES (v_schedule_id, v_admin_id, '2025-09-03', v_evening_shift_id, true, NOW(), NOW())
  ON CONFLICT (schedule_id, employee_id, date) 
  DO UPDATE SET shift_template_id = v_evening_shift_id, updated_at = NOW();
  
  -- 수요일 (9/4) - 야간
  INSERT INTO schedule_assignments (schedule_id, employee_id, date, shift_template_id, is_published, created_at, updated_at)
  VALUES (v_schedule_id, v_admin_id, '2025-09-04', v_night_shift_id, true, NOW(), NOW())
  ON CONFLICT (schedule_id, employee_id, date) 
  DO UPDATE SET shift_template_id = v_night_shift_id, updated_at = NOW();
  
  -- 목요일 (9/5) - 주간
  INSERT INTO schedule_assignments (schedule_id, employee_id, date, shift_template_id, is_published, created_at, updated_at)
  VALUES (v_schedule_id, v_admin_id, '2025-09-05', v_day_shift_id, true, NOW(), NOW())
  ON CONFLICT (schedule_id, employee_id, date) 
  DO UPDATE SET shift_template_id = v_day_shift_id, updated_at = NOW();
  
  -- 금요일 (9/6) - 저녁
  INSERT INTO schedule_assignments (schedule_id, employee_id, date, shift_template_id, is_published, created_at, updated_at)
  VALUES (v_schedule_id, v_admin_id, '2025-09-06', v_evening_shift_id, true, NOW(), NOW())
  ON CONFLICT (schedule_id, employee_id, date) 
  DO UPDATE SET shift_template_id = v_evening_shift_id, updated_at = NOW();
  
  -- 토요일 (9/7) - 오프
  INSERT INTO schedule_assignments (schedule_id, employee_id, date, shift_template_id, is_published, created_at, updated_at)
  VALUES (v_schedule_id, v_admin_id, '2025-09-07', v_off_shift_id, true, NOW(), NOW())
  ON CONFLICT (schedule_id, employee_id, date) 
  DO UPDATE SET shift_template_id = v_off_shift_id, updated_at = NOW();
  
  -- 일요일 (9/8) - 오프
  INSERT INTO schedule_assignments (schedule_id, employee_id, date, shift_template_id, is_published, created_at, updated_at)
  VALUES (v_schedule_id, v_admin_id, '2025-09-08', v_off_shift_id, true, NOW(), NOW())
  ON CONFLICT (schedule_id, employee_id, date) 
  DO UPDATE SET shift_template_id = v_off_shift_id, updated_at = NOW();
  
  -- 수간호사에게도 동일한 패턴 적용 (옵션)
  IF v_manager_id IS NOT NULL THEN
    -- 월요일 - 주간
    INSERT INTO schedule_assignments (schedule_id, employee_id, date, shift_template_id, is_published, created_at, updated_at)
    VALUES (v_schedule_id, v_manager_id, '2025-09-02', v_day_shift_id, true, NOW(), NOW())
    ON CONFLICT (schedule_id, employee_id, date) 
    DO UPDATE SET shift_template_id = v_day_shift_id, updated_at = NOW();
    
    -- 화요일 - 저녁
    INSERT INTO schedule_assignments (schedule_id, employee_id, date, shift_template_id, is_published, created_at, updated_at)
    VALUES (v_schedule_id, v_manager_id, '2025-09-03', v_evening_shift_id, true, NOW(), NOW())
    ON CONFLICT (schedule_id, employee_id, date) 
    DO UPDATE SET shift_template_id = v_evening_shift_id, updated_at = NOW();
    
    -- 수요일 - 야간
    INSERT INTO schedule_assignments (schedule_id, employee_id, date, shift_template_id, is_published, created_at, updated_at)
    VALUES (v_schedule_id, v_manager_id, '2025-09-04', v_night_shift_id, true, NOW(), NOW())
    ON CONFLICT (schedule_id, employee_id, date) 
    DO UPDATE SET shift_template_id = v_night_shift_id, updated_at = NOW();
    
    -- 목요일 - 주간
    INSERT INTO schedule_assignments (schedule_id, employee_id, date, shift_template_id, is_published, created_at, updated_at)
    VALUES (v_schedule_id, v_manager_id, '2025-09-05', v_day_shift_id, true, NOW(), NOW())
    ON CONFLICT (schedule_id, employee_id, date) 
    DO UPDATE SET shift_template_id = v_day_shift_id, updated_at = NOW();
    
    -- 금요일 - 저녁
    INSERT INTO schedule_assignments (schedule_id, employee_id, date, shift_template_id, is_published, created_at, updated_at)
    VALUES (v_schedule_id, v_manager_id, '2025-09-06', v_evening_shift_id, true, NOW(), NOW())
    ON CONFLICT (schedule_id, employee_id, date) 
    DO UPDATE SET shift_template_id = v_evening_shift_id, updated_at = NOW();
    
    -- 토요일 - 오프
    INSERT INTO schedule_assignments (schedule_id, employee_id, date, shift_template_id, is_published, created_at, updated_at)
    VALUES (v_schedule_id, v_manager_id, '2025-09-07', v_off_shift_id, true, NOW(), NOW())
    ON CONFLICT (schedule_id, employee_id, date) 
    DO UPDATE SET shift_template_id = v_off_shift_id, updated_at = NOW();
    
    -- 일요일 - 오프
    INSERT INTO schedule_assignments (schedule_id, employee_id, date, shift_template_id, is_published, created_at, updated_at)
    VALUES (v_schedule_id, v_manager_id, '2025-09-08', v_off_shift_id, true, NOW(), NOW())
    ON CONFLICT (schedule_id, employee_id, date) 
    DO UPDATE SET shift_template_id = v_off_shift_id, updated_at = NOW();
    
    RAISE NOTICE 'Manager 스케줄도 함께 추가되었습니다. Manager ID: %', v_manager_id;
  END IF;
  
  RAISE NOTICE 'Admin과 Manager의 스케줄이 동일하게 설정되었습니다.';
END $$;

-- 2. 결과 확인 - Admin의 이번 주 스케줄
SELECT 
  sa.date,
  e.name as employee_name,
  e.role,
  st.name as shift_name,
  st.type as shift_type,
  st.start_time,
  st.end_time,
  CASE 
    WHEN EXTRACT(DOW FROM sa.date) = 0 THEN '일요일'
    WHEN EXTRACT(DOW FROM sa.date) = 1 THEN '월요일'
    WHEN EXTRACT(DOW FROM sa.date) = 2 THEN '화요일'
    WHEN EXTRACT(DOW FROM sa.date) = 3 THEN '수요일'
    WHEN EXTRACT(DOW FROM sa.date) = 4 THEN '목요일'
    WHEN EXTRACT(DOW FROM sa.date) = 5 THEN '금요일'
    WHEN EXTRACT(DOW FROM sa.date) = 6 THEN '토요일'
  END as day_name
FROM schedule_assignments sa
JOIN employees e ON sa.employee_id = e.id
JOIN shift_templates st ON sa.shift_template_id = st.id
WHERE e.role IN ('admin', 'manager')
AND sa.date >= '2025-09-02'
AND sa.date <= '2025-09-08'
ORDER BY e.role, sa.date;

-- 3. 주간 요약 통계
SELECT 
  e.name,
  e.role,
  COUNT(CASE WHEN st.type = 'day' THEN 1 END) as "주간",
  COUNT(CASE WHEN st.type = 'evening' THEN 1 END) as "저녁",
  COUNT(CASE WHEN st.type = 'night' THEN 1 END) as "야간",
  COUNT(CASE WHEN st.type = 'off' THEN 1 END) as "오프"
FROM schedule_assignments sa
JOIN employees e ON sa.employee_id = e.id
JOIN shift_templates st ON sa.shift_template_id = st.id
WHERE e.role IN ('admin', 'manager')
AND sa.date >= '2025-09-02'
AND sa.date <= '2025-09-08'
GROUP BY e.id, e.name, e.role
ORDER BY e.role, e.name;