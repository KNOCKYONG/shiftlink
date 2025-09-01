@echo off
echo ================================================
echo ShiftLink Database Fix Script
echo ================================================
echo.

set PGPASSWORD=rkddkwlvnf0@
set DATABASE_URL=postgresql://postgres:rkddkwlvnf0@@db.igofcukuimzljtjaxfda.supabase.co:5432/postgres

echo Connecting to Supabase database...
echo.

REM Try using psql if available
where psql >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo Using psql to execute SQL...
    psql "postgresql://postgres:rkddkwlvnf0%%40@db.igofcukuimzljtjaxfda.supabase.co:5432/postgres" -f FIX_ALL_ERRORS.sql
) else (
    echo psql not found. Please install PostgreSQL client tools.
    echo.
    echo Alternative: You can copy the contents of FIX_ALL_ERRORS.sql
    echo and paste it directly into Supabase SQL Editor at:
    echo https://supabase.com/dashboard/project/igofcukuimzljtjaxfda/sql
)

echo.
echo ================================================
echo Process completed!
echo ================================================
pause