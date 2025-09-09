-- admin 계정의 employee 정보 확인
SELECT 
  e.id as employee_id,
  e.name,
  e.role,
  e.tenant_id,
  e.team_id,
  au.email
FROM employees e
JOIN auth.users au ON e.auth_user_id = au.id
WHERE au.email = 'admin@shiftlink.com';

-- 현재 월의 스케줄이 있는지 확인
SELECT * FROM schedules 
WHERE tenant_id = (
  SELECT tenant_id FROM employees 
  WHERE auth_user_id = (
    SELECT id FROM auth.users WHERE email = 'admin@shiftlink.com'
  )
)
AND month = '2025-09'
LIMIT 1;

-- shift_templates 확인 (근무 타입 정보)
SELECT * FROM shift_templates 
WHERE tenant_id = (
  SELECT tenant_id FROM employees 
  WHERE auth_user_id = (
    SELECT id FROM auth.users WHERE email = 'admin@shiftlink.com'
  )
);

-- admin 계정에 이번 주 스케줄 추가 (예시: 2025년 9월 2일 ~ 9월 6일)
-- 먼저 admin의 employee_id와 tenant_id를 가져옵니다
WITH admin_info AS (
  SELECT 
    e.id as employee_id,
    e.tenant_id,
    e.team_id
  FROM employees e
  JOIN auth.users au ON e.auth_user_id = au.id
  WHERE au.email = 'admin@shiftlink.com'
),
schedule_info AS (
  -- 2025년 9월 스케줄 가져오기 (없으면 생성 필요)
  SELECT id as schedule_id
  FROM schedules
  WHERE tenant_id = (SELECT tenant_id FROM admin_info)
  AND month = '2025-09'
  LIMIT 1
),
shift_info AS (
  -- shift_templates 정보 가져오기
  SELECT 
    id,
    type,
    name
  FROM shift_templates
  WHERE tenant_id = (SELECT tenant_id FROM admin_info)
)
-- 스케줄 할당 추가 (월요일~금요일)
INSERT INTO schedule_assignments (
  schedule_id,
  employee_id,
  date,
  shift_template_id,
  is_published,
  created_at,
  updated_at
)
SELECT 
  (SELECT schedule_id FROM schedule_info),
  (SELECT employee_id FROM admin_info),
  date_val::date,
  CASE 
    -- 월요일, 수요일, 금요일: 주간 근무
    WHEN EXTRACT(DOW FROM date_val::date) IN (1, 3, 5) THEN 
      (SELECT id FROM shift_info WHERE type = 'day' LIMIT 1)
    -- 화요일: 저녁 근무
    WHEN EXTRACT(DOW FROM date_val::date) = 2 THEN 
      (SELECT id FROM shift_info WHERE type = 'evening' LIMIT 1)
    -- 목요일: 오프
    WHEN EXTRACT(DOW FROM date_val::date) = 4 THEN 
      (SELECT id FROM shift_info WHERE type = 'off' LIMIT 1)
  END,
  true,
  NOW(),
  NOW()
FROM generate_series('2025-09-02'::date, '2025-09-06'::date, '1 day'::interval) AS date_val
WHERE (SELECT schedule_id FROM schedule_info) IS NOT NULL
  AND (SELECT employee_id FROM admin_info) IS NOT NULL
ON CONFLICT (schedule_id, employee_id, date) 
DO UPDATE SET 
  shift_template_id = EXCLUDED.shift_template_id,
  updated_at = NOW();

-- 결과 확인
SELECT 
  sa.date,
  sa.employee_id,
  e.name as employee_name,
  st.name as shift_name,
  st.type as shift_type,
  st.start_time,
  st.end_time
FROM schedule_assignments sa
JOIN employees e ON sa.employee_id = e.id
JOIN shift_templates st ON sa.shift_template_id = st.id
WHERE e.auth_user_id = (
  SELECT id FROM auth.users WHERE email = 'admin@shiftlink.com'
)
AND sa.date >= '2025-09-02'
AND sa.date <= '2025-09-06'
ORDER BY sa.date;

-- 다른 직원들의 스케줄도 함께 추가하려면 (선택사항)
-- 수간호사 역할을 가진 직원에게도 비슷한 스케줄 추가
WITH manager_info AS (
  SELECT 
    e.id as employee_id,
    e.tenant_id,
    e.name
  FROM employees e
  WHERE e.role = 'manager'
  AND e.tenant_id = (
    SELECT tenant_id FROM employees 
    WHERE auth_user_id = (
      SELECT id FROM auth.users WHERE email = 'admin@shiftlink.com'
    )
  )
),
schedule_info AS (
  SELECT id as schedule_id
  FROM schedules
  WHERE tenant_id = (SELECT tenant_id FROM manager_info LIMIT 1)
  AND month = '2025-09'
  LIMIT 1
),
shift_info AS (
  SELECT 
    id,
    type,
    name
  FROM shift_templates
  WHERE tenant_id = (SELECT tenant_id FROM manager_info LIMIT 1)
)
INSERT INTO schedule_assignments (
  schedule_id,
  employee_id,
  date,
  shift_template_id,
  is_published,
  created_at,
  updated_at
)
SELECT 
  (SELECT schedule_id FROM schedule_info),
  employee_id,
  date_val::date,
  CASE 
    -- 패턴을 약간 다르게 설정
    WHEN EXTRACT(DOW FROM date_val::date) IN (1, 4) THEN 
      (SELECT id FROM shift_info WHERE type = 'day' LIMIT 1)
    WHEN EXTRACT(DOW FROM date_val::date) IN (2, 5) THEN 
      (SELECT id FROM shift_info WHERE type = 'evening' LIMIT 1)
    WHEN EXTRACT(DOW FROM date_val::date) = 3 THEN 
      (SELECT id FROM shift_info WHERE type = 'night' LIMIT 1)
  END,
  true,
  NOW(),
  NOW()
FROM manager_info, 
     generate_series('2025-09-02'::date, '2025-09-06'::date, '1 day'::interval) AS date_val
WHERE (SELECT schedule_id FROM schedule_info) IS NOT NULL
ON CONFLICT (schedule_id, employee_id, date) 
DO UPDATE SET 
  shift_template_id = EXCLUDED.shift_template_id,
  updated_at = NOW();