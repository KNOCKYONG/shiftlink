# ShiftLink Supabase 데이터베이스 배포 가이드

## 🔐 프로젝트 정보
- **Project Ref**: `igofcukuimzljtjaxfda`
- **Project URL**: `https://igofcukuimzljtjaxfda.supabase.co`
- **Database Password**: 설정 완료

## 📋 배포 단계

### 1단계: Supabase Dashboard에서 SQL 실행

1. **Supabase Dashboard 접속**
   - https://app.supabase.com 로그인
   - 프로젝트 `igofcukuimzljtjaxfda` 선택

2. **SQL Editor 실행**
   - 왼쪽 메뉴에서 **SQL Editor** 클릭
   - **New query** 버튼 클릭

3. **스키마 배포**
   - `supabase/deploy_to_supabase.sql` 파일을 열기
   - 전체 내용 복사 (Ctrl+A, Ctrl+C)
   - SQL Editor에 붙여넣기
   - **Run** 버튼 클릭 (또는 Ctrl+Enter)

4. **배포 확인**
   - 성공 메시지: "ShiftLink database schema deployed successfully!"
   - 에러가 발생하면 아래 트러블슈팅 참조

### 2단계: 환경 변수 설정

1. **Supabase에서 API 키 가져오기**
   - Dashboard → Settings → API
   - 다음 정보 복사:
     - `Project URL`
     - `anon public` key
     - `service_role` key (⚠️ 보안 주의!)

2. **.env.local 파일 업데이트**
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://igofcukuimzljtjaxfda.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[여기에 anon key 붙여넣기]
SUPABASE_SERVICE_ROLE_KEY=[여기에 service role key 붙여넣기]
```

### 3단계: 배포 검증

**Table Editor에서 확인할 테이블들:**

✅ **기본 테이블 (16개)**
- tenants, sites, teams, employees
- rulesets, shift_templates, patterns
- schedules, schedule_assignments
- leaves, absences, trainings
- swap_requests, notifications
- integrations, audit_logs

✅ **확장 테이블 (9개)**
- schedule_versions, schedule_change_logs
- schedule_shares, schedule_generation_requests
- employee_preferences, organization_hierarchy
- employee_hierarchy, default_requests
- schedule_metrics

## 🧪 테스트 데이터 생성

SQL Editor에서 실행:

```sql
-- 1. 테스트 테넌트 생성
INSERT INTO tenants (name, slug, settings) 
VALUES ('테스트 회사', 'test-company', '{"theme": "default"}')
RETURNING id;

-- 2. 테스트 사이트 생성 (위에서 반환된 tenant_id 사용)
INSERT INTO sites (tenant_id, name, address, timezone)
VALUES ('[tenant_id]', '서울 본사', '서울시 강남구', 'Asia/Seoul')
RETURNING id;

-- 3. 테스트 팀 생성 (위에서 반환된 site_id 사용)
INSERT INTO teams (site_id, name, description)
VALUES ('[site_id]', '생산 1팀', '3교대 근무팀')
RETURNING id;
```

## 🔧 트러블슈팅

### 문제 1: "type already exists" 에러
```sql
-- 기존 타입 삭제 후 재실행
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS shift_type CASCADE;
DROP TYPE IF EXISTS request_status CASCADE;
DROP TYPE IF EXISTS leave_type CASCADE;
```

### 문제 2: "table already exists" 에러
```sql
-- 모든 테이블 삭제 (주의: 데이터 손실!)
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
```

### 문제 3: RLS 정책 에러
```sql
-- RLS 비활성화 후 재시도
ALTER TABLE [table_name] DISABLE ROW LEVEL SECURITY;
```

## 🚀 다음 단계

1. **인증 시스템 구현**
   - `app/(auth)/login/page.tsx` 생성
   - Supabase Auth 컴포넌트 구현

2. **대시보드 UI 개발**
   - `app/(dashboard)/page.tsx` 구현
   - 스케줄 뷰어 컴포넌트 개발

3. **API 라우트 생성**
   - `app/api/schedules/route.ts`
   - `app/api/employees/route.ts`

## 📝 참고사항

- **보안**: `service_role_key`는 서버 사이드에서만 사용
- **RLS**: 프로덕션 환경에서는 RLS 정책 필수
- **백업**: 정기적인 데이터베이스 백업 설정 권장
- **모니터링**: Supabase Dashboard에서 성능 모니터링

---

문제가 발생하면 에러 메시지와 함께 문의해주세요!