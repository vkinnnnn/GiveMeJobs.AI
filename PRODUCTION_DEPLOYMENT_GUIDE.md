# 🚀 GiveMeJobs Production Deployment Guide

This guide provides step-by-step instructions for deploying the GiveMeJobs platform to production.

## 📋 Prerequisites

### System Requirements
- **Server**: Linux (Ubuntu 20.04+ recommended)
- **CPU**: 4+ cores
- **RAM**: 8GB+ (16GB recommended)
- **Storage**: 100GB+ SSD
- **Network**: Static IP address
- **Domain**: Registered domain name with DNS access

### Software Requirements
- **Docker**: 24.0+
- **Docker Compose**: 2.20+
- **Node.js**: 20+ (for local builds)
- **Git**: Latest version
- **SSL Certificate**: Valid SSL certificate for your domain

## 🔧 Pre-Deployment Setup

### 1. Server Preparation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Logout and login to apply docker group changes
```

### 2. Clone Repository

```bash
git clone https://github.com/yourusername/givemejobs-platform.git
cd givemejobs-platform
```

### 3. Environment Configuration

```bash
# Copy production environment files
cp packages/backend/.env.example packages/backend/.env.production
cp packages/frontend/.env.example packages/frontend/.env.production

# Edit configuration files
nano packages/backend/.env.production
nano packages/frontend/.env.production
```

### 4. SSL Certificate Setup

```bash
# Create SSL directory
mkdir -p nginx/ssl

# Copy your SSL certificates
cp /path/to/your/certificate.crt nginx/ssl/certificate.crt
cp /path/to/your/private.key nginx/ssl/private.key

# Set proper permissions
chmod 600 nginx/ssl/private.key
chmod 644 nginx/ssl/certificate.crt
```

## 🚀 Deployment Steps

### 1. Build and Deploy

```bash
# Build production images
docker-compose -f docker-compose.production.yml build

# Start all services
docker-compose -f docker-compose.production.yml up -d

# Check service status
docker-compose -f docker-compose.production.yml ps
```

### 2. Database Initialization

```bash
# Run database migrations
docker-compose -f docker-compose.production.yml exec backend npm run migrate:up

# Initialize MongoDB collections
docker-compose -f docker-compose.production.yml exec backend npm run mongo:init

# Test database connections
docker-compose -f docker-compose.production.yml exec backend npm run test:connections
```

### 3. Service Verification

```bash
# Check all services are healthy
docker-compose -f docker-compose.production.yml exec backend npm run check:all

# Test API endpoints
curl -f https://yourdomain.com/api/health
curl -f https://yourdomain.com/health

# Check logs
docker-compose -f docker-compose.production.yml logs -f backend
docker-compose -f docker-compose.production.yml logs -f frontend
```

## 🔒 Security Configuration

### 1. Firewall Setup

```bash
# Install UFW
sudo apt install ufw

# Configure firewall rules
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable
```

### 2. Fail2Ban Setup

```bash
# Install Fail2Ban
sudo apt install fail2ban

# Configure Fail2Ban for Nginx
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local

# Edit configuration
sudo nano /etc/fail2ban/jail.local

