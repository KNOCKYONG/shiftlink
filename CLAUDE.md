# ShiftLink 프로젝트 개발 가이드라인

## 코드 제거 원칙

**🚨 중요: 기능을 없애달라고 요청할 때는 완전히 삭제**

### 필수 규칙
- 주석 처리나 비활성화하지 말고 관련 코드를 완전히 삭제
- throw Error로 비활성화하지 말고 함수 자체를 제거
- 관련된 import문, 타입 정의, 참조 코드 모두 제거
- 삭제 후 코드가 깔끔하게 정리되어야 함

## 데이터 저장 원칙

**🚨 중요: 모든 데이터 저장은 반드시 Supabase와 연동되어야 합니다**

### 필수 규칙
- localStorage는 절대 사용하지 않음
- 모든 사용자 데이터는 Supabase 데이터베이스에 저장
- 설정, 스케줄, 사용자 정보 등 모든 데이터는 서버 사이드 저장
- 클라이언트 사이드는 임시 캐싱만 허용

### Supabase 테이블 구조

#### schedule_configurations 테이블
```sql
create table schedule_configurations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  user_id uuid references auth.users(id) on delete cascade,
  tenant_id uuid references tenants(id) on delete cascade,
  config jsonb not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
```

### 개발 시 주의사항
- 새로운 데이터 저장 기능 구현 시 반드시 Supabase API 사용
- localStorage, sessionStorage 등 클라이언트 저장소 사용 금지
- 데이터 영속성과 공유를 위해 서버 사이드 저장소만 사용

## 코딩 스타일
- TypeScript 사용
- shadcn/ui 컴포넌트 활용
- Next.js 14 App Router 패턴 준수
- Supabase 클라이언트 사용 시 적절한 에러 핸들링 필수