-- admin@shiftlink.com 계정에 맞는 employee 레코드 생성/수정
-- User ID: ac90039c-a8e3-42f7-81c9-82b8bdff39ad

-- 1. 먼저 현재 상황 확인
SELECT 
  'auth.users' as table_name,
  id,
  email,
  created_at
FROM auth.users 
WHERE email = 'admin@shiftlink.com';

SELECT 
  'employees' as table_name,
  id,
  name,
  role,
  email,
  auth_user_id,
  tenant_id
FROM employees 
WHERE auth_user_id = 'ac90039c-a8e3-42f7-81c9-82b8bdff39ad';

-- 2. tenant 정보 확인
SELECT id, name FROM tenants;

-- 3. employee 레코드 생성 (tenant_id는 첫 번째 tenant 사용)
DO $$
DECLARE
  v_tenant_id UUID;
  v_user_id UUID := 'ac90039c-a8e3-42f7-81c9-82b8bdff39ad';
BEGIN
  -- 첫 번째 tenant_id 가져오기
  SELECT id INTO v_tenant_id FROM tenants LIMIT 1;
  
  -- employee 레코드가 있는지 확인하고 없으면 생성
  IF NOT EXISTS (
    SELECT 1 FROM employees WHERE auth_user_id = v_user_id
  ) THEN
    INSERT INTO employees (
      name,
      email,
      role,
      auth_user_id,
      tenant_id,
      created_at,
      updated_at
    ) VALUES (
      '관리자',
      'admin@shiftlink.com',
      'admin',
      v_user_id,
      v_tenant_id,
      NOW(),
      NOW()
    );
    
    RAISE NOTICE 'Admin employee 레코드가 생성되었습니다.';
  ELSE
    -- 기존 레코드가 있으면 업데이트
    UPDATE employees 
    SET 
      role = 'admin',
      name = COALESCE(NULLIF(name, ''), '관리자'),
      email = 'admin@shiftlink.com',
      updated_at = NOW()
    WHERE auth_user_id = v_user_id;
    
    RAISE NOTICE 'Admin employee 레코드가 업데이트되었습니다.';
  END IF;
END $$;

-- 4. 결과 확인
SELECT 
  e.id,
  e.name,
  e.role,
  e.email,
  e.auth_user_id,
  e.tenant_id,
  t.name as tenant_name
FROM employees e
LEFT JOIN tenants t ON e.tenant_id = t.id
WHERE e.auth_user_id = 'ac90039c-a8e3-42f7-81c9-82b8bdff39ad';