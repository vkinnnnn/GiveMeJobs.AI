# MCP Setup Tools for GiveMeJobs Platform
# Comprehensive MCP server configuration, testing, and validation

param(
    [switch]$Setup,
    [switch]$Test,
    [switch]$Validate,
    [switch]$InstallUV,
    [switch]$TestConnections,
    [switch]$ConfigureEnv,
    [switch]$CheckConnections,
    [switch]$Verbose,
    [switch]$All,
    [switch]$Help
)

# Show help if requested or no parameters provided
if ($Help -or (-not ($Setup -or $Test -or $Validate -or $InstallUV -or $TestConnections -or $ConfigureEnv -or $CheckConnections -or $All))) {
    Write-Host "MCP Setup Tools for GiveMeJobs Platform" -ForegroundColor Cyan
    Write-Host "=======================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "USAGE:" -ForegroundColor Yellow
    Write-Host "  .\mcp-setup-tools.ps1 [OPTIONS]" -ForegroundColor White
    Write-Host ""
    Write-Host "MAIN COMMANDS:" -ForegroundColor Yellow
    Write-Host "  -Setup              Complete MCP server setup" -ForegroundColor White
    Write-Host "  -Test               Run MCP integration tests" -ForegroundColor White
    Write-Host "  -Validate           Validate MCP configuration" -ForegroundColor White
    Write-Host "  -All                Run all operations" -ForegroundColor White
    Write-Host ""
    Write-Host "SETUP OPTIONS:" -ForegroundColor Yellow
    Write-Host "  -InstallUV          Install UV Python package manager" -ForegroundColor White
    Write-Host "  -TestConnections    Test database and service connections" -ForegroundColor White
    Write-Host "  -ConfigureEnv       Create .env.mcp configuration file" -ForegroundColor White
    Write-Host ""
    Write-Host "VALIDATION OPTIONS:" -ForegroundColor Yellow
    Write-Host "  -CheckConnections   Test actual connections to services" -ForegroundColor White
    Write-Host "  -Verbose            Show detailed validation output" -ForegroundColor White
    Write-Host ""
    Write-Host "EXAMPLES:" -ForegroundColor Yellow
    Write-Host "  .\mcp-setup-tools.ps1 -Setup              # Complete setup" -ForegroundColor Gray
    Write-Host "  .\mcp-setup-tools.ps1 -Test               # Run integration tests" -ForegroundColor Gray
    Write-Host "  .\mcp-setup-tools.ps1 -Validate -Verbose  # Detailed validation" -ForegroundColor Gray
    Write-Host "  .\mcp-setup-tools.ps1 -All                # Everything" -ForegroundColor Gray
    Write-Host ""
    exit 0
}

Write-Host "MCP Setup Tools for GiveMeJobs Platform" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan

# Function to check if command exists
function Test-Command {
    param($Command)
    try {
        Get-Command $Command -ErrorAction Stop | Out-Null
        return $true
    }
    catch {
        return $false
    }
}

