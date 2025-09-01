# ShiftLink — 3교대 소통형 스케줄링 SaaS PRD

## 1. 개요
ShiftLink는 **3교대 근무 환경**에서 근무자와 관리자의 고충을 해결하는 **소통형 스케줄링 SaaS**입니다.  
목표는 **공정성, 유연성, 실시간 소통**을 기반으로 한 자동화된 스케줄링 및 공유 플랫폼을 제공하는 것입니다.

---

## 2. 핵심 목표
- 규칙 기반 자동 배정 + 수동 보정 + 충돌 감지
- 근무자 간 트레이드(교환) + 휴가/결근 실시간 반영
- 직원별 피로도 및 편중 모니터링
- 근무표 공유: 이메일, 카카오톡, 캘린더(iCal/Google/Outlook)
- 모든 제약 조건 옵션화 → 회사별 맞춤 설정 가능

---

## 3. 사용자 페르소나
- **관리자/인사 담당자**: 규칙 설정, 인력 배정, 승인, 모니터링
- **팀장/현장관리자**: 스왑 요청 승인, 공지, 팀원 관리
- **근로자**: 근무표 확인, 스왑 요청, 휴가 신청, 알림 수신

---

## 4. 예상 변수
- 인력 변동: 입사, 퇴사, 팀 이동
-突발 결근/오프: 병가, 긴급 일정
- 연속 야간 근무 편중
- 숙련도/연차 불균형
- 법규 위반 (주 52시간 초과, 최소 휴식 미준수)
- 교육/파견 일정 충돌
- 공휴일/특근일 반영 필요

---

## 5. 주요 기능
1. **스케줄 생성 엔진**
   - 자동 순환 배정 (편중 최소화)
   - 법규/규칙 자동 검증
   - 변수 발생 시 재배치 및 대체 인력 추천
2. **스왑/트레이드**
   - 직원 간 교환 요청 → 상대방 수락 → 관리자 승인
   - 규칙 검증 후 승인 반영
3. **모니터링**
   - 직원별 근무시간, 연속 야간, 피로도 지표 제공
   - 팀별 숙련도·연차 균형 리포트
4. **UI/UX**
   - [표 보기] [캘린더] [반영사항] 탭 제공
   - 실시간 반영 및 드래그&드롭 수정
   - 대시보드 위젯: 공백 인원, 편중도, 초과근로 경고
5. **공유 기능**
   - 이메일: PDF/CSV/ICS 첨부
   - 카카오톡 알림톡/친구톡
   - iCal/Google/Outlook 연동
   - 개인별 맞춤 근무표 뷰 제공
6. **알림/로그**
   - 승인/변경/경고 실시간 알림
   - 모든 활동 감사 로그 기록

---

## 6. 제약 옵션화
- 모든 규칙 ON/OFF 가능 및 값 조정
- 테넌트별 설정 저장
- 기본값: 한국 근로기준법 + 업종 표준

예시(JSON):
```json
{
  "min_rest_hours": {"enabled": true, "value": 11},
  "max_week_hours": {"enabled": true, "value": 52},
  "max_consec_nights": {"enabled": true, "value": 3},
  "fairness": {"enabled": true, "target_score": 0.7},
  "preferences": {"enabled": true},
  "public_holidays": {"enabled": true, "source": "KR"}
}
```

---

## 7. 기술 스택
- **프론트엔드**: Next.js(React, TypeScript), Tailwind, shadcn/ui, Zustand, React Query
- **백엔드/데이터**: Supabase(Postgres + Auth + RLS + Realtime + Storage)
- **배포**: Vercel(Serverless/Edge/Cron)
- **통합**: Resend/Postmark(이메일), Kakao BizMessage API, iCal/Google/Outlook 캘린더
- **관측성**: Sentry, Vercel Analytics
- **테스트**: Vitest, Playwright, Testing Library

---

## 8. 데이터 모델 (핵심)
- tenants, sites, teams, employees
- rulesets (모든 제약 옵션화 가능)
- shift_templates, patterns
- schedules, schedule_assignments
- leaves, absences, trainings
- swap_requests
- notifications, integrations, audit_logs

---

## 9. API 예시
- `POST /api/schedules/generate` — 자동 스케줄 생성
- `PATCH /api/schedules/{id}` — 단건 수정
- `POST /api/swaps` → `PATCH /api/swaps/{id}/accept|approve|reject`
- `POST /api/leaves` — 휴가 신청
- `GET /api/ical/:token` — iCal 구독 피드
- `POST /api/share/email`, `POST /api/share/kakao`

---

## 10. 아키텍처 개요
1. **웹앱 (Next.js/Vercel)** → UI 제공 (표·캘린더 뷰, 반영사항 탭)
2. **API 계층** (Next Route Handlers) → Supabase 호출
3. **스케줄 엔진**: 휴리스틱 기반, 재배치/대체 추천 포함
4. **Edge Function**: 트레이드/결근 처리, 알림/로그 저장
5. **Cron Job**: 공휴일 반영, 리마인더 발송

---

## 11. 수락 기준
- 30명/1개월 스케줄 자동생성 < 30초
- 충돌 없는 배정률 ≥ 98%
- 근무표 조회 < 2초 (12개월 뷰 기준)
- 모든 제약 옵션화, 테넌트별 저장 가능
- 이메일·카카오·캘린더 공유 가능
- 감사 로그 전 구간 기록

---

## 12. 브랜드 & 디자인
- **브랜드명**: ShiftLink
- **의미**: Shift(교대) + Link(연결, 소통)
- **슬로건**: "교대를 잇다, 사람을 잇다"
- **로고 컨셉**: 링크 체인 + 캘린더 + 시계 통합 아이콘

---

## 13. 향후 확장
- AI 기반 수요 예측 & 자동 최적화
- 업종별 교대 템플릿 마켓플레이스
- 건강 관리 지표(수면/스트레스) 연계
- 근태/급여 시스템 통합 (Enterprise 플랜)
