param (
    [string]$ApiUrl = "http://127.0.0.1:4000"
)

$ErrorActionPreference = "Stop"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " NimbusBoard Lab State Reset (PowerShell)" -ForegroundColor Cyan
Write-Host " Target API: $ApiUrl" -ForegroundColor Cyan
Write-Host "=================================================="

try {
    $headers = @{
        "Content-Type" = "application/json"
        "Authorization" = "Bearer token-ari"
    }
    $body = '{"reason":"powershell_script_reset"}'
    
    $response = Invoke-RestMethod -Uri "$ApiUrl/lab/reset" -Method Post -Headers $headers -Body $body
    Write-Host "[+] Reset Response: $($response | ConvertTo-Json -Compress)" -ForegroundColor Green
    Write-Host "[+] Lab database successfully restored to predictable seed state." -ForegroundColor Green
} catch {
    Write-Host "[-] Reset failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
