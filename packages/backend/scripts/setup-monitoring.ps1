# GiveMeJobs Monitoring Setup Script (PowerShell)

Write-Host "🚀 Setting up monitoring infrastructure..." -ForegroundColor Green

# Create logs directory
Write-Host "📁 Creating logs directory..." -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path "logs" | Out-Null

# Start monitoring services
Write-Host "🐳 Starting Docker containers..." -ForegroundColor Cyan
docker-compose up -d prometheus grafana elasticsearch logstash kibana

# Wait for services to be ready
Write-Host "⏳ Waiting for services to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# Check service health
Write-Host "🏥 Checking service health..." -ForegroundColor Cyan

# Check Prometheus
try {
    $response = Invoke-WebRequest -Uri "http://localhost:9090/-/healthy" -UseBasicParsing -TimeoutSec 5
    Write-Host "✅ Prometheus is healthy" -ForegroundColor Green
} catch {
    Write-Host "❌ Prometheus is not responding" -ForegroundColor Red
}

# Check Grafana
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/api/health" -UseBasicParsing -TimeoutSec 5
    Write-Host "✅ Grafana is healthy" -ForegroundColor Green
} catch {
    Write-Host "❌ Grafana is not responding" -ForegroundColor Red
}

# Check Elasticsearch
try {
    $response = Invoke-WebRequest -Uri "http://localhost:9200/_cluster/health" -UseBasicParsing -TimeoutSec 5
    Write-Host "✅ Elasticsearch is healthy" -ForegroundColor Green
} catch {
    Write-Host "❌ Elasticsearch is not responding" -ForegroundColor Red
}

# Check Kibana
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5601/api/status" -UseBasicParsing -TimeoutSec 5
    Write-Host "✅ Kibana is healthy" -ForegroundColor Green
} catch {
    Write-Host "❌ Kibana is not responding" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎉 Monitoring setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Access your monitoring tools:" -ForegroundColor Cyan
Write-Host "  - Prometheus: http://localhost:9090"
Write-Host "  - Grafana: http://localhost:3001 (admin/admin)"
Write-Host "  - Kibana: http://localhost:5601"
Write-Host "  - Metrics API: http://localhost:4000/metrics"
Write-Host "  - Performance Stats: http://localhost:4000/performance/stats"
Write-Host ""
Write-Host "📖 For more information, see packages/backend/MONITORING.md" -ForegroundColor Yellow
