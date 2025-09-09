# ShiftLink 테스트 데이터 설정 가이드

## 🚀 빠른 시작 (5분 소요)

### 1단계: Supabase에서 관리자 계정 생성

1. [Supabase Dashboard](https://supabase.com/dashboard/project/igofcukuimzljtjaxfda/auth/users) 접속
2. **"Invite User"** 버튼 클릭
3. 다음 정보 입력:
   - **Email**: `admin@shiftlink.com`
   - **Password**: `admin123!@#`
4. **"Send Invitation"** 클릭
5. 생성된 사용자의 **User ID (UUID)** 복사

### 2단계: SQL 스크립트 실행

1. [SQL Editor](https://supabase.com/dashboard/project/igofcukuimzljtjaxfda/sql/new) 접속
2. `supabase/seed_simple.sql` 파일 열기
3. **'YOUR-USER-ID-HERE'** 부분을 복사한 User ID로 교체
4. **"Run"** 버튼 클릭

### 3단계: 애플리케이션 실행

```bash
cd shiftlink-app
npm run dev
```

브라우저에서 http://localhost:3000 접속

## 📊 생성되는 테스트 데이터

### 조직 구조
- **병원**: 서울대학교병원
- **팀**: 중환자실 간호팀, 응급실 간호팀, 수술실 간호팀

### 직원 구성 (총 31명)
- **관리자**: 1명 (김관리)
- **수간호사**: 2명 (박수현, 이정희)
- **책임간호사**: 5명
- **일반간호사**: 15명
- **신규간호사**: 8명

### 스케줄 데이터
- **1월 근무표**: 2025년 1월 1일~7일 (전체 직원 배정)
- **교대 패턴**: Day(07:00-15:00), Evening(15:00-23:00), Night(23:00-07:00), Off

### 계층별 인력 배치 규칙
| 계층 | 주간 | 저녁 | 야간 |
|------|------|------|------|
| 수간호사 | 1명 | 0-1명 | 0명 |
| 책임간호사 | 2명 | 1-2명 | 1명 |
| 일반간호사 | 4-5명 | 3-4명 | 2명 |
| 신규간호사 | 1-2명 | 1명 | 0-1명 |

## 🎮 시뮬레이션 기능 테스트

### 로그인
1. http://localhost:3000/login 접속
2. 관리자 계정으로 로그인:
   - Email: `admin@shiftlink.com`
   - Password: `admin123!@#`

### 주요 기능
1. **대시보드** (`/dashboard`)
   - KPI 위젯 확인
   - 오늘 근무 인원 현황
   - 실시간 알림

2. **스케줄 관리** (`/schedules`)
   - 월간 근무표 조회
   - 드래그 앤 드롭으로 근무 변경
   - AI 추천 확인

3. **시뮬레이션** (`/schedules/simulation`)
   - 2월 근무표 시뮬레이션
   - 직원 드래그 앤 드롭
   - 실시간 메트릭 확인

4. **계층 설정** (`/settings/hierarchy`)
   - 계층별 필요 인원 설정
   - 우선순위 조정

5. **모니터링** (`/monitoring`)
   - 피로도 지표
   - 근무시간 집계
   - 팀 균형 리포트

## 🔧 추가 데이터 생성 (선택사항)

더 많은 테스트 데이터가 필요한 경우 `supabase/seed_test_data.sql` 실행:

```sql
-- 추가 생성되는 데이터:
-- - 1월 전체(31일) 근무 스케줄
-- - 휴가 신청 3건
-- - 교환 요청 1건
-- - 2월 시뮬레이션 스케줄
-- - 피로도 메트릭 데이터
-- - 휴가 정책 및 잔액
```

## ⚠️ 주의사항

1. **User ID 교체 필수**: SQL 스크립트의 'YOUR-USER-ID-HERE'를 실제 ID로 교체
2. **순서 중요**: 반드시 Supabase에서 사용자를 먼저 생성한 후 SQL 실행
3. **중복 실행 방지**: 스크립트는 한 번만 실행 (재실행 시 오류 발생 가능)

## 🆘 문제 해결

### "User ID not found" 오류
→ Supabase Dashboard에서 사용자 생성 확인 후 정확한 UUID 복사

### "Duplicate key" 오류
→ 이미 데이터가 존재함. 다음 SQL로 초기화:
```sql
TRUNCATE employees, teams, sites, tenants CASCADE;
```

### 로그인 실패
→ 비밀번호 확인: `admin123!@#` (특수문자 포함)

## 📞 지원

문제가 지속되면 다음 정보와 함께 문의:
- 오류 메시지 스크린샷
- 실행한 SQL 스크립트
- Supabase 프로젝트 ID