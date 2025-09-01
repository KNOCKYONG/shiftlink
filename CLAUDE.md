# ShiftLink - 3교대 소통형 스케줄링 SaaS

## 프로젝트 개요
ShiftLink는 3교대 근무 환경에서 근무자와 관리자의 고충을 해결하는 소통형 스케줄링 SaaS입니다.
공정성, 유연성, 실시간 소통을 기반으로 한 자동화된 스케줄링 및 공유 플랫폼을 제공합니다.

## 기술 스택
- **Frontend**: Next.js 14+, React 18, TypeScript 5
- **Styling**: Tailwind CSS, shadcn/ui
- **State Management**: Zustand
- **Data Fetching**: React Query (TanStack Query)
- **Backend**: Supabase (Postgres, Auth, RLS, Realtime, Storage)
- **Deployment**: Vercel (Serverless/Edge/Cron)
- **Email**: Resend/Postmark
- **Messaging**: Kakao BizMessage API
- **Calendar**: iCal, Google Calendar, Outlook
- **Monitoring**: Sentry, Vercel Analytics
- **Testing**: Vitest, Playwright, React Testing Library

## 구현 체크리스트

### Phase 1: 프로젝트 초기 설정 ✅
- [x] Next.js 프로젝트 생성 (TypeScript, App Router)
- [x] 필수 패키지 설치 (Tailwind, shadcn/ui, Zustand, React Query)
- [x] 프로젝트 폴더 구조 설정
- [x] 환경 변수 설정 (.env.local)
- [x] Git 저장소 초기화

### Phase 2: Supabase 설정 ⏳
- [ ] Supabase 프로젝트 생성
- [x] 데이터베이스 스키마 설계 및 생성
  - [x] tenants (테넌트/회사)
  - [x] sites (사업장)
  - [x] teams (팀)
  - [x] employees (직원)
  - [x] rulesets (규칙 설정)
  - [x] shift_templates (교대 템플릿)
  - [x] schedules (스케줄)
  - [x] schedule_assignments (스케줄 배정)
  - [x] leaves (휴가)
  - [x] absences (결근)
  - [x] swap_requests (교환 요청)
  - [x] notifications (알림)
  - [x] audit_logs (감사 로그)
  - [ ] employee_preferences (직원 선호 패턴)
  - [ ] organization_hierarchy (조직 계층 구조)
  - [ ] default_requests (기본 요청사항)
- [x] RLS (Row Level Security) 정책 설정
- [ ] Realtime 구독 설정
- [ ] Storage 버킷 설정

### Phase 3: 인증 시스템 ⏳
- [ ] Supabase Auth 설정
- [ ] 이메일 OTP 로그인 구현
- [ ] Google OAuth 로그인 구현
- [ ] Microsoft OAuth 로그인 구현
- [ ] 로그인/로그아웃 UI 구현
- [ ] 사용자 프로필 관리
- [ ] 권한 관리 (관리자/팀장/근로자)

### Phase 4: 대시보드 UI ⏳
- [ ] 레이아웃 컴포넌트 구현
- [ ] KPI 위젯 컴포넌트
  - [ ] 오늘 근무 인원
  - [ ] 공백 인원
  - [ ] 연속 야간자 수
  - [ ] 초과근로 예상 경고
- [ ] 스케줄 뷰 탭 구현
  - [ ] 표 보기 (그리드)
  - [ ] 캘린더 보기
  - [ ] 반영사항 탭 (로그)
- [ ] 우측 패널
  - [ ] 교환/휴가 요청 리스트
  - [ ] 알림 센터
- [ ] 반응형 디자인 적용

### Phase 5: 스케줄 생성 엔진 ⏳
- [ ] 자동 순환 배정 알고리즘
- [ ] 직원 선호 패턴 반영 로직
  - [ ] 개인별 선호 패턴 (night-day-evening-off)
  - [ ] 조직 계층별 우선순위 설정
- [ ] 조직도 기반 배치 규칙
  - [ ] 레벨별 최소 1명 배치 보장
  - [ ] 계층 우선순위 옵션 (상위/하위 선호 선택)
- [ ] 기본 요청사항 처리
  - [ ] 특정 요일 근무 고정 (예: 대학원생 특정 요일 day)
  - [ ] 사전 휴가 요청 반영
  - [ ] 개인별 제약사항 고려
- [ ] 법규/규칙 검증 로직
  - [ ] 최소 휴식시간 (11시간)
  - [ ] 주 52시간 초과 검증
  - [ ] 연속 야간 근무 제한
