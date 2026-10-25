param (
    [string]$ApiUrl = "http://127.0.0.1:4000",
    [string]$OobUrl = "http://127.0.0.1:5000"
)

$ErrorActionPreference = "Stop"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " NimbusBoard Safe Blind-XSS Listener Check (PS)" -ForegroundColor Cyan
Write-Host " Target API: $ApiUrl" -ForegroundColor Cyan
Write-Host " Listener:   $OobUrl" -ForegroundColor Cyan
Write-Host "=================================================="

try {
    Write-Host "[1] Submitting support feedback event..." -ForegroundColor Yellow
    $headers = @{
        "Content-Type" = "application/json"
        "Authorization" = "Bearer token-mira"
    }
    $body = '{"message":"Local blind-XSS callback verification check via PowerShell"}'
    
    $null = Invoke-RestMethod -Uri "$ApiUrl/api/feedback" -Method Post -Headers $headers -Body $body
    Write-Host "[+] Feedback submitted successfully." -ForegroundColor Green

    Write-Host "[2] Querying local callback listener on $OobUrl..." -ForegroundColor Yellow
    $response = Invoke-WebRequest -Uri "$OobUrl/" -UseBasicParsing
    
    if ($response.Content -match "<pre>([\s\S]*?)<\/pre>") {
        Write-Host "[+] Received Events Log:" -ForegroundColor Green
        Write-Host $matches[1] -ForegroundColor White
    } else {
        Write-Host "[+] Listener responded with HTTP $($response.StatusCode)" -ForegroundColor Green
    }
    Write-Host "[+] Blind XSS workflow listener test PASSED." -ForegroundColor Green
} catch {
    Write-Host "[-] Callback check failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
