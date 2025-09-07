# Supabase MCP Server 설정 가이드

## 1. MCP 설정 파일 생성

Claude Desktop의 설정 파일을 열어서 Supabase MCP 서버를 추가해야 합니다.

### Windows 설정 파일 위치:
`%APPDATA%\Claude\claude_desktop_config.json`

### 설정 파일 내용 추가 (읽기/쓰기 모두 허용):
```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-supabase"
      ],
      "env": {
        "SUPABASE_URL": "YOUR_SUPABASE_PROJECT_URL",
        "SUPABASE_SERVICE_ROLE_KEY": "YOUR_SUPABASE_SERVICE_ROLE_KEY"
      }
    }
  }
}
```

> 주의: Service Role Key는 데이터베이스의 RLS를 우회하므로 쓰기 작업이 모두 가능합니다. 반드시 로컬/안전한 환경에서만 사용하고 키를 외부에 유출하지 마세요.

### Windows용 Supabase 공식 MCP 서버(프로젝트 API 토큰 기반) 예시:
```json
{
  "mcpServers": {
    "supabase": {
      "command": "cmd",
      "args": [
        "/c",
        "npx",
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--project-ref=YOUR_PROJECT_REF"
      ],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "YOUR_SUPABASE_ACCESS_TOKEN"
      }
    }
  }
}
```
이 서버는 관리 API 토큰으로 동작합니다. SQL 실행 등 쓰기 작업이 가능하지만, 권한 범위는 토큰에 따라 달라질 수 있습니다. 일반적으로 테이블 데이터 조작은 `@modelcontextprotocol/server-supabase`(Service Role) 방식이 더 직접적입니다.

## 2. Supabase 프로젝트 정보 얻기

1. [Supabase Dashboard](https://supabase.com/dashboard)에 로그인
2. 프로젝트 선택 또는 새 프로젝트 생성
3. Project Settings > API 섹션에서:
   - **Project URL**: `https://YOUR_PROJECT_ID.supabase.co`
   - **Service Role Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6...` (service_role 키 사용)

## 3. 환경 변수 설정

`.env.local` 파일에도 같은 정보 추가:
```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

또는 MCP 설정 파일의 env 섹션에 직접 값을 기입할 수 있습니다. 보안상 .env를 사용하고 MCP 호스트에서 env를 주입하는 방식을 권장합니다.

## 4. Claude Desktop 재시작

1. Claude Desktop 완전 종료
2. 다시 실행
3. `/mcp` 명령으로 연결 확인

## 5. MCP 서버 테스트

연결 성공 후 사용 가능한 명령어:
- `mcp_supabase_list_tables` - 테이블 목록 확인
- `mcp_supabase_execute_sql` - SQL 실행
- `mcp_supabase_select` - 데이터 조회

## 문제 해결

### MCP 서버가 표시되지 않는 경우:
1. `/doctor` 명령 실행
2. 설정 파일 경로 확인
3. JSON 형식 검증
4. Claude Desktop 재시작

### 연결 오류가 발생하는 경우:
1. Supabase URL과 키가 올바른지 확인
2. Service Role Key를 사용하고 있는지 확인 (anon key 아님)
3. 네트워크 연결 확인

## 참고 자료
- [Claude MCP Documentation](https://docs.anthropic.com/en/docs/claude-code/mcp)
- [Supabase MCP Server](https://github.com/modelcontextprotocol/servers/tree/main/src/supabase)
