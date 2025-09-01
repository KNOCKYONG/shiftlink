@echo off
echo Setting up Supabase MCP...
echo.
echo Please enter your Supabase Personal Access Token:
echo (Get it from: https://supabase.com/dashboard/account/tokens)
echo.
set /p SUPABASE_TOKEN="Token: "

echo.
echo Testing Supabase MCP connection...
set SUPABASE_ACCESS_TOKEN=%SUPABASE_TOKEN%

npx -y @supabase/mcp-server-supabase@latest --read-only --project-ref=igofcukuimzljtjaxfda list-tables

if %ERRORLEVEL% EQU 0 (
    echo.
    echo SUCCESS: Supabase MCP is working!
    echo.
    echo Next steps:
    echo 1. Restart Claude Desktop
    echo 2. When prompted, enter this token: %SUPABASE_TOKEN%
) else (
    echo.
    echo ERROR: Failed to connect to Supabase
    echo Please check your token and try again
)

pause