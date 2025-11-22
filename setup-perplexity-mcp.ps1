# Setup Perplexity MCP Server
# This script installs the required dependencies for the Perplexity MCP server

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Perplexity MCP Server Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Python is installed
Write-Host "Checking Python installation..." -ForegroundColor Yellow
$pythonVersion = python --version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "Success: Python found: $pythonVersion" -ForegroundColor Green
} else {
    Write-Host "Error: Python not found. Please install Python 3.8 or higher." -ForegroundColor Red
    exit 1
}

# Check if pip is installed
Write-Host "Checking pip installation..." -ForegroundColor Yellow
$pipVersion = pip --version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "Success: pip found: $pipVersion" -ForegroundColor Green
} else {
    Write-Host "Error: pip not found. Please install pip." -ForegroundColor Red
    exit 1
}

# Install required packages
Write-Host ""
Write-Host "Installing required Python packages..." -ForegroundColor Yellow
Write-Host ""

pip install -r perplexity_mcp_requirements.txt
if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Success: Packages installed successfully" -ForegroundColor Green
} else {
    Write-Host "Error: Failed to install packages" -ForegroundColor Red
    exit 1
}

# Check if API key is set
Write-Host ""
Write-Host "Checking Perplexity API key..." -ForegroundColor Yellow

if (Test-Path ".env.mcp") {
    $envContent = Get-Content ".env.mcp" -Raw
    if ($envContent -match "PERPLEXITY_API_KEY=pplx-") {
        Write-Host "Success: Perplexity API key found in .env.mcp" -ForegroundColor Green
    } else {
        Write-Host "Warning: Perplexity API key not found in .env.mcp" -ForegroundColor Yellow
        Write-Host "  Please add your API key to .env.mcp" -ForegroundColor Yellow
    }
} else {
    Write-Host "Warning: .env.mcp file not found" -ForegroundColor Yellow
    Write-Host "  Please create .env.mcp and add your Perplexity API key" -ForegroundColor Yellow
}

# Test the server
Write-Host ""
Write-Host "Testing Perplexity MCP server..." -ForegroundColor Yellow
Write-Host ""

python -c "import sys; sys.path.insert(0, '.'); import perplexity_mcp_server" 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "Success: Server script loaded successfully" -ForegroundColor Green
} else {
    Write-Host "Warning: Could not load server script" -ForegroundColor Yellow
    Write-Host "  This might be normal if dependencies are missing" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Restart Kiro to load the Perplexity MCP server" -ForegroundColor White
Write-Host "2. Check the MCP Servers panel to verify connection" -ForegroundColor White
Write-Host "3. Test with: Use perplexity_search to find information about FastAPI" -ForegroundColor White
Write-Host ""
Write-Host "Configuration file: .kiro/settings/mcp.json" -ForegroundColor Gray
Write-Host "Server script: perplexity_mcp_server.py" -ForegroundColor Gray
Write-Host "API key location: .env.mcp" -ForegroundColor Gray
Write-Host ""
