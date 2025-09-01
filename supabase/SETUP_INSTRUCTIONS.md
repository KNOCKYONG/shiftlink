# ShiftLink 마스터 계정 설정 가이드

## 🚀 빠른 설정 (Supabase Dashboard 사용)

### 1단계: SQL 스크립트 실행
1. [Supabase Dashboard](https://supabase.com/dashboard)에 로그인
2. 프로젝트 선택
3. SQL Editor 열기
4. `create_master_admin_fixed.sql` 파일 내용 복사하여 붙여넣기
5. "Run" 클릭하여 실행

### 2단계: Auth 사용자 생성
1. Dashboard에서 Authentication > Users 메뉴로 이동
2. "Add user" 버튼 클릭
3. 다음 정보 입력:
   - Email: `master@shiftlink.com`
   - Password: `Wkdrn123@@`
4. "Create user" 클릭
5. 생성된 사용자의 ID 복사 (UUID 형식)

### 3단계: 마스터 직원 레코드 연결
1. SQL Editor로 돌아가기
2. 다음 명령 실행 (복사한 ID 사용):
```sql
SELECT setup_master_employee('여기에-복사한-USER-ID-붙여넣기'::uuid);
```

### 4단계: 설정 확인
```sql
SELECT * FROM verify_master_setup();
```

모든 컴포넌트가 "OK" 상태인지 확인

## ✅ 설정 검증

성공적으로 설정되면 다음과 같은 결과를 볼 수 있습니다:

| component | status | details |
|-----------|--------|---------|
| Tenant    | OK     | Master tenant exists |
| Site      | OK     | Master site exists |
| Team      | OK     | Admin team exists |
| Employee  | OK     | Master employee exists with ID: ... |

## 🔐 로그인 테스트

1. 애플리케이션의 로그인 페이지로 이동
2. 다음 정보로 로그인:
   - Email: `master@shiftlink.com`
   - Password: `Wkdrn123@@`
3. 관리자 대시보드 접근 확인

## 🛠️ 문제 해결

### "ON CONFLICT" 오류가 발생하는 경우
- `create_master_admin_fixed.sql` 사용 (이미 수정됨)
- 기존 데이터와 충돌이 있을 수 있으니 확인

### Auth 사용자를 생성할 수 없는 경우
1. Auth > Providers 설정 확인
2. Email provider가 활성화되어 있는지 확인
3. SMTP 설정이 필요할 수 있음

### RLS 정책이 작동하지 않는 경우
1. RLS가 활성화되어 있는지 확인:
```sql
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
```

2. 정책이 올바르게 생성되었는지 확인:
```sql
SELECT tablename, policyname 
FROM pg_policies 
WHERE policyname LIKE '%master_admin%';
```

## 📝 추가 설정 (선택사항)

### 환경 변수 설정
`.env.local` 파일에 추가:
```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### MCP 서버 설정
MCP를 사용하려면 `setup_mcp_server.md` 파일 참조

## 🔒 보안 권고사항

1. **프로덕션 환경에서는 즉시 비밀번호 변경**
2. 2FA (Two-Factor Authentication) 활성화
3. IP 제한 설정 고려
4. 정기적인 감사 로그 검토

## 📞 지원

문제가 지속되면:
1. Supabase 로그 확인 (Dashboard > Logs)
2. 브라우저 개발자 도구에서 네트워크 오류 확인
3. [Supabase Discord](https://discord.supabase.com) 커뮤니티 문의