- [ ] 공정성 점수 계산
- [ ] 변수 발생 시 재배치 로직
- [ ] 대체 인력 추천 시스템
- [ ] API 엔드포인트 구현
  - [ ] POST /api/schedules/generate
  - [ ] PATCH /api/schedules/{id}

### Phase 6: 교환/트레이드 기능 ⏳
- [ ] 교환 요청 UI
- [ ] 교환 대상 선택 및 자동 제안
- [ ] 승인 워크플로우
  - [ ] 직원 요청
  - [ ] 상대방 수락
  - [ ] 관리자 승인
- [ ] 규칙 검증 후 반영
- [ ] API 엔드포인트 구현
  - [ ] POST /api/swaps
  - [ ] PATCH /api/swaps/{id}/accept
  - [ ] PATCH /api/swaps/{id}/approve
  - [ ] PATCH /api/swaps/{id}/reject

### Phase 7: 휴가/결근 관리 ⏳
- [ ] 휴가 신청 폼
- [ ] 결근 처리 로직
- [ ] 스케줄 자동 재배치
- [ ] API 엔드포인트 구현
  - [ ] POST /api/leaves
  - [ ] POST /api/absences

### Phase 8: 모니터링 & 리포트 ⏳
- [ ] 직원별 근무시간 집계
- [ ] 연속 야간 근무 모니터링
- [ ] 피로도 지표 계산
- [ ] 팀별 숙련도/연차 균형 리포트
- [ ] 대시보드 차트 구현

### Phase 9: 공유 기능 ⏳
- [ ] 이메일 발송
  - [ ] PDF 생성
  - [ ] CSV 내보내기
  - [ ] ICS 파일 생성
- [ ] 카카오톡 알림톡 연동
- [ ] 캘린더 연동
  - [ ] iCal 구독 피드
  - [ ] Google Calendar API
  - [ ] Outlook 연동
- [ ] API 엔드포인트 구현
  - [ ] POST /api/share/email
  - [ ] POST /api/share/kakao
  - [ ] GET /api/ical/:token

### Phase 10: 설정 관리 ⏳
- [ ] 제약 옵션 UI
  - [ ] ON/OFF 토글
  - [ ] 값 조정 (슬라이더/입력)
- [ ] 테넌트별 설정 저장
- [ ] 시뮬레이션 기능
- [ ] 기본값 관리

### Phase 11: 알림 시스템 ⏳
- [ ] 실시간 알림 (Supabase Realtime)
- [ ] 이메일 알림
- [ ] 푸시 알림 (PWA)
- [ ] 알림 히스토리

### Phase 12: 테스트 ⏳
- [ ] 단위 테스트 (Vitest)
  - [ ] 스케줄 생성 엔진
  - [ ] 규칙 검증 로직
  - [ ] API 핸들러
- [ ] 통합 테스트
- [ ] E2E 테스트 (Playwright)
  - [ ] 로그인 플로우
  - [ ] 스케줄 생성
  - [ ] 교환 요청
- [ ] 성능 테스트
  - [ ] 30명/1개월 스케줄 < 30초
  - [ ] 근무표 조회 < 2초

### Phase 13: 배포 & 최적화 ⏳
- [ ] Vercel 프로젝트 설정
- [ ] 환경 변수 설정
- [ ] Edge Functions 설정
- [ ] Cron Jobs 설정
  - [ ] 공휴일 반영
  - [ ] 리마인더 발송
- [ ] 성능 최적화
  - [ ] 이미지 최적화
  - [ ] 코드 스플리팅
  - [ ] 캐싱 전략
- [ ] SEO 최적화
- [ ] PWA 설정

### Phase 14: 모니터링 & 관측성 ⏳
- [ ] Sentry 에러 추적 설정
- [ ] Vercel Analytics 설정
- [ ] 커스텀 메트릭 추가
- [ ] 감사 로그 시스템

## 수락 기준
- ✅ 30명/1개월 스케줄 자동생성 < 30초
- ✅ 충돌 없는 배정률 ≥ 98%
- ✅ 근무표 조회 < 2초 (12개월 뷰 기준)
- ✅ 모든 제약 옵션화, 테넌트별 저장 가능
- ✅ 이메일·카카오·캘린더 공유 가능
- ✅ 감사 로그 전 구간 기록