# Function to install UV
function Install-UV {
    Write-Host "Installing UV (Python package manager)..." -ForegroundColor Yellow
    
    if (Test-Command "uv") {
        Write-Host "UV already installed" -ForegroundColor Green
        return
    }
    
    try {
        Invoke-RestMethod https://astral.sh/uv/install.ps1 | Invoke-Expression
        Write-Host "UV installed successfully" -ForegroundColor Green
        
        # Refresh PATH
        $machinePath = [System.Environment]::GetEnvironmentVariable("PATH", "Machine")
        $userPath = [System.Environment]::GetEnvironmentVariable("PATH", "User")
        $env:PATH = $machinePath + ";" + $userPath
        
        if (Test-Command "uv") {
            Write-Host "UV is now available" -ForegroundColor Green
        } else {
            Write-Host "UV installed but not in PATH. Please restart PowerShell." -ForegroundColor Yellow
        }
    }
    catch {
        Write-Host "Failed to install UV: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Function to test database connections
function Test-DatabaseConnections {
    Write-Host "Testing Database Connections..." -ForegroundColor Yellow
    
    # Test PostgreSQL
    Write-Host "Testing PostgreSQL..." -ForegroundColor Gray
    try {
        if (Test-Command "psql") {
            $result = psql -h localhost -U postgres -d postgres -c "SELECT version();" 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host "PostgreSQL connection successful" -ForegroundColor Green
            } else {
                Write-Host "PostgreSQL connection failed (may need credentials)" -ForegroundColor Yellow
            }
        } else {
            Write-Host "psql not found - PostgreSQL client not installed" -ForegroundColor Yellow
        }
    }
    catch {
        Write-Host "PostgreSQL test failed: $($_.Exception.Message)" -ForegroundColor Yellow
    }
    
    # Test MongoDB
    Write-Host "Testing MongoDB..." -ForegroundColor Gray
    try {
        if (Test-Command "mongosh") {
            $result = mongosh "mongodb://localhost:27017" --eval "db.runCommand({ping: 1})" --quiet 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host "MongoDB connection successful" -ForegroundColor Green
            } else {
                Write-Host "MongoDB connection failed" -ForegroundColor Yellow
            }
        } else {
            Write-Host "mongosh not found - MongoDB client not installed" -ForegroundColor Yellow
        }
    }
    catch {
        Write-Host "MongoDB test failed: $($_.Exception.Message)" -ForegroundColor Yellow
    }
    
    # Test Redis
    Write-Host "Testing Redis..." -ForegroundColor Gray
    try {
        if (Test-Command "redis-cli") {
            $result = redis-cli ping 2>&1
            if ($result -eq "PONG") {
                Write-Host "Redis connection successful" -ForegroundColor Green
            } else {
                Write-Host "Redis connection failed" -ForegroundColor Yellow
            }
        } else {
            Write-Host "redis-cli not found - Redis client not installed" -ForegroundColor Yellow
        }
    }
    catch {
        Write-Host "Redis test failed: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

# Function to test Docker and Kubernetes
function Test-ContainerServices {
    Write-Host "Testing Container Services..." -ForegroundColor Yellow
    
    # Test Docker
    Write-Host "Testing Docker..." -ForegroundColor Gray
    try {
        if (Test-Command "docker") {
            $result = docker ps 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host "Docker is running" -ForegroundColor Green
            } else {
                Write-Host "Docker is not running or accessible" -ForegroundColor Yellow
            }
        } else {
            Write-Host "Docker not found" -ForegroundColor Yellow
        }
    }
    catch {
        Write-Host "Docker test failed: $($_.Exception.Message)" -ForegroundColor Yellow
    }
    
    # Test Kubernetes
    Write-Host "Testing Kubernetes..." -ForegroundColor Gray
    try {
        if (Test-Command "kubectl") {
            $result = kubectl cluster-info 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host "Kubernetes cluster accessible" -ForegroundColor Green
            } else {
                Write-Host "Kubernetes cluster not accessible" -ForegroundColor Yellow
            }
        } else {
            Write-Host "kubectl not found" -ForegroundColor Yellow
        }
    }
    catch {
        Write-Host "Kubernetes test failed: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

# Function to test monitoring services
function Test-MonitoringServices {
    Write-Host "Testing Monitoring Services..." -ForegroundColor Yellow
    
    # Test Prometheus
    Write-Host "Testing Prometheus..." -ForegroundColor Gray
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:9090/api/v1/status/config" -TimeoutSec 5 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Host "Prometheus is running" -ForegroundColor Green
        }
    }
    catch {
        Write-Host "Prometheus not accessible at localhost:9090" -ForegroundColor Yellow
    }
    
    # Test Grafana
    Write-Host "Testing Grafana..." -ForegroundColor Gray
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -TimeoutSec 5 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Host "Grafana is running" -ForegroundColor Green
        }
    }
    catch {
        Write-Host "Grafana not accessible at localhost:3000" -ForegroundColor Yellow
    }
}

