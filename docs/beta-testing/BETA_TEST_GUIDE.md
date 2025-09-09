# ShiftLink 베타 테스트 가이드

## 🚀 베타 테스트 환경 준비 완료

### ✅ 완료된 설정

1. **데이터베이스 구조**
   - 모든 필수 테이블 생성 완료
   - 테스트 데이터 생성 완료 (한국대학교병원)
   - A팀, B팀 각 20명 직원 데이터

2. **보안 설정**
   - Row Level Security (RLS) 정책 설정 완료
   - 역할 기반 접근 제어 구현
   - 테넌트별 데이터 격리

3. **프로젝트 구조**
   - Next.js 14 프로젝트 설정
   - 필수 의존성 설정 완료
   - TypeScript, Tailwind CSS 설정

## 📋 베타 테스트 시작하기

### 1. 의존성 설치

```bash
cd shiftlink-app
npm install
```

### 2. 환경 변수 설정

`.env.local` 파일에 다음 정보를 설정하세요:

```env
# Supabase 설정 (필수)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# 앱 설정
NEXT_PUBLIC_APP_URL=http://localhost:3003
NEXT_PUBLIC_APP_NAME=ShiftLink
```

### 3. 데이터베이스 설정

Supabase SQL Editor에서 다음 순서로 실행:

1. `supabase/1_add_enum_values.sql` - shift_type enum 확장
2. `supabase/add_shift_types_and_setup.sql` - 테스트 데이터 생성
3. `supabase/setup_rls_policies.sql` - 보안 정책 설정

### 4. 인증 설정

Supabase Dashboard에서:

1. **Authentication → Providers**
   - Email/Password 활성화
   
2. **Authentication → Users**
   - 관리자 계정 생성:
     - Email: `admin@shiftlink.kr`
     - Password: 설정하신 비밀번호
   
3. **SQL Editor에서 auth_user_id 연결**:

```sql
-- 생성된 auth user의 ID를 복사한 후 실행
UPDATE employees 
SET auth_user_id = 'auth-user-id-here'
WHERE email = 'admin@shiftlink.kr';
```

### 5. 로컬 개발 서버 실행

```bash
npm run dev
```

브라우저에서 http://localhost:3003 접속

## 🧪 테스트 시나리오

### 1. 관리자 로그인
- Email: `admin@shiftlink.kr`
- Password: 설정하신 비밀번호

### 2. 주요 기능 테스트

#### 스케줄 관리
- [ ] 2025년 9월 스케줄 생성
- [ ] 직원 배치 (드래그 앤 드롭)
- [ ] 계층별 필수 인원 확인
- [ ] 직원 선호도 반영 확인

#### 팀 비교
- [ ] A팀 (다양한 선호도) 스케줄 생성
- [ ] B팀 (주간 집중) 스케줄 생성
- [ ] 우선순위 처리 방식 비교

#### 권한 테스트
- [ ] 관리자 권한 기능 확인
- [ ] 일반 직원 권한 제한 확인
- [ ] 데이터 격리 확인

## 🚀 배포하기

### Vercel 배포

1. [Vercel](https://vercel.com) 계정 생성
2. GitHub 저장소 연결
3. 환경 변수 설정
4. 배포 시작

```bash
# Vercel CLI 사용 시
npm i -g vercel
vercel
```

### 환경 변수 설정 (Vercel Dashboard)

프로젝트 Settings → Environment Variables에서:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## 📊 테스트 데이터 구조

### 팀 구성
- **중환자실 A팀**: 다양한 선호도 분포 (20명)
  - 수간호사: 2명
  - 책임간호사: 3명
  - 일반간호사: 9명
  - 신규간호사: 6명

- **중환자실 B팀**: 주간 집중 선호 (20명)
  - 동일한 계층 구조
  - 80% 주간 선호
  - 90% 야간 회피

### 근무 템플릿
- 주간 근무 (07:00-15:00)
- 저녁 근무 (15:00-23:00)
- 야간 근무 (23:00-07:00)
- 휴무
- 연차
- 병가
- 교육

## 🔒 보안 정책

### RLS (Row Level Security)
- 테넌트별 데이터 격리
- 역할 기반 접근 제어
- 자기 정보만 수정 가능
- 관리자/매니저 특별 권한

### 권한 레벨
1. **Admin**: 모든 권한
2. **Manager**: 팀 관리, 스케줄 생성
3. **Employee**: 자기 정보 조회/수정

## 🐛 문제 해결

### 일반적인 문제

1. **로그인 안됨**
   - Supabase Auth 설정 확인
   - auth_user_id 연결 확인

2. **데이터 안보임**
   - RLS 정책 확인
   - tenant_id 일치 확인

3. **빌드 에러**
   - 의존성 재설치: `npm install`
   - 캐시 삭제: `rm -rf .next`

## 📝 피드백

베타 테스트 중 발견한 문제나 개선 사항을 알려주세요:
- 이슈 등록
- 개선 제안
- 사용성 피드백

---

**준비 완료!** 이제 베타 테스트를 시작할 수 있습니다. 🎉