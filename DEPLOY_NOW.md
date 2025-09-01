# 🚀 ShiftLink 데이터베이스 즉시 배포 가이드

## 📋 즉시 실행 단계 (5분 소요)

### 1️⃣ Supabase Dashboard 접속
👉 **[여기 클릭하여 SQL Editor 열기](https://app.supabase.com/project/igofcukuimzljtjaxfda/sql/new)**

### 2️⃣ SQL 스크립트 실행
1. 위 링크로 SQL Editor 열기
2. `supabase/deploy_to_supabase.sql` 파일 열기
3. **전체 선택** (Ctrl+A) → **복사** (Ctrl+C)
4. SQL Editor에 **붙여넣기** (Ctrl+V)
5. **RUN** 버튼 클릭 (또는 Ctrl+Enter)

### 3️⃣ 성공 확인
✅ 마지막 줄에 **"ShiftLink database schema deployed successfully!"** 메시지 확인

### 4️⃣ API 키 가져오기
👉 **[Settings > API 페이지 열기](https://app.supabase.com/project/igofcukuimzljtjaxfda/settings/api)**

다음 키들을 복사:
- `Project URL`: https://igofcukuimzljtjaxfda.supabase.co
- `anon public`: eyJ... (시작하는 긴 문자열)
- `service_role`: eyJ... (시작하는 긴 문자열)

### 5️⃣ .env.local 업데이트
`.env.local` 파일에서 다음 부분 수정:
```env
NEXT_PUBLIC_SUPABASE_URL=https://igofcukuimzljtjaxfda.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[여기에 anon key 붙여넣기]
SUPABASE_SERVICE_ROLE_KEY=[여기에 service role key 붙여넣기]
```

## ✅ 배포 검증

### Table Editor에서 확인
👉 **[Table Editor 열기](https://app.supabase.com/project/igofcukuimzljtjaxfda/editor)**

다음 테이블들이 생성되었는지 확인:
- ✅ tenants
- ✅ employees
- ✅ schedules
- ✅ schedule_assignments
- ... (총 25개 테이블)

## 🧪 빠른 테스트

SQL Editor에서 실행하여 테스트 데이터 생성:

```sql
-- 테스트 회사 생성
INSERT INTO tenants (name, slug) 
VALUES ('ShiftLink 테스트', 'shiftlink-test')
RETURNING *;
```

## ⚠️ 문제 발생 시

### "type already exists" 에러
```sql
-- 먼저 이것 실행
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS shift_type CASCADE;
DROP TYPE IF EXISTS request_status CASCADE;
DROP TYPE IF EXISTS leave_type CASCADE;

-- 그 다음 deploy_to_supabase.sql 다시 실행
```

### "permission denied" 에러
- Database 비밀번호 확인: rkddkwlvnf0@@
- Settings > Database에서 비밀번호 재설정

## 🎯 다음 단계

1. **개발 서버 실행**
```bash
cd shiftlink-app
npm run dev
```

2. **http://localhost:3000 접속**

---

**도움이 필요하면 에러 메시지와 함께 문의해주세요!**