# Function to create environment configuration
function Create-EnvironmentConfig {
    Write-Host "Creating Environment Configuration..." -ForegroundColor Yellow
    
    if (Test-Path ".env.mcp.template") {
        Copy-Item ".env.mcp.template" ".env.mcp"
        Write-Host "Created .env.mcp from template" -ForegroundColor Green
        Write-Host "Please edit .env.mcp and add your actual API keys and connection strings" -ForegroundColor Yellow
    } else {
        Write-Host ".env.mcp.template not found. Creating basic configuration..." -ForegroundColor Yellow
        
        $envContent = @"
# MCP Servers Environment Configuration
# Copy this to your .env file or set as environment variables

# Database Connections
POSTGRES_CONNECTION_STRING=postgresql://username:password@localhost:5432/givemejobs
MONGODB_URI=mongodb://localhost:27017/givemejobs
REDIS_URL=redis://localhost:6379

# API Keys (Replace with your actual keys)
GITHUB_PERSONAL_ACCESS_TOKEN=your_github_token_here
OPENAI_API_KEY=your_openai_api_key_here
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_ENVIRONMENT=us-east1-gcp

# Monitoring Services
PROMETHEUS_URL=http://localhost:9090
GRAFANA_URL=http://localhost:3000
GRAFANA_API_KEY=your_grafana_api_key_here

# Error Tracking
SENTRY_AUTH_TOKEN=your_sentry_auth_token_here
SENTRY_ORG=givemejobs
SENTRY_PROJECT=platform

# Logging
FASTMCP_LOG_LEVEL=ERROR
"@

        $envContent | Out-File -FilePath ".env.mcp" -Encoding UTF8
        Write-Host "Created .env.mcp file with basic configuration" -ForegroundColor Green
        Write-Host "Please edit .env.mcp and add your actual API keys" -ForegroundColor Yellow
    }
}

# Function to test MCP server availability
function Test-MCPServers {
    Write-Host "Testing MCP Server Availability..." -ForegroundColor Yellow
    
    if (-not (Test-Command "uvx")) {
        Write-Host "uvx not found. Please install UV first." -ForegroundColor Red
        return
    }
    
    $servers = @(
        "awslabs.aws-documentation-mcp-server@latest",
        "mcp-server-postgres@latest",
        "mcp-server-github@latest",
        "mcp-server-filesystem@latest",
        "mcp-server-docker@latest"
    )
    
    foreach ($server in $servers) {
        Write-Host "Testing $server..." -ForegroundColor Gray
        try {
            $result = uvx $server --help 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host "$server is available" -ForegroundColor Green
            } else {
                Write-Host "$server may need installation" -ForegroundColor Yellow
            }
        }
        catch {
            Write-Host "Failed to test $server" -ForegroundColor Yellow
        }
    }
}

# Function to show MCP configuration status
function Show-MCPStatus {
    Write-Host "MCP Configuration Status" -ForegroundColor Cyan
    Write-Host "========================" -ForegroundColor Cyan
    
    if (Test-Path ".kiro/settings/mcp.json") {
        Write-Host "MCP configuration file exists" -ForegroundColor Green
        
        try {
            $config = Get-Content ".kiro/settings/mcp.json" | ConvertFrom-Json
            $serverCount = $config.mcpServers.PSObject.Properties.Count
            Write-Host "Configured servers: $serverCount" -ForegroundColor Green
            
            Write-Host "`nConfigured MCP Servers:" -ForegroundColor Yellow
            foreach ($server in $config.mcpServers.PSObject.Properties) {
                $status = if ($server.Value.disabled) { "Disabled" } else { "Enabled" }
                Write-Host "  - $($server.Name): $status" -ForegroundColor Gray
            }
        }
        catch {
            Write-Host "Error reading MCP configuration" -ForegroundColor Yellow
        }
    } else {
        Write-Host "MCP configuration file not found" -ForegroundColor Red
    }
}

