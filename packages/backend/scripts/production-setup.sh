#!/bin/bash

# Production Setup Script for GiveMeJobs Backend
# This script sets up the production environment

set -e

echo "🚀 Setting up GiveMeJobs Backend for Production..."

# Check if running as root
if [ "$EUID" -eq 0 ]; then
  echo "❌ Please don't run this script as root"
  exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "❌ Node.js 18+ is required. Current version: $(node --version)"
  exit 1
fi

echo "✅ Node.js version check passed: $(node --version)"

# Install dependencies
echo "📦 Installing production dependencies..."
npm ci --only=production

# Build the application
echo "🔨 Building the application..."
npm run build

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p logs
mkdir -p uploads
mkdir -p backups

# Set proper permissions
echo "🔒 Setting file permissions..."
chmod 755 dist/
chmod 644 dist/**/*
chmod 600 .env.production

# Check environment variables
echo "🔍 Checking environment configuration..."
if [ ! -f ".env.production" ]; then
  echo "❌ .env.production file not found!"
  echo "Please copy .env.production.example to .env.production and configure it"
  exit 1
fi

# Validate required environment variables
source .env.production

REQUIRED_VARS=(
  "DATABASE_URL"
  "MONGODB_URI"
  "REDIS_URL"
  "JWT_SECRET"
  "JWT_REFRESH_SECRET"
  "OPENAI_API_KEY"
  "PINECONE_API_KEY"
  "RESEND_API_KEY"
)

for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    echo "❌ Required environment variable $var is not set"
    exit 1
  fi
done

echo "✅ Environment variables check passed"

# Test database connections
echo "🔌 Testing database connections..."
npm run test:connections

# Run database migrations
echo "🗄️ Running database migrations..."
npm run migrate:up

# Create systemd service file (optional)
if command -v systemctl &> /dev/null; then
  echo "⚙️ Creating systemd service file..."
  cat > givemejobs-backend.service << EOF
[Unit]
Description=GiveMeJobs Backend API
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)
Environment=NODE_ENV=production
ExecStart=$(which node) dist/index.js
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=givemejobs-backend

[Install]
WantedBy=multi-user.target
EOF

  echo "📋 Systemd service file created: givemejobs-backend.service"
  echo "To install: sudo mv givemejobs-backend.service /etc/systemd/system/"
  echo "To enable: sudo systemctl enable givemejobs-backend"
  echo "To start: sudo systemctl start givemejobs-backend"
fi

# Create nginx configuration (optional)
echo "🌐 Creating nginx configuration template..."
cat > nginx.conf.template << EOF
server {
    listen 80;
    server_name yourdomain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    # SSL Configuration
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";
    
    # API proxy
    location /api/ {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Health check
    location /health {
        proxy_pass http://localhost:4000/health;
        access_log off;
    }
}
EOF

echo "📋 Nginx configuration template created: nginx.conf.template"

# Create log rotation configuration
echo "📝 Creating log rotation configuration..."
cat > logrotate.conf << EOF
$(pwd)/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 $USER $USER
    postrotate
        systemctl reload givemejobs-backend || true
    endscript
}
EOF

echo "📋 Log rotation configuration created: logrotate.conf"
echo "To install: sudo mv logrotate.conf /etc/logrotate.d/givemejobs-backend"

# Create backup script
echo "💾 Creating backup script..."
cat > backup.sh << 'EOF'
#!/bin/bash

# Backup script for GiveMeJobs
BACKUP_DIR="/var/backups/givemejobs"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup PostgreSQL
pg_dump $DATABASE_URL > $BACKUP_DIR/postgres_$DATE.sql

# Backup MongoDB
mongodump --uri="$MONGODB_URI" --out=$BACKUP_DIR/mongodb_$DATE

# Backup uploaded files
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz uploads/

# Clean old backups (keep 7 days)
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
find $BACKUP_DIR -type d -name "mongodb_*" -mtime +7 -exec rm -rf {} +

echo "Backup completed: $DATE"
EOF

chmod +x backup.sh
echo "📋 Backup script created: backup.sh"

# Create monitoring script
echo "📊 Creating monitoring script..."
cat > monitor.sh << 'EOF'
#!/bin/bash

# Simple monitoring script for GiveMeJobs Backend
API_URL="http://localhost:4000"

# Check if service is running
if ! systemctl is-active --quiet givemejobs-backend; then
    echo "❌ Service is not running"
    systemctl start givemejobs-backend
fi

# Check health endpoint
if ! curl -f -s "$API_URL/health" > /dev/null; then
    echo "❌ Health check failed"
    systemctl restart givemejobs-backend
fi

# Check disk space
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 90 ]; then
    echo "⚠️ Disk usage is high: ${DISK_USAGE}%"
fi

# Check memory usage
MEMORY_USAGE=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
if [ $MEMORY_USAGE -gt 90 ]; then
    echo "⚠️ Memory usage is high: ${MEMORY_USAGE}%"
fi

echo "✅ Monitoring check completed"
EOF

chmod +x monitor.sh
echo "📋 Monitoring script created: monitor.sh"

echo ""
echo "🎉 Production setup completed successfully!"
echo ""
echo "Next steps:"
echo "1. Configure your .env.production file with actual production values"
echo "2. Set up SSL certificates"
echo "3. Configure nginx (use nginx.conf.template)"
echo "4. Set up systemd service"
echo "5. Configure log rotation"
echo "6. Set up automated backups (cron job for backup.sh)"
echo "7. Set up monitoring (cron job for monitor.sh)"
echo ""
echo "To start the application:"
echo "npm run start:production"
echo ""
echo "For more information, see the deployment documentation."