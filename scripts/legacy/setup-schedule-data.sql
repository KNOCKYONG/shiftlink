-- 1. tenant 정보 확인
SELECT * FROM tenants;

-- 2. shift_templates가 없으면 생성 (기본 3교대 + 오프)
INSERT INTO shift_templates (
  tenant_id,
  name,
  type,
  start_time,
  end_time,
  description,
  color,
  created_at,
  updated_at
)
SELECT 
  t.id,
  shift.name,
  shift.type,
  shift.start_time,
  shift.end_time,
  shift.description,
  shift.color,
  NOW(),
  NOW()
FROM tenants t
CROSS JOIN (
  VALUES 
    ('주간 근무', 'day', '07:00', '15:00', '주간 근무 시간', '#FEF3C7'),
    ('저녁 근무', 'evening', '15:00', '23:00', '저녁 근무 시간', '#DBEAFE'),
    ('야간 근무', 'night', '23:00', '07:00', '야간 근무 시간', '#E9D5FF'),
    ('오프', 'off', NULL, NULL, '휴무', '#F3F4F6'),
    ('연차', 'vacation', NULL, NULL, '연차 휴가', '#D1FAE5'),
    ('병가', 'sick_leave', NULL, NULL, '병가', '#FEE2E2'),
    ('교육', 'training', '09:00', '18:00', '교육 참석', '#FEF3C7')
) AS shift(name, type, start_time, end_time, description, color)
WHERE NOT EXISTS (
  SELECT 1 FROM shift_templates st 
  WHERE st.tenant_id = t.id AND st.type = shift.type
);

-- 3. 2025년 9월 스케줄 생성
INSERT INTO schedules (
  tenant_id,
  month,
  name,
  status,
  created_by,
  created_at,
  updated_at
)
SELECT 
  t.id,
  '2025-09',
  '2025년 9월 근무표',
  'published',
  e.id,
  NOW(),
  NOW()
FROM tenants t
JOIN employees e ON e.tenant_id = t.id AND e.role = 'admin'
WHERE NOT EXISTS (
  SELECT 1 FROM schedules s 
  WHERE s.tenant_id = t.id AND s.month = '2025-09'
)
LIMIT 1;

-- 4. shift_templates 확인
SELECT 
  st.*,
  t.name as tenant_name
FROM shift_templates st
JOIN tenants t ON st.tenant_id = t.id
ORDER BY st.tenant_id, st.type;

-- 5. schedules 확인
SELECT 
  s.*,
  t.name as tenant_name,
  e.name as created_by_name
FROM schedules s
JOIN tenants t ON s.tenant_id = t.id
LEFT JOIN employees e ON s.created_by = e.id
WHERE s.month = '2025-09';

-- 6. admin과 manager 직원들 확인
SELECT 
  e.id,
  e.name,
  e.role,
  e.email,
  t.name as tenant_name
FROM employees e
JOIN tenants t ON e.tenant_id = t.id
WHERE e.role IN ('admin', 'manager')
ORDER BY e.role, e.name;