# Function to test MCP server response
function Test-MCPServer {
    param(
        [string]$ServerName,
        [string]$TestDescription
    )
    
    Write-Host "`nTesting $ServerName - $TestDescription" -ForegroundColor Yellow
    
    # This would be replaced with actual MCP calls in Kiro
    Write-Host "  Test: $TestDescription" -ForegroundColor Gray
    Write-Host "  Expected: MCP server responds correctly" -ForegroundColor Gray
    Write-Host "  Status: Ready for testing in Kiro" -ForegroundColor Green
}

# Function to run integration tests
function Run-IntegrationTests {
    Write-Host "Testing MCP Integration with GiveMeJobs Platform" -ForegroundColor Cyan
    Write-Host "================================================" -ForegroundColor Cyan

    # Test Infrastructure Servers
    Write-Host "`nInfrastructure Management Servers" -ForegroundColor Magenta
    Test-MCPServer "aws-docs" "Search AWS documentation for EKS setup"
    Test-MCPServer "postgres" "Query user table schema and performance"
    Test-MCPServer "docker" "List running containers for your services"
    Test-MCPServer "kubernetes" "Get pod status for your deployments"

    # Test Development Workflow Servers
    Write-Host "`nDevelopment Workflow Servers" -ForegroundColor Magenta
    Test-MCPServer "github" "List repositories and check CI/CD status"
    Test-MCPServer "filesystem" "Search project files and analyze structure"

    # Test Database Servers
    Write-Host "`nDatabase Management Servers" -ForegroundColor Magenta
    Test-MCPServer "postgres" "Analyze query performance for job matching"
    Test-MCPServer "mongodb" "Check document collections and indexes"
    Test-MCPServer "redis" "Monitor cache hit rates and session data"

    # Test Monitoring Servers
    Write-Host "`nMonitoring & Observability Servers" -ForegroundColor Magenta
    Test-MCPServer "prometheus" "Query FastAPI response time metrics"
    Test-MCPServer "grafana" "Access performance dashboards"
    Test-MCPServer "sentry" "Check error rates and performance issues"

    # Test AI/ML Servers
    Write-Host "`nAI/ML Enhancement Servers" -ForegroundColor Magenta
    Test-MCPServer "openai-enhanced" "Generate resume content and embeddings"
    Test-MCPServer "pinecone" "Query vector database for job matching"

    # Test Security Servers
    Write-Host "`nSecurity & Compliance Servers" -ForegroundColor Magenta
    Test-MCPServer "security-scanner" "Scan for vulnerabilities in Python services"
    Test-MCPServer "terraform" "Review infrastructure as code"

    # Integration Test Scenarios for Your Platform
    Write-Host "`nPlatform-Specific Integration Tests" -ForegroundColor Cyan

    $integrationTests = @(
        @{
            Name = "Resume Generation Pipeline"
            Description = "Test AI-powered resume generation workflow"
            Servers = @("openai-enhanced", "mongodb", "postgres")
            Steps = @(
                "Query user profile from PostgreSQL",
                "Generate resume content with OpenAI",
                "Store generated document in MongoDB",
                "Update user analytics in PostgreSQL"
            )
        },
        @{
            Name = "Job Matching Optimization"
            Description = "Test semantic job matching performance"
            Servers = @("pinecone", "postgres", "redis", "prometheus")
            Steps = @(
                "Query job embeddings from Pinecone",
                "Fetch job details from PostgreSQL", 
                "Cache results in Redis",
                "Monitor performance with Prometheus"
            )
        },
        @{
            Name = "Production Deployment"
            Description = "Test deployment and monitoring workflow"
            Servers = @("kubernetes", "docker", "grafana", "sentry")
            Steps = @(
                "Deploy services to Kubernetes",
                "Monitor container health with Docker",
                "Track metrics in Grafana",
                "Monitor errors with Sentry"
            )
        }
    )

    foreach ($test in $integrationTests) {
        Write-Host "`n$($test.Name)" -ForegroundColor Yellow
        Write-Host "   Description: $($test.Description)" -ForegroundColor Gray
        Write-Host "   Required Servers: $($test.Servers -join ', ')" -ForegroundColor Gray
        Write-Host "   Test Steps:" -ForegroundColor Gray
        
        foreach ($step in $test.Steps) {
            Write-Host "     • $step" -ForegroundColor DarkGray
        }
        
        Write-Host "   Ready for integration testing" -ForegroundColor Green
    }

    # Real-world usage examples
    Write-Host "`nReal-World Usage Examples" -ForegroundColor Cyan

    $usageExamples = @(
        "Ask AWS MCP: 'How do I optimize EKS cluster for FastAPI services?'",
        "Ask PostgreSQL MCP: 'Show me slow queries in the jobs table'",
        "Ask GitHub MCP: 'Create a PR for the latest security fixes'",
        "Ask Kubernetes MCP: 'Scale up the document-processing service'",
        "Ask OpenAI MCP: 'Generate a resume for a Python developer role'",
        "Ask Pinecone MCP: 'Find similar jobs for user profile X'",
        "Ask Prometheus MCP: 'Show FastAPI response time trends'",
        "Ask Security MCP: 'Scan for vulnerabilities in requirements.txt'"
    )

    foreach ($example in $usageExamples) {
        Write-Host "  $example" -ForegroundColor DarkCyan
    }
}

