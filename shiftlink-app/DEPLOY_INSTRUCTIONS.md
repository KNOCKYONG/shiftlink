# ShiftLink - Supabase 데이터베이스 배포 가이드

## 📋 준비사항
- Supabase 프로젝트: `igofcukuimzljtjaxfda`
- 데이터베이스 비밀번호: 설정 완료

## 🚀 배포 방법

### 방법 1: Supabase Dashboard에서 직접 실행 (권장)

1. **Supabase Dashboard 접속**
   - https://app.supabase.com 로그인
   - 프로젝트 선택

2. **SQL Editor에서 스키마 배포**
   - 왼쪽 메뉴에서 **SQL Editor** 클릭
   - **New query** 버튼 클릭
   - `supabase/deploy_to_supabase.sql` 파일 내용 전체 복사
   - SQL Editor에 붙여넣기
   - **Run** 버튼 클릭 (또는 Ctrl+Enter)

3. **배포 확인**
   - "ShiftLink database schema deployed successfully!" 메시지 확인
   - 왼쪽 메뉴 **Table Editor**에서 테이블 생성 확인

### 방법 2: Supabase CLI 사용 (대체 방법)

```bash
# 1. Supabase CLI 로그인
npx supabase login --token sbp_20a52befb3bba512ff7778861277f56aa2035b1e

# 2. 프로젝트 연결 (비밀번호 필요)
npx supabase link --project-ref igofcukuimzljtjaxfda

# 3. 마이그레이션 실행
npx supabase db push
```

## 📝 환경 변수 설정

### 1. Supabase에서 정보 가져오기
- Dashboard → Settings → API
- 다음 정보 복사:
  - Project URL
  - anon public key
  - service_role key (보안 주의!)

### 2. .env.local 파일 업데이트
```env
NEXT_PUBLIC_SUPABASE_URL=https://igofcukuimzljtjaxfda.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon key 입력]
SUPABASE_SERVICE_ROLE_KEY=[service role key 입력]
```

## 🔍 배포 후 확인사항

### 테이블 생성 확인 (23개)
**기본 테이블:**
- [ ] tenants
- [ ] sites
- [ ] teams
- [ ] employees
- [ ] rulesets
- [ ] shift_templates
- [ ] patterns
- [ ] schedules
- [ ] schedule_assignments
- [ ] leaves
- [ ] absences
- [ ] trainings
- [ ] swap_requests
- [ ] notifications
- [ ] integrations
- [ ] audit_logs

**확장 테이블:**
- [ ] schedule_versions
- [ ] schedule_change_logs
- [ ] schedule_shares
- [ ] schedule_generation_requests
- [ ] employee_preferences
- [ ] organization_hierarchy
- [ ] employee_hierarchy
- [ ] default_requests
- [ ] schedule_metrics

### RLS 정책 확인
- Authentication → Policies 에서 정책 활성화 확인

### 트리거 확인
- Database → Triggers 에서 updated_at 트리거 확인

## 🎯 다음 단계

1. **테스트 데이터 생성**
   ```sql
   -- 테스트 테넌트 생성
   INSERT INTO tenants (name, slug) 
   VALUES ('테스트 회사', 'test-company');
   ```

2. **Supabase Auth 설정**
   - Authentication → Providers
   - Email/Password 활성화
   - Google OAuth 설정 (선택)

3. **프론트엔드 연결**
   - `lib/supabase/client.ts` 파일 생성
   - 인증 시스템 구현
   - 대시보드 UI 개발

## ⚠️ 주의사항

- `service_role_key`는 서버 사이드에서만 사용
- 프로덕션 환경에서는 RLS 정책 필수
- 정기적인 데이터베이스 백업 권장

## 🆘 문제 해결

### 비밀번호 오류
- Dashboard → Settings → Database
- Database Password 재설정

### 테이블 생성 실패
- 기존 테이블 삭제 후 재실행
- 또는 `IF NOT EXISTS` 구문 확인

### RLS 정책 오류
- auth.users 테이블 존재 확인
- helper 함수 먼저 생성 확인

---

배포 중 문제가 발생하면 에러 메시지와 함께 문의해주세요!