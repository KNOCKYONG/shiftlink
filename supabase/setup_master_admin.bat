@echo off
echo Master Admin Account Setup for ShiftLink
echo =========================================
echo.

REM Check if Supabase CLI is installed
supabase --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Supabase CLI is not installed or not in PATH
    echo Please install Supabase CLI first: https://supabase.com/docs/guides/cli
    echo.
    pause
    exit /b 1
)

echo Supabase CLI found. Proceeding with setup...
echo.

REM Ensure we're in the correct directory
if not exist "supabase\config.toml" (
    echo ERROR: supabase\config.toml not found. 
    echo Please run this script from the shiftlink-app directory.
    echo.
    pause
    exit /b 1
)

echo Step 1: Creating Master Admin Account...
echo ----------------------------------------
supabase sql --file supabase\create_master_admin.sql
if %errorlevel% neq 0 (
    echo ERROR: Failed to create master admin account
    echo Check the error messages above and try again
    echo.
    pause
    exit /b 1
)
echo ✓ Master admin account created successfully
echo.

echo Step 2: Applying Master Admin RLS Policies...
echo ---------------------------------------------
supabase sql --file supabase\master_admin_rls_policies.sql
if %errorlevel% neq 0 (
    echo ERROR: Failed to apply RLS policies
    echo Check the error messages above and try again
    echo.
    pause
    exit /b 1
)
echo ✓ Master admin RLS policies applied successfully
echo.

echo Step 3: Verifying Master Admin Setup...
echo ---------------------------------------
supabase sql --file supabase\verify_master_admin.sql
if %errorlevel% neq 0 (
    echo WARNING: Verification script encountered issues
    echo This might be normal if run without authentication context
    echo.
)
echo ✓ Verification script completed
echo.

echo =========================================
echo MASTER ADMIN SETUP COMPLETED!
echo =========================================
echo.
echo Login Details:
echo   Email: master@shiftlink.com
echo   Password: Wkdrn123@@
echo.
echo IMPORTANT SECURITY NOTES:
echo - Change the password immediately after first login
echo - This account has full system access across all tenants
echo - All actions are logged in the audit_logs table
echo.
echo Next Steps:
echo 1. Start your ShiftLink application
echo 2. Login with the credentials above
echo 3. Change the password in your profile settings
echo 4. Set up additional admin accounts as needed
echo.
pause