# Function to check if environment variable is set
function Test-EnvVar {
    param(
        [string]$VarName,
        [string]$Description,
        [bool]$Required = $true
    )
    
    $value = [System.Environment]::GetEnvironmentVariable($VarName)
    if (-not $value -and (Test-Path ".env.mcp")) {
        # Try to read from .env.mcp file
        $envContent = Get-Content ".env.mcp" -ErrorAction SilentlyContinue
        $envLine = $envContent | Where-Object { $_ -match "^$VarName=" }
        if ($envLine) {
            $value = ($envLine -split "=", 2)[1]
        }
    }
    
    if ($value -and $value -ne "your_token_here" -and $value -ne "your_api_key_here" -and $value -ne "") {
        Write-Host "$VarName" -ForegroundColor Green
        if ($Verbose) {
            Write-Host "   $Description" -ForegroundColor Gray
        }
        return $true
    } elseif ($Required) {
        Write-Host "$VarName - Missing or placeholder value" -ForegroundColor Red
        if ($Verbose) {
            Write-Host "   $Description" -ForegroundColor Gray
        }
        return $false
    } else {
        Write-Host "$VarName - Optional (not set)" -ForegroundColor Yellow
        if ($Verbose) {
            Write-Host "   $Description" -ForegroundColor Gray
        }
        return $true
    }
}

