# Supabase MCP Server 설정 가이드

## 1. MCP 설정 파일 생성

Claude Desktop의 설정 파일을 열어서 Supabase MCP 서버를 추가해야 합니다.

### Windows 설정 파일 위치:
`%APPDATA%\Claude\claude_desktop_config.json`

### 설정 파일 내용 추가:
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