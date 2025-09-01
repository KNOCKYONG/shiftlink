# Update Claude Desktop config with Supabase token

$configPath = "$env:APPDATA\Claude\claude_desktop_config.json"

Write-Host "Updating Claude Desktop configuration..." -ForegroundColor Cyan
Write-Host ""

# Read current config
$config = Get-Content $configPath | ConvertFrom-Json

# Prompt for token
Write-Host "Enter your Supabase Personal Access Token:" -ForegroundColor Yellow
Write-Host "(Get it from: https://supabase.com/dashboard/account/tokens)" -ForegroundColor Gray
$token = Read-Host "Token"

# Update the token in environment variable
if ($config.mcpServers.supabase) {
    # Create a new config with the token directly in env
    $config.mcpServers.supabase.env = @{
        "SUPABASE_ACCESS_TOKEN" = $token
    }
    
    # Save updated config
    $config | ConvertTo-Json -Depth 10 | Set-Content $configPath
    
    Write-Host ""
    Write-Host "SUCCESS: Configuration updated!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Please restart Claude Desktop for changes to take effect." -ForegroundColor Yellow
} else {
    Write-Host "ERROR: Supabase MCP server not found in config!" -ForegroundColor Red
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")