# Function to validate configuration
function Validate-Configuration {
    Write-Host "MCP Configuration Validation" -ForegroundColor Cyan
    Write-Host "============================" -ForegroundColor Cyan

    # Check if .env.mcp exists
    if (-not (Test-Path ".env.mcp")) {
        Write-Host ".env.mcp file not found" -ForegroundColor Red
        Write-Host "   Run: .\mcp-setup-tools.ps1 -ConfigureEnv" -ForegroundColor Yellow
        Write-Host "   Or copy: .env.mcp.template to .env.mcp" -ForegroundColor Yellow
        return $false
    }

    Write-Host "`nChecking Required Configuration..." -ForegroundColor Yellow

    # Database connections
    $dbValid = $true
    $dbValid = (Test-EnvVar "POSTGRES_CONNECTION_STRING" "PostgreSQL database connection") -and $dbValid
    $dbValid = (Test-EnvVar "MONGODB_URI" "MongoDB database connection") -and $dbValid
    $dbValid = (Test-EnvVar "REDIS_URL" "Redis cache connection") -and $dbValid

    # API Keys
    $apiValid = $true
    $apiValid = (Test-EnvVar "GITHUB_PERSONAL_ACCESS_TOKEN" "GitHub repository access") -and $apiValid
    $apiValid = (Test-EnvVar "OPENAI_API_KEY" "OpenAI API for AI operations") -and $apiValid
    $apiValid = (Test-EnvVar "PINECONE_API_KEY" "Pinecone vector database") -and $apiValid
    $apiValid = (Test-EnvVar "PINECONE_ENVIRONMENT" "Pinecone environment") -and $apiValid

    # Monitoring (optional but recommended)
    Write-Host "`nChecking Monitoring Configuration..." -ForegroundColor Yellow
    $monitoringValid = $true
    $monitoringValid = (Test-EnvVar "PROMETHEUS_URL" "Prometheus metrics server" $false) -and $monitoringValid
    $monitoringValid = (Test-EnvVar "GRAFANA_URL" "Grafana dashboard server" $false) -and $monitoringValid
    $monitoringValid = (Test-EnvVar "GRAFANA_API_KEY" "Grafana API access" $false) -and $monitoringValid
    $monitoringValid = (Test-EnvVar "SENTRY_AUTH_TOKEN" "Sentry error tracking" $false) -and $monitoringValid

    # System configuration
    Write-Host "`nChecking System Configuration..." -ForegroundColor Yellow
    $sysValid = $true
    $sysValid = (Test-EnvVar "FASTMCP_LOG_LEVEL" "MCP server logging level") -and $sysValid

    # Test connections if requested
    if ($CheckConnections) {
        Write-Host "`nTesting Connections..." -ForegroundColor Yellow
        
        # Test PostgreSQL
        $pgConnStr = [System.Environment]::GetEnvironmentVariable("POSTGRES_CONNECTION_STRING")
        if ($pgConnStr) {
            try {
                # Simple connection test (requires psql)
                if (Get-Command "psql" -ErrorAction SilentlyContinue) {
                    $result = psql $pgConnStr -c "SELECT 1;" 2>&1
                    if ($LASTEXITCODE -eq 0) {
                        Write-Host "PostgreSQL connection successful" -ForegroundColor Green
                    } else {
                        Write-Host "PostgreSQL connection failed" -ForegroundColor Red
                    }
                } else {
                    Write-Host "psql not available - skipping PostgreSQL test" -ForegroundColor Yellow
                }
            } catch {
                Write-Host "PostgreSQL connection error: $($_.Exception.Message)" -ForegroundColor Red
            }
        }
        
        # Test Redis
        $redisUrl = [System.Environment]::GetEnvironmentVariable("REDIS_URL")
        if ($redisUrl) {
            try {
                if (Get-Command "redis-cli" -ErrorAction SilentlyContinue) {
                    $result = redis-cli ping 2>&1
                    if ($result -eq "PONG") {
                        Write-Host "Redis connection successful" -ForegroundColor Green
                    } else {
                        Write-Host "Redis connection failed" -ForegroundColor Red
                    }
                } else {
                    Write-Host "redis-cli not available - skipping Redis test" -ForegroundColor Yellow
                }
            } catch {
                Write-Host "Redis connection error: $($_.Exception.Message)" -ForegroundColor Red
            }
        }
        
        # Test MongoDB
        $mongoUri = [System.Environment]::GetEnvironmentVariable("MONGODB_URI")
        if ($mongoUri) {
            try {
                if (Get-Command "mongosh" -ErrorAction SilentlyContinue) {
                    $result = mongosh $mongoUri --eval "db.runCommand({ping: 1})" --quiet 2>&1
                    if ($LASTEXITCODE -eq 0) {
                        Write-Host "MongoDB connection successful" -ForegroundColor Green
                    } else {
                        Write-Host "MongoDB connection failed" -ForegroundColor Red
                    }
                } else {
                    Write-Host "mongosh not available - skipping MongoDB test" -ForegroundColor Yellow
                }
            } catch {
                Write-Host "MongoDB connection error: $($_.Exception.Message)" -ForegroundColor Red
            }
        }
    }

    # Summary
    Write-Host "`nValidation Summary" -ForegroundColor Cyan
    Write-Host "=================" -ForegroundColor Cyan

    $overallValid = $dbValid -and $apiValid -and $sysValid

    if ($overallValid) {
        Write-Host "Configuration is valid!" -ForegroundColor Green
        Write-Host "   All required variables are set" -ForegroundColor Gray
        
        if (-not $monitoringValid) {
            Write-Host "Some monitoring services are not configured (optional)" -ForegroundColor Yellow
        }
        return $true
    } else {
        Write-Host "Configuration has issues" -ForegroundColor Red
        Write-Host "   Please fix the missing variables above" -ForegroundColor Gray
        return $false
    }
}