## 디렉토리 구조
```
shiftlink/
├── app/                    # Next.js App Router
│   ├── (auth)/            # 인증 관련 페이지
│   ├── (dashboard)/       # 대시보드 페이지
│   ├── api/               # API 라우트
│   └── layout.tsx         # 루트 레이아웃
├── components/            # React 컴포넌트
│   ├── ui/               # shadcn/ui 컴포넌트
│   ├── dashboard/        # 대시보드 컴포넌트
│   ├── schedule/         # 스케줄 관련 컴포넌트
│   └── shared/           # 공통 컴포넌트
├── lib/                   # 유틸리티 함수
│   ├── supabase/         # Supabase 클라이언트
│   ├── scheduler/        # 스케줄 엔진
│   └── utils/            # 헬퍼 함수
├── hooks/                 # 커스텀 React 훅
├── stores/               # Zustand 스토어
├── types/                # TypeScript 타입 정의
├── styles/               # 글로벌 스타일
└── tests/                # 테스트 파일
```

## 환경 변수
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=

# Email
RESEND_API_KEY=

# Kakao
KAKAO_BIZ_MESSAGE_API_KEY=

# Calendar
GOOGLE_CALENDAR_API_KEY=

# Monitoring
SENTRY_DSN=
```

## 주요 명령어
```bash
# 개발 서버 실행
npm run dev

# 빌드
npm run build

# 프로덕션 실행
npm start

# 테스트
npm test
npm run test:e2e

# 린트
npm run lint

# 타입 체크
npm run type-check
```

## 비즈니스 요구사항

### 직원 선호 패턴 관리
- **선호 근무 패턴**: 각 직원은 개인별 선호 패턴 설정 가능
  - 예시: night → day → evening → off (4일 주기)
  - 패턴은 커스터마이징 가능하며 직원별로 다르게 설정
  - 스케줄 생성 시 최대한 선호 패턴 반영

### 조직 계층 구조 관리
- **필수 조직도**: 회사별 조직 계층 구조 정의
  - 각 레벨별 역할 정의 (예: 팀장, 시니어, 주니어)
  - **핵심 규칙**: 각 근무 시간대에 모든 레벨에서 최소 1명씩 배치
  - 조직 안정성과 업무 연속성 보장
- **우선순위 충돌 해결**:
  - 선호 패턴이 충돌할 경우 어느 레벨을 우선할지 설정 가능
  - 옵션: 상위 레벨 우선 / 하위 레벨 우선 / 균등 분배

### 기본 요청사항 (Default Requests)
- **고정 근무 요청**:
  - 특정 직원의 특정 요일 근무 시간 고정
  - 예: 대학원생은 매주 화/목 Day 근무 고정
- **사전 휴가 요청**:
  - 직원이 미리 특정 날짜 휴가 신청 가능
  - 스케줄 생성 시 자동 반영
- **개인별 제약사항**:
  - 건강상 이유로 야간 근무 제한
  - 육아 등으로 특정 시간대 근무 불가
  - 자격증/교육 일정으로 인한 제약

### 데이터 모델 확장
```sql
-- 직원 선호 패턴 테이블
employee_preferences:
  - employee_id: UUID (FK to employees)
  - preference_pattern: JSON (예: ["night", "day", "evening", "off"])
  - priority: INTEGER (우선순위)
  - effective_from: DATE
  - effective_to: DATE (NULL 가능)

-- 조직 계층 구조 테이블
organization_hierarchy:
  - id: UUID
  - tenant_id: UUID (FK to tenants)
  - level: INTEGER (1=최상위)
  - role_name: VARCHAR
  - min_required: INTEGER (최소 필요 인원)
  - priority_on_conflict: ENUM('higher', 'lower', 'balanced')

-- 기본 요청사항 테이블
default_requests:
  - id: UUID
  - employee_id: UUID (FK to employees)
  - request_type: ENUM('fixed_shift', 'leave', 'constraint')
  - day_of_week: INTEGER (0-6, NULL 가능)
  - specific_date: DATE (NULL 가능)
  - shift_type: VARCHAR (day/evening/night/off)
  - reason: TEXT
  - priority: INTEGER
  - is_recurring: BOOLEAN
```

## 참고 문서
- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [shadcn/ui](https://ui.shadcn.com)
- [Vercel Documentation](https://vercel.com/docs)

---

*이 문서는 ShiftLink 프로젝트의 구현 가이드이며, 각 단계별로 체크박스를 통해 진행 상황을 추적합니다.*