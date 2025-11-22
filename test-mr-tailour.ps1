# Test Script for MR.Tailour
# This script helps verify prerequisites and test the document generation service

Write-Host "MR.Tailour Testing Script" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check if backend .env exists
$backendEnvPath = "packages\backend\.env"
$envExists = Test-Path $backendEnvPath

if (-not $envExists) {
    Write-Host "[X] Backend .env file not found at: $backendEnvPath" -ForegroundColor Red
    Write-Host "   Please create it and add OPENAI_API_KEY" -ForegroundColor Yellow
} else {
    Write-Host "[OK] Backend .env file found" -ForegroundColor Green
    
    # Check for OPENAI_API_KEY
    $envContent = Get-Content $backendEnvPath -Raw
    if ($envContent -match "OPENAI_API_KEY\s*=\s*sk-") {
        Write-Host "[OK] OPENAI_API_KEY is configured" -ForegroundColor Green
    } else {
        Write-Host "[X] OPENAI_API_KEY not found or invalid in .env" -ForegroundColor Red
        Write-Host "   Please add: OPENAI_API_KEY=sk-your-key-here" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Checking services..." -ForegroundColor Cyan

# Check if backend is running
$backendRunning = $false
try {
    $backendResponse = Invoke-WebRequest -Uri "http://localhost:4000/api/health" -Method GET -TimeoutSec 2 -ErrorAction Stop
    Write-Host "[OK] Backend server is running on port 4000" -ForegroundColor Green
    $backendRunning = $true
} catch {
    Write-Host "[X] Backend server is NOT running on port 4000" -ForegroundColor Red
    Write-Host "   Start it with: cd packages\backend && npm run dev" -ForegroundColor Yellow
}

# Check if frontend is running
$frontendRunning = $false
try {
    $frontendResponse = Invoke-WebRequest -Uri "http://localhost:3000" -Method GET -TimeoutSec 2 -ErrorAction Stop
    Write-Host "[OK] Frontend server is running on port 3000" -ForegroundColor Green
    $frontendRunning = $true
} catch {
    Write-Host "[X] Frontend server is NOT running on port 3000" -ForegroundColor Red
    Write-Host "   Start it with: cd packages\frontend && npm run dev" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Testing Checklist:" -ForegroundColor Cyan
Write-Host "1. [OK] Backend .env configured with OPENAI_API_KEY" -ForegroundColor $(if ($envExists) { "Green" } else { "Red" })
Write-Host "2. [OK] Backend server running (http://localhost:4000)" -ForegroundColor $(if ($backendRunning) { "Green" } else { "Red" })
Write-Host "3. [OK] Frontend server running (http://localhost:3000)" -ForegroundColor $(if ($frontendRunning) { "Green" } else { "Red" })
Write-Host "4. [ ] User account created and logged in" -ForegroundColor Yellow
Write-Host "5. [ ] Profile completed (skills, experience, education)" -ForegroundColor Yellow
Write-Host "6. [ ] Job saved for testing" -ForegroundColor Yellow
Write-Host "7. [ ] Document generated successfully" -ForegroundColor Yellow

Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Open http://localhost:3000 in your browser" -ForegroundColor White
Write-Host "2. Create an account or log in" -ForegroundColor White
Write-Host "3. Complete your profile (add skills, experience, education)" -ForegroundColor White
Write-Host "4. Save a job to test with" -ForegroundColor White
Write-Host "5. Go to Documents -> Generate Document" -ForegroundColor White
Write-Host "6. Select the job and generate a resume" -ForegroundColor White
Write-Host ""
Write-Host "Full testing guide: TEST_MR_TAILOUR.md" -ForegroundColor Cyan
Write-Host ""