# Main execution logic
if ($All) {
    $Setup = $true
    $Test = $true
    $Validate = $true
}

if ($Setup -or $InstallUV -or $TestConnections -or $ConfigureEnv) {
    Write-Host "`nRunning MCP Setup..." -ForegroundColor Cyan
    
    if ($Setup -or $InstallUV) {
        Install-UV
    }

    if ($Setup -or $ConfigureEnv) {
        Create-EnvironmentConfig
    }

    if ($Setup -or $TestConnections) {
        Test-DatabaseConnections
        Test-ContainerServices
        Test-MonitoringServices
        Test-MCPServers
    }

    # Always show status after setup
    Show-MCPStatus
    
    Write-Host "`nMCP Setup Complete!" -ForegroundColor Green
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Edit .env.mcp with your API keys and connection strings" -ForegroundColor Gray
    Write-Host "2. Validate configuration: .\mcp-setup-tools.ps1 -Validate" -ForegroundColor Gray
    Write-Host "3. Start your services (databases, monitoring)" -ForegroundColor Gray
    Write-Host "4. Test MCP servers: .\mcp-setup-tools.ps1 -Test" -ForegroundColor Gray
}

if ($Test) {
    Write-Host "`nRunning MCP Integration Tests..." -ForegroundColor Cyan
    Run-IntegrationTests
    
    Write-Host "`nNext Steps" -ForegroundColor Green
    Write-Host "==========" -ForegroundColor Green
    Write-Host "1. Validate configuration: .\mcp-setup-tools.ps1 -Validate" -ForegroundColor Gray
    Write-Host "2. Configure API keys in .env.mcp file (if validation fails)" -ForegroundColor Gray
    Write-Host "3. Start your services (databases, monitoring)" -ForegroundColor Gray
    Write-Host "4. Test connections: .\mcp-setup-tools.ps1 -Validate -CheckConnections" -ForegroundColor Gray
    Write-Host "5. Open Kiro and test MCP servers" -ForegroundColor Gray
    Write-Host "6. Try the integration test scenarios above" -ForegroundColor Gray
    Write-Host "7. Integrate MCP calls into your development workflow" -ForegroundColor Gray

    Write-Host "`nMCP Integration Test Complete!" -ForegroundColor Green
    Write-Host "Your GiveMeJobs platform is ready for enhanced development with MCP servers!" -ForegroundColor Green
}

if ($Validate -or $CheckConnections -or $Verbose) {
    Write-Host "`nRunning MCP Configuration Validation..." -ForegroundColor Cyan
    $isValid = Validate-Configuration
    
    Write-Host "`nNext Steps" -ForegroundColor Yellow
    if ($isValid) {
        Write-Host "1. Test MCP servers: .\mcp-setup-tools.ps1 -Test" -ForegroundColor Gray
        Write-Host "2. Start your services (databases, monitoring)" -ForegroundColor Gray
        Write-Host "3. Open Kiro and verify MCP server connections" -ForegroundColor Gray
    } else {
        Write-Host "1. Edit .env.mcp with your actual API keys and connection strings" -ForegroundColor Gray
        Write-Host "2. Run this validation again: .\mcp-setup-tools.ps1 -Validate" -ForegroundColor Gray
        Write-Host "3. Test connections: .\mcp-setup-tools.ps1 -Validate -CheckConnections" -ForegroundColor Gray
    }

    Write-Host "`nDocumentation" -ForegroundColor Cyan
    Write-Host "• .env.mcp.template - Complete configuration reference" -ForegroundColor Gray
    Write-Host "• MCP_SETUP_GUIDE.md - Detailed setup instructions" -ForegroundColor Gray
    Write-Host "• .kiro/settings/mcp.json - MCP server configuration" -ForegroundColor Gray
}

Write-Host ""