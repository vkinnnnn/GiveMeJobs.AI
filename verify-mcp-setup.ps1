# MCP Setup Verification Script
# Verifies all MCP server configurations and credentials

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  MCP Setup Verification Tool" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Load environment variables from .env.mcp
$envFile = ".\.env.mcp"
if (Test-Path $envFile) {
    Write-Host "[OK] Found .env.mcp file" -ForegroundColor Green
    
    # Parse and display key configurations
    Get-Content $envFile | Where-Object { $_ -match "^[A-Z_]+=.+" -and $_ -notmatch "^#" } | ForEach-Object {
        $parts = $_ -split "=", 2
        $key = $parts[0]
        $value = $parts[1]
        
        # Mask sensitive values
        if ($key -match "PASSWORD|SECRET|TOKEN|KEY") {
            if ($value -match "your_|ghp_your|sk-your|pcsk_") {
                Write-Host "[!] $key : NOT SET (using template value)" -ForegroundColor Yellow
            } else {
                $masked = $value.Substring(0, [Math]::Min(10, $value.Length)) + "..."
                Write-Host "[OK] $key : $masked" -ForegroundColor Green
            }
        } else {
            Write-Host "[OK] $key : $value" -ForegroundColor Cyan
        }
    }
} else {
    Write-Host "[ERROR] .env.mcp file not found!" -ForegroundColor Red
    Write-Host "Please copy .env.mcp.template to .env.mcp and fill in your credentials" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Testing MCP Server Prerequisites" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check uvx installation
try {
    $uvxVersion = uvx --version 2>&1
    Write-Host "[OK] uvx is installed: $uvxVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] uvx is not installed!" -ForegroundColor Red
    Write-Host "Install with: pip install uvx" -ForegroundColor Yellow
}

# Check Python
try {
    $pythonVersion = python --version 2>&1
    Write-Host "[OK] Python is installed: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Python is not installed!" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Testing Service Connections" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Test PostgreSQL connection
Write-Host "Testing PostgreSQL..." -NoNewline
try {
    $pgTest = docker exec givemejobs-postgres pg_isready 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host " [OK]" -ForegroundColor Green
    } else {
        Write-Host " [WARN] PostgreSQL container not running" -ForegroundColor Yellow
    }
} catch {
    Write-Host " [WARN] Cannot connect to PostgreSQL" -ForegroundColor Yellow
}

# Test MongoDB connection
Write-Host "Testing MongoDB..." -NoNewline
try {
    $mongoTest = docker exec givemejobs-mongodb mongosh --eval "db.version()" --quiet 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host " [OK]" -ForegroundColor Green
    } else {
        Write-Host " [WARN] MongoDB container not running" -ForegroundColor Yellow
    }
} catch {
    Write-Host " [WARN] Cannot connect to MongoDB" -ForegroundColor Yellow
}

# Test Redis connection
Write-Host "Testing Redis..." -NoNewline
try {
    $redisTest = docker exec givemejobs-redis redis-cli ping 2>&1
    if ($redisTest -eq "PONG") {
        Write-Host " [OK]" -ForegroundColor Green
    } else {
        Write-Host " [WARN] Redis container not running" -ForegroundColor Yellow
    }
} catch {
    Write-Host " [WARN] Cannot connect to Redis" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  MCP Configuration Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$mcpConfig = ".\.kiro\settings\mcp.json"
if (Test-Path $mcpConfig) {
    Write-Host "[OK] MCP configuration file found" -ForegroundColor Green
    $config = Get-Content $mcpConfig | ConvertFrom-Json
    $serverCount = ($config.mcpServers | Get-Member -MemberType NoteProperty).Count
    Write-Host "[OK] Configured MCP servers: $serverCount" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "Available MCP Servers:" -ForegroundColor Cyan
    $config.mcpServers | Get-Member -MemberType NoteProperty | ForEach-Object {
        $serverName = $_.Name
        $server = $config.mcpServers.$serverName
        $status = if ($server.disabled) { "DISABLED" } else { "ENABLED" }
        $statusColor = if ($server.disabled) { "Yellow" } else { "Green" }
        Write-Host "  - $serverName : $status" -ForegroundColor $statusColor
    }
} else {
    Write-Host "[ERROR] MCP configuration file not found at $mcpConfig" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Next Steps" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "1. Ensure all services are running:" -ForegroundColor Cyan
Write-Host "   docker-compose up -d postgres mongodb redis" -ForegroundColor White
Write-Host ""
Write-Host "2. Start your development server:" -ForegroundColor Cyan
Write-Host "   cd packages\frontend && npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "3. Open KIRO IDE and it will automatically detect your MCP configuration" -ForegroundColor Cyan
Write-Host ""
Write-Host "4. Test the chatbot at: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""

Write-Host "Verification complete!" -ForegroundColor Green
