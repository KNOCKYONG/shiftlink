-- 팀 데이터 생성
-- A팀과 B팀 추가

DO $$
DECLARE
  v_tenant_id UUID := '6f4c5ca7-77ad-47c6-ac83-e9c1f6ea4acf';
BEGIN
  -- A팀 추가
  INSERT INTO teams (
    id,
    tenant_id,
    name,
    description,
    created_at,
    updated_at
  ) VALUES (
    '32acec0f-23c7-4c4f-9d95-4ae67b26e83a',
    v_tenant_id,
    'A팀',
    '내과병동 A팀',
    NOW(),
    NOW()
  ) ON CONFLICT (id) DO UPDATE SET
    name = 'A팀',
    description = '내과병동 A팀',
    updated_at = NOW();

  -- B팀 추가
  INSERT INTO teams (
    id,
    tenant_id,
    name,
    description,
    created_at,
    updated_at
  ) VALUES (
    '2ebca37d-7ab8-4605-b414-2eaf6add0de9',
    v_tenant_id,
    'B팀',
    '내과병동 B팀',
    NOW(),
    NOW()
  ) ON CONFLICT (id) DO UPDATE SET
    name = 'B팀',
    description = '내과병동 B팀',
    updated_at = NOW();

  RAISE NOTICE 'A팀과 B팀이 생성되었습니다.';
END $$;

-- 결과 확인
SELECT 
  id,
  name,
  description,
  tenant_id
FROM teams
WHERE tenant_id = '6f4c5ca7-77ad-47c6-ac83-e9c1f6ea4acf'
ORDER BY name;