# ShiftLink 프로젝트 인계 문서

## 📋 프로젝트 개요
ShiftLink는 병원 직원들의 3교대 근무 스케줄을 관리하는 Next.js 기반 웹 애플리케이션입니다.

### 기술 스택
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Supabase (PostgreSQL, Authentication, Row Level Security)
- **배포**: Vercel
- **개발 서버**: http://localhost:3003

## 🔑 중요 환경 변수 (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=https://igofcukuimzljtjaxfda.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 📝 최근 작업 내역

### 1. 직원 관리 페이지 개선 (2025-09-07)
**파일**: `/app/dashboard/employees/employees-client.tsx`

#### 구현된 기능:
- **인라인 편집**: 각 행에서 역할, 부서, 상태를 드롭다운으로 직접 수정 가능
- **필터링**: 테이블 헤더에 역할, 부서, 상태별 필터 드롭다운 추가
- **삭제 기능**: 각 직원 행에서 삭제 버튼으로 직원 제거 가능

#### 주요 상태 관리:
```typescript
const [editingId, setEditingId] = useState<string | null>(null)
const [editedData, setEditedData] = useState<any>({})
const [roleFilter, setRoleFilter] = useState<string>('all')
const [departmentFilter, setDepartmentFilter] = useState<string>('all')
const [statusFilter, setStatusFilter] = useState<string>('all')
```

### 2. 초대 코드 시스템 구현
**목적**: 각 병원(tenant)별로 고유한 초대 코드를 통해 직원들이 가입할 수 있도록 함

#### 2.1 데이터베이스 구조
- `tenants` 테이블에 `invite_code` 컬럼 추가 (VARCHAR(8))
- 예시 코드: "JF3LBH1B", "311LRODC", "ZEP401JM"

#### 2.2 회원가입 프로세스
**파일**: `/app/auth/signup/page.tsx`
- 초대 코드 입력 필수
- 초대 코드 검증 후 해당 tenant에 직원으로 등록
- ~~병원 선택 드롭다운~~ (제거됨)
- ~~부서 입력 필드~~ (제거됨)

#### 2.3 API 엔드포인트

##### `/api/auth/validate-invite-code/route.ts`
- GET/POST 메서드 지원
- Service Role Key 사용하여 RLS 우회 (중요!)
- 초대 코드로 tenant 조회 및 검증

##### `/api/auth/complete-signup/route.ts`
- Service Role Key 사용
- Employee 레코드 생성
- 기본 site와 team 자동 생성
- department 필드 제거 (employees 테이블에 없음)

#### 2.4 관리자 초대 코드 관리
**파일**: `/app/dashboard/settings/invite-code/page.tsx`
- 현재 tenant의 초대 코드 표시
- 초대 코드 재생성 기능

### 3. 인증 시스템 개선

#### 3.1 Service Client 추가
**파일**: `/lib/supabase/service.ts`
```typescript
// RLS를 우회하기 위한 Service Role Client
export function createServiceClient() {
  return createClient(url, serviceKey, {...})
}
```
**용도**: tenants 테이블 조회, employees 레코드 생성 시 사용

#### 3.2 로그인 프로세스 개선
**파일**: `/lib/auth/auth-config.ts`
- Auth 로그인 먼저 시도 → 성공 후 employees 조회
- `auth_user_id`로 직원 정보 조회 (email 대신)
- 직원 정보 없어도 로그인 허용

#### 3.3 이메일 확인 처리
**파일**: `/app/auth/callback/route.ts`, `/app/auth/confirm/route.ts`
- 이메일 확인 콜백 처리
- 에러 메시지 개선
- OTP 토큰 검증 지원

## ⚠️ 현재 이슈 및 주의사항

### 1. Row Level Security (RLS) 이슈
- **문제**: 일반 client로는 tenants 테이블 조회 불가
- **해결**: Service Role Key 사용 (`createServiceClient()`)
- **주의**: Service Role Key는 서버 사이드에서만 사용

### 2. 이메일 확인 관련
- **현상**: 이메일 링크 만료 시 로그인 불가
- **해결 방법**:
  1. Supabase Dashboard > Authentication > Users에서 수동 확인
  2. 새 확인 이메일 발송

