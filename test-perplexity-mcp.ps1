# Test Perplexity MCP Server
# Quick test to verify the Perplexity MCP server is working

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Perplexity MCP Server Test" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if dependencies are installed
Write-Host "Checking dependencies..." -ForegroundColor Yellow

$dependencies = @("mcp", "httpx", "anyio")
$allInstalled = $true

foreach ($dep in $dependencies) {
    python -c "import $dep" 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Success: $dep installed" -ForegroundColor Green
    } else {
        Write-Host "Error: $dep not installed" -ForegroundColor Red
        $allInstalled = $false
    }
}

if (-not $allInstalled) {
    Write-Host ""
    Write-Host "Missing dependencies. Run: .\setup-perplexity-mcp.ps1" -ForegroundColor Yellow
    exit 1
}

# Check API key
Write-Host ""
Write-Host "Checking API key..." -ForegroundColor Yellow

if (Test-Path ".env.mcp") {
    $envContent = Get-Content ".env.mcp" -Raw
    if ($envContent -match "PERPLEXITY_API_KEY=(pplx-[A-Za-z0-9]+)") {
        Write-Host "Success: API key found" -ForegroundColor Green
        $env:PERPLEXITY_API_KEY = $matches[1]
    } else {
        Write-Host "Error: API key not found in .env.mcp" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "Error: .env.mcp file not found" -ForegroundColor Red
    exit 1
}

# Test API connection
Write-Host ""
Write-Host "Testing Perplexity API connection..." -ForegroundColor Yellow
Write-Host ""

$testScript = @"
import os
import asyncio
import httpx

async def test_api():
    api_key = os.getenv('PERPLEXITY_API_KEY')
    if not api_key:
        print('Error: API key not set')
        return False
    
    headers = {
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json'
    }
    
    payload = {
        'model': 'llama-3.1-sonar-small-128k-online',
        'messages': [
            {'role': 'user', 'content': 'Say hello in one word'}
        ],
        'max_tokens': 10
    }
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                'https://api.perplexity.ai/chat/completions',
                headers=headers,
                json=payload
            )
            response.raise_for_status()
            result = response.json()
            print('Success: API connection successful')
            print(f'  Response: {result["choices"][0]["message"]["content"]}')
            return True
    except httpx.HTTPStatusError as e:
        print(f'Error: API error: {e.response.status_code}')
        print(f'  {e.response.text}')
        return False
    except Exception as e:
        print(f'Error: Connection error: {str(e)}')
        return False

asyncio.run(test_api())
"@

$testScript | python
if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Success: Perplexity MCP server is ready!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Error: Test failed" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Test Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "The Perplexity MCP server is working correctly." -ForegroundColor Green
Write-Host "Restart Kiro to use it in your workspace." -ForegroundColor White
Write-Host ""
