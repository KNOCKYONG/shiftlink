# ShiftLink Database Fix PowerShell Script

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "ShiftLink Database Fix Script" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

$password = "rkddkwlvnf0@"
$encodedPassword = "rkddkwlvnf0%40"
$host = "db.igofcukuimzljtjaxfda.supabase.co"
$port = "5432"
$database = "postgres"
$user = "postgres"

# Connection string for psql
$connectionString = "postgresql://${user}:${encodedPassword}@${host}:${port}/${database}"

Write-Host "Checking for psql..." -ForegroundColor Yellow

# Check if psql is available
$psqlPath = Get-Command psql -ErrorAction SilentlyContinue

if ($psqlPath) {
    Write-Host "Found psql. Executing SQL script..." -ForegroundColor Green
    
    # Set environment variable for password
    $env:PGPASSWORD = $password
    
    # Execute the SQL file
    & psql $connectionString -f "FIX_ALL_ERRORS.sql"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "SQL script executed successfully!" -ForegroundColor Green
    } else {
        Write-Host "Error executing SQL script. Exit code: $LASTEXITCODE" -ForegroundColor Red
    }
} else {
    Write-Host "psql not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Options to fix the database:" -ForegroundColor Yellow
    Write-Host "1. Install PostgreSQL client tools from: https://www.postgresql.org/download/windows/" -ForegroundColor White
    Write-Host "2. Or use Supabase SQL Editor:" -ForegroundColor White
    Write-Host "   - Go to: https://supabase.com/dashboard/project/igofcukuimzljtjaxfda/sql" -ForegroundColor Cyan
    Write-Host "   - Copy the contents of FIX_ALL_ERRORS.sql" -ForegroundColor White
    Write-Host "   - Paste and run in the SQL Editor" -ForegroundColor White
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Process completed!" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")