### 3. Department 필드 관련
- **중요**: employees 테이블에 department 컬럼 없음
- 모든 department 관련 코드는 제거됨
- 대신 teams 테이블 사용

### 4. Git 작업 관련
- **자동 push 비활성화**: 사용자 요청에 따라 자동 git push 중단
- 수동으로 commit & push 필요

## 🔄 개발 환경 설정

### 1. 프로젝트 실행
```bash
# 의존성 설치
npm install

# 개발 서버 실행 (포트 3003)
npm run dev

# 빌드
npm run build
```

### 2. Supabase 설정 확인
1. Authentication > URL Configuration에서 Redirect URLs 확인:
   - `http://localhost:3003/auth/callback`
   - `http://localhost:3003/auth/confirm`
   - 배포 URL도 추가 필요

2. Database > Tables에서 다음 테이블 구조 확인:
   - `tenants`: invite_code 컬럼 포함
   - `employees`: department 컬럼 없음, auth_user_id로 연결
   - `sites`, `teams`: 조직 구조

## 📂 주요 파일 구조

```
/app
  /api
    /auth
      /validate-invite-code    # 초대 코드 검증
      /complete-signup          # 회원가입 완료 처리
      /callback                 # OAuth 콜백
      /confirm                  # 이메일 확인
  /auth
    /login                      # 로그인 페이지
    /signup                     # 회원가입 페이지
  /dashboard
    /employees                  # 직원 관리 (드롭다운 편집, 필터, 삭제)
    /settings
      /invite-code             # 초대 코드 관리

/lib
  /supabase
    /client.ts                  # 클라이언트 사이드 Supabase
    /server.ts                  # 서버 사이드 Supabase (ANON KEY)
    /service.ts                 # Service Role Supabase (RLS 우회)
  /auth
    /auth-config.ts            # 인증 로직
```

## 🚀 다음 작업 제안

1. **이메일 템플릿 커스터마이징**
   - Supabase에서 이메일 템플릿 수정
   - 병원 브랜딩 적용

2. **초대 코드 개선**
   - 만료 기간 설정
   - 사용 횟수 제한
   - QR 코드 생성 기능

3. **직원 관리 추가 기능**
   - 일괄 업로드 (CSV/Excel)
   - 직원 프로필 사진
   - 상세 정보 편집 모달

4. **권한 관리 강화**
   - 역할별 접근 권한 세분화
   - 부서장 권한 추가

5. **대시보드 개선**
   - 실시간 알림 기능
   - 스케줄 충돌 감지

## 💡 팁 & 트릭

1. **Supabase 디버깅**:
   - SQL Editor에서 직접 쿼리 실행 가능
   - Logs에서 실시간 로그 확인

2. **타입 안정성**:
   - Supabase CLI로 타입 자동 생성 가능
   - `npx supabase gen types typescript`

3. **성능 최적화**:
   - React Query나 SWR 도입 고려
   - 페이지네이션 구현 필요

4. **보안 주의사항**:
   - Service Role Key는 절대 클라이언트에 노출 금지
   - 환경 변수는 .env.local에만 저장

## 📞 연락처 및 참고 자료

- **Supabase Dashboard**: https://supabase.com/dashboard/project/igofcukuimzljtjaxfda
- **Vercel Dashboard**: 프로젝트 소유자에게 문의
- **GitHub Issues**: 버그 및 기능 요청 관리

## 🎯 핵심 요약

1. **초대 코드 시스템이 핵심**: 병원별로 직원들을 구분하는 중요한 기능
2. **Service Client 사용 필수**: RLS 때문에 많은 작업에서 service role 필요
3. **Department 필드 없음**: employees 테이블에 department 컬럼 없음 주의
4. **이메일 확인 필수**: 회원가입 후 이메일 확인해야 로그인 가능

---

**마지막 업데이트**: 2025-09-07
**작성자**: Claude (Previous AI Agent)
**인계 대상**: Next AI Agent

이 문서는 프로젝트의 현재 상태와 최근 작업 내역을 포함하고 있습니다. 추가 질문이나 명확히 해야 할 부분이 있다면 코드를 직접 확인하시기 바랍니다.