# GiveMeJobs - Stop All Services

Write-Host "================================" -ForegroundColor Cyan
Write-Host "🛑 Stopping GiveMeJobs Services" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "🐳 Stopping Docker services..." -ForegroundColor Yellow
docker-compose down

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ All Docker services stopped" -ForegroundColor Green
} else {
    Write-Host "⚠️  Some services may still be running" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "💡 Note: Backend and Frontend servers (if running in separate windows)" -ForegroundColor Yellow
Write-Host "   need to be closed manually by closing their PowerShell windows." -ForegroundColor Yellow
Write-Host ""
Write-Host "✅ Done!" -ForegroundColor Green
Write-Host ""
