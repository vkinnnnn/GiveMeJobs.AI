#!/bin/bash

# GiveMeJobs Monitoring Setup Script

echo "🚀 Setting up monitoring infrastructure..."

# Create logs directory
echo "📁 Creating logs directory..."
mkdir -p logs

# Start monitoring services
echo "🐳 Starting Docker containers..."
docker-compose up -d prometheus grafana elasticsearch logstash kibana

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 30

# Check service health
echo "🏥 Checking service health..."

# Check Prometheus
if curl -f http://localhost:9090/-/healthy > /dev/null 2>&1; then
    echo "✅ Prometheus is healthy"
else
    echo "❌ Prometheus is not responding"
fi

# Check Grafana
if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "✅ Grafana is healthy"
else
    echo "❌ Grafana is not responding"
fi

# Check Elasticsearch
if curl -f http://localhost:9200/_cluster/health > /dev/null 2>&1; then
    echo "✅ Elasticsearch is healthy"
else
    echo "❌ Elasticsearch is not responding"
fi

# Check Kibana
if curl -f http://localhost:5601/api/status > /dev/null 2>&1; then
    echo "✅ Kibana is healthy"
else
    echo "❌ Kibana is not responding"
fi

echo ""
echo "🎉 Monitoring setup complete!"
echo ""
echo "📊 Access your monitoring tools:"
echo "  - Prometheus: http://localhost:9090"
echo "  - Grafana: http://localhost:3001 (admin/admin)"
echo "  - Kibana: http://localhost:5601"
echo "  - Metrics API: http://localhost:4000/metrics"
echo "  - Performance Stats: http://localhost:4000/performance/stats"
echo ""
echo "📖 For more information, see packages/backend/MONITORING.md"
