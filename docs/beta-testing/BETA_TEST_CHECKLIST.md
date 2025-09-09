# 📋 ShiftLink 베타 테스트 체크리스트

## ✅ 완료된 설정

### 1. 프로젝트 구조 (Complete)
- [x] Next.js 14 프로젝트 설정
- [x] TypeScript 설정 (tsconfig.json)
- [x] Tailwind CSS 설정 (tailwind.config.js, postcss.config.js)
- [x] 환경 변수 템플릿 (.env.example)
- [x] Vercel 배포 설정 (vercel.json)
- [x] 패키지 의존성 정의 (package.json)

### 2. 핵심 파일 생성 (Complete)
- [x] app/layout.tsx - 루트 레이아웃
- [x] app/globals.css - 전역 스타일
- [x] next.config.js - Next.js 설정
- [x] 검증 스크립트 (scripts/validate-setup.js)
- [x] DB 체크 스크립트 (scripts/check-db.js)

### 3. SQL 스크립트 준비 (Complete)
- [x] supabase/1_add_enum_values.sql - enum 타입 확장
- [x] supabase/add_shift_types_and_setup.sql - 테스트 데이터
- [x] supabase/setup_rls_policies_fixed.sql - 보안 정책

## 🔧 필요한 설정 (사용자 작업)

### 1. Supabase 프로젝트 설정
```bash
# 1. Supabase 프로젝트 생성
# https://app.supabase.com 에서 새 프로젝트 생성

# 2. .env.local 파일 업데이트
# Supabase 대시보드 > Settings > API 에서 값 복사
NEXT_PUBLIC_SUPABASE_URL=your_actual_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_actual_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_actual_service_role_key
```

### 2. 데이터베이스 초기화
```sql
-- Supabase SQL Editor에서 순서대로 실행:

-- Step 1: Enum 값 추가 (트랜잭션 외부에서 실행)
-- supabase/1_add_enum_values.sql 내용 실행

-- Step 2: 테스트 데이터 생성
-- supabase/add_shift_types_and_setup.sql 내용 실행

-- Step 3: RLS 정책 설정
-- supabase/setup_rls_policies_fixed.sql 내용 실행
```

### 3. 인증 설정
```bash
# Supabase Dashboard에서:
# 1. Authentication > Providers > Email 활성화
# 2. Authentication > Users > 새 사용자 생성
#    - Email: admin@shiftlink.kr
#    - Password: 안전한 비밀번호 설정

# 3. SQL Editor에서 auth_user_id 연결:
UPDATE employees 
SET auth_user_id = 'copied-auth-user-id-here'
WHERE email = 'admin@shiftlink.kr';
```

### 4. 로컬 개발 환경 실행
```bash
# 1. 의존성 설치
npm install

# 2. 환경 검증
npm run validate

# 3. 데이터베이스 연결 확인
npm run check-db

# 4. 개발 서버 시작
npm run dev

# 5. 브라우저에서 접속
# http://localhost:3003
```

## 🧪 테스트 시나리오

### 기본 기능 테스트
- [ ] 로그인 페이지 접근 가능
- [ ] admin@shiftlink.kr로 로그인
- [ ] 대시보드 접근 가능
- [ ] 직원 목록 조회
- [ ] 스케줄 생성 및 조회

### 권한 테스트
- [ ] 관리자 권한 기능 확인
- [ ] RLS 정책 동작 확인
- [ ] 테넌트 격리 확인

### UI/UX 테스트
- [ ] 반응형 디자인 확인
- [ ] 드래그 앤 드롭 기능
- [ ] 다크 모드 (있는 경우)
- [ ] 에러 처리 및 알림

## 🚀 배포 준비

### Vercel 배포
```bash
# 1. GitHub에 코드 푸시
git add .
git commit -m "베타 테스트 준비 완료"
git push origin main

# 2. Vercel에서 프로젝트 import
# https://vercel.com/new

# 3. 환경 변수 설정 (Vercel Dashboard)
# Settings > Environment Variables 에서 추가:
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY  
# - SUPABASE_SERVICE_ROLE_KEY

# 4. 배포 트리거
# git push 또는 Vercel Dashboard에서 수동 배포
```

## 📊 모니터링

### 확인 사항
- [ ] Supabase Dashboard에서 API 호출 모니터링
- [ ] Vercel Analytics에서 성능 확인
- [ ] 브라우저 콘솔에서 에러 확인
- [ ] 네트워크 탭에서 API 응답 확인

## 🐛 문제 해결

### 일반적인 문제
1. **"Invalid API key" 에러**
   - .env.local 파일의 Supabase 키 확인
   - Supabase 프로젝트 URL 확인

2. **"permission denied for schema auth" 에러**
   - setup_rls_policies_fixed.sql 사용 (auth 스키마 대신 public 스키마 사용)

3. **로그인 안됨**
   - Supabase Auth 설정 확인
   - employees 테이블의 auth_user_id 확인

4. **데이터 안보임**
   - RLS 정책 확인
   - tenant_id 일치 확인

## 📝 피드백 수집

베타 테스터 피드백 항목:
- [ ] 로그인 프로세스
- [ ] 스케줄 생성 편의성
- [ ] 드래그 앤 드롭 사용성
- [ ] 모바일 반응형
- [ ] 성능 및 속도
- [ ] 버그 및 에러

---

**Status**: 환경 설정 완료 ✅ | Supabase 설정 대기 중 ⏳