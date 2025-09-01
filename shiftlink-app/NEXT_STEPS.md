# 🎯 ShiftLink - 다음 단계 가이드

## ✅ 완료된 작업
- ✅ 데이터베이스 스키마 배포 (25개 테이블)
- ✅ Supabase 프로젝트 연결
- ✅ Next.js 기본 설정
- ✅ Supabase 클라이언트 설정

## 🔑 API 키 설정 (필수!)

### 1. Supabase Dashboard에서 키 가져오기
👉 **[Settings > API 페이지](https://app.supabase.com/project/igofcukuimzljtjaxfda/settings/api)**

### 2. .env.local 파일 업데이트
```env
NEXT_PUBLIC_SUPABASE_URL=https://igofcukuimzljtjaxfda.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon key 여기에 붙여넣기]
SUPABASE_SERVICE_ROLE_KEY=[service_role key 여기에 붙여넣기]
```

## 🧪 연결 테스트

### 1. 개발 서버 실행
```bash
cd shiftlink-app
npm run dev
```

### 2. 데이터베이스 연결 테스트
브라우저에서 접속: http://localhost:3000/api/test-db

성공 시 다음과 같은 응답:
```json
{
  "success": true,
  "message": "Database connected successfully!",
  "stats": {
    "tenants_count": 0,
    "tables_created": 25,
    "connection": "Active"
  }
}
```

## 📱 구현 순서 (권장)

### Phase 1: 인증 시스템 (1-2일)
1. **로그인 페이지** (`app/(auth)/login/page.tsx`)
   - 이메일/비밀번호 로그인
   - Google OAuth (선택)
   
2. **회원가입** (`app/(auth)/signup/page.tsx`)
   - 회사(tenant) 생성
   - 관리자 계정 생성

3. **미들웨어** (`middleware.ts`)
   - 인증 체크
   - 리다이렉션 처리

### Phase 2: 대시보드 UI (2-3일)
1. **레이아웃** (`app/(dashboard)/layout.tsx`)
   - 사이드바
   - 헤더
   - 네비게이션

2. **메인 대시보드** (`app/(dashboard)/page.tsx`)
   - KPI 위젯
   - 오늘의 근무 현황
   - 알림 센터

3. **스케줄 뷰어** (`app/(dashboard)/schedule/page.tsx`)
   - 월간 캘린더 뷰
   - 표 형식 뷰
   - 필터/검색

### Phase 3: 스케줄 생성 엔진 (3-4일)
1. **스케줄 생성 API** (`app/api/schedules/generate/route.ts`)
   - 자동 배정 알고리즘
   - 규칙 검증
   - 공정성 계산

2. **스케줄 편집기** (`app/(dashboard)/schedule/editor/page.tsx`)
   - 드래그 앤 드롭
   - 수동 조정
   - 충돌 검사

### Phase 4: 교환/휴가 관리 (2-3일)
1. **교환 요청** (`app/(dashboard)/swaps/page.tsx`)
   - 요청 생성
   - 승인 워크플로우

2. **휴가 관리** (`app/(dashboard)/leaves/page.tsx`)
   - 휴가 신청
   - 캘린더 연동

### Phase 5: 공유 기능 (1-2일)
1. **이메일 발송**
2. **카카오톡 알림**
3. **캘린더 연동**

## 🛠️ 유용한 도구

### Supabase 관리
- **[Table Editor](https://app.supabase.com/project/igofcukuimzljtjaxfda/editor)** - 데이터 관리
- **[SQL Editor](https://app.supabase.com/project/igofcukuimzljtjaxfda/sql)** - SQL 실행
- **[Auth Users](https://app.supabase.com/project/igofcukuimzljtjaxfda/auth/users)** - 사용자 관리
- **[Logs](https://app.supabase.com/project/igofcukuimzljtjaxfda/logs/explorer)** - 로그 확인

### 개발 명령어
```bash
# 개발 서버
npm run dev

# 타입 체크
npm run type-check

# 린트
npm run lint

# 빌드
npm run build
```

## 📚 참고 자료
- [Supabase Docs](https://supabase.com/docs)
- [Next.js App Router](https://nextjs.org/docs/app)
- [shadcn/ui Components](https://ui.shadcn.com)
- [Zustand](https://github.com/pmndrs/zustand)

## 🆘 도움이 필요하면
1. 에러 메시지와 함께 문의
2. `CLAUDE.md` 파일 참조
3. Supabase Dashboard 로그 확인

---

**다음 작업을 시작할 준비가 되면 알려주세요!**