# Add Nginx jail
[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/error.log

# Restart Fail2Ban
sudo systemctl restart fail2ban
```

### 3. Security Headers Verification

```bash
# Test security headers
curl -I https://yourdomain.com

# Should include:
# - Strict-Transport-Security
# - X-Frame-Options: DENY
# - X-Content-Type-Options: nosniff
# - X-XSS-Protection: 1; mode=block
```

## 📊 Monitoring Setup

### 1. Access Monitoring Dashboards

- **Grafana**: https://yourdomain.com:3001 (admin/admin)
- **Prometheus**: https://yourdomain.com:9090
- **Kibana**: https://yourdomain.com:5601

### 2. Configure Alerts

```bash
# Edit Prometheus alert rules
nano monitoring/prometheus/alert_rules.yml

# Restart Prometheus
docker-compose -f docker-compose.production.yml restart prometheus
```

### 3. Log Management

```bash
# View application logs
docker-compose -f docker-compose.production.yml logs -f backend frontend

# View Nginx logs
docker-compose -f docker-compose.production.yml logs -f nginx

# Access Kibana for log analysis
# Navigate to http://yourdomain.com:5601
```

## 🔄 Backup and Recovery

### 1. Automated Backups

```bash
# Create backup script
cp packages/backend/backup.sh /usr/local/bin/givemejobs-backup
chmod +x /usr/local/bin/givemejobs-backup

# Set up cron job for daily backups
crontab -e

# Add this line for daily backup at 2 AM
0 2 * * * /usr/local/bin/givemejobs-backup
```

### 2. Manual Backup

```bash
# Create backup directory
mkdir -p /var/backups/givemejobs

# Backup databases
docker-compose -f docker-compose.production.yml exec postgres pg_dump -U givemejobs givemejobs_db > /var/backups/givemejobs/postgres_$(date +%Y%m%d).sql

docker-compose -f docker-compose.production.yml exec mongodb mongodump --uri="mongodb://givemejobs:password@localhost:27017/givemejobs_docs" --out=/var/backups/givemejobs/mongodb_$(date +%Y%m%d)

# Backup uploaded files
tar -czf /var/backups/givemejobs/uploads_$(date +%Y%m%d).tar.gz -C /var/lib/docker/volumes/givemejobs_backend-uploads/_data .
```

### 3. Recovery Process

```bash
# Stop services
docker-compose -f docker-compose.production.yml down

# Restore PostgreSQL
docker-compose -f docker-compose.production.yml up -d postgres
docker-compose -f docker-compose.production.yml exec postgres psql -U givemejobs -d givemejobs_db < /var/backups/givemejobs/postgres_YYYYMMDD.sql

# Restore MongoDB
docker-compose -f docker-compose.production.yml up -d mongodb
docker-compose -f docker-compose.production.yml exec mongodb mongorestore --uri="mongodb://givemejobs:password@localhost:27017/givemejobs_docs" /var/backups/givemejobs/mongodb_YYYYMMDD/givemejobs_docs

# Restore uploaded files
tar -xzf /var/backups/givemejobs/uploads_YYYYMMDD.tar.gz -C /var/lib/docker/volumes/givemejobs_backend-uploads/_data

# Start all services
docker-compose -f docker-compose.production.yml up -d
```

## 🔄 Updates and Maintenance

### 1. Application Updates

```bash
# Pull latest changes
git pull origin main

# Rebuild and deploy
docker-compose -f docker-compose.production.yml build
docker-compose -f docker-compose.production.yml up -d

# Run any new migrations
docker-compose -f docker-compose.production.yml exec backend npm run migrate:up
```

### 2. System Maintenance

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Clean up Docker
docker system prune -f
docker volume prune -f

# Rotate logs
sudo logrotate -f /etc/logrotate.d/givemejobs-backend
```

### 3. Health Monitoring

```bash
# Check service health
docker-compose -f docker-compose.production.yml exec backend npm run production:monitor

# View system resources
htop
df -h
free -h
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Service Won't Start
```bash
# Check logs
docker-compose -f docker-compose.production.yml logs service-name

# Check configuration
docker-compose -f docker-compose.production.yml config

# Restart specific service
docker-compose -f docker-compose.production.yml restart service-name
```

#### 2. Database Connection Issues
```bash
# Test database connections
docker-compose -f docker-compose.production.yml exec backend npm run test:connections

# Check database logs
docker-compose -f docker-compose.production.yml logs postgres mongodb redis
```

#### 3. SSL Certificate Issues
```bash
# Check certificate validity
openssl x509 -in nginx/ssl/certificate.crt -text -noout

# Test SSL configuration
openssl s_client -connect yourdomain.com:443
```

#### 4. High Memory Usage
```bash
# Check memory usage
docker stats

# Restart services if needed
docker-compose -f docker-compose.production.yml restart
```

### Emergency Procedures

#### 1. Service Outage
```bash
# Quick restart all services
docker-compose -f docker-compose.production.yml restart

# If that fails, full restart
docker-compose -f docker-compose.production.yml down
docker-compose -f docker-compose.production.yml up -d
```

#### 2. Database Corruption
```bash
# Stop application
docker-compose -f docker-compose.production.yml stop backend frontend

# Restore from latest backup (see Recovery Process above)

# Start application
docker-compose -f docker-compose.production.yml start backend frontend
```

## 📞 Support and Maintenance

### Monitoring Checklist
- [ ] All services running and healthy
- [ ] SSL certificate valid and not expiring soon
- [ ] Disk space > 20% free
- [ ] Memory usage < 80%
- [ ] CPU usage normal
- [ ] Backup completed successfully
- [ ] No critical errors in logs
- [ ] Security updates applied

### Performance Optimization
- Monitor response times via Grafana
- Optimize database queries if needed
- Scale services horizontally if required
- Implement CDN for static assets
- Enable Redis caching for frequently accessed data

### Security Maintenance
- Regular security updates
- Monitor failed login attempts
- Review access logs
- Update SSL certificates before expiry
- Regular security audits

---

## 🎉 Deployment Complete!

Your GiveMeJobs platform is now running in production. Access your application at:

- **Frontend**: https://yourdomain.com
- **API**: https://yourdomain.com/api
- **Monitoring**: https://yourdomain.com:3001 (Grafana)

For ongoing support and updates, refer to the project documentation and monitoring dashboards.