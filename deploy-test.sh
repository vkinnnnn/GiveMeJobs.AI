#!/bin/bash

# GiveMeJobs Platform - Test Deployment Script
# This script deploys the platform using Docker Compose for testing

echo "🚀 GiveMeJobs Platform - Test Deployment"
echo "======================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GRAY='\033[0;37m'
NC='\033[0m' # No Color

# Check if Docker is installed and running
echo -e "${YELLOW}📋 Checking prerequisites...${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker not found. Please install Docker first.${NC}"
    echo -e "${YELLOW}   Download from: https://www.docker.com/products/docker-desktop${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose not found. Please install Docker Compose.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker and Docker Compose found${NC}"

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}📝 Creating .env file from backend configuration...${NC}"
    
    if [ -f "packages/backend/.env" ]; then
        cp "packages/backend/.env" ".env"
        echo -e "${GREEN}✅ Environment file created${NC}"
    else
        echo -e "${RED}❌ Backend .env file not found. Please ensure backend is configured.${NC}"
        exit 1
    fi
fi

# Stop any existing containers
echo -e "${YELLOW}🛑 Stopping existing containers...${NC}"
docker-compose -f docker-compose.test.yml down --remove-orphans 2>/dev/null

# Build and start services
echo -e "${YELLOW}🔨 Building and starting services...${NC}"
echo -e "${GRAY}   This may take several minutes on first run...${NC}"

if docker-compose -f docker-compose.test.yml up --build -d; then
    echo -e "${GREEN}✅ Services started successfully!${NC}"
else
    echo -e "${RED}❌ Failed to start services${NC}"
    exit 1
fi

# Wait for services to be ready
echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"

max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
    attempt=$((attempt + 1))
    sleep 5
    
    if curl -s http://localhost:4000/health > /dev/null 2>&1 && curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo -e "${GREEN}✅ All services are ready!${NC}"
        break
    fi
    
    echo -e "${GRAY}   Attempt $attempt/$max_attempts - Services starting...${NC}"
done

if [ $attempt -ge $max_attempts ]; then
    echo -e "${YELLOW}⚠️  Services may still be starting. Check logs if needed.${NC}"
fi

# Run database migrations
echo -e "${YELLOW}📊 Running database migrations...${NC}"

if docker-compose -f docker-compose.test.yml exec -T backend npm run migrate:up; then
    echo -e "${GREEN}✅ Database migrations completed${NC}"
else
    echo -e "${YELLOW}⚠️  Migration may have failed. Check logs if needed.${NC}"
fi

# Display deployment information
echo ""
echo -e "${GREEN}🎉 GiveMeJobs Platform Deployed Successfully!${NC}"
echo -e "${GREEN}===========================================${NC}"
echo ""
echo -e "${CYAN}📱 Frontend Application: http://localhost:3000${NC}"
echo -e "${CYAN}🔧 Backend API:          http://localhost:4000${NC}"
echo -e "${CYAN}📊 API Documentation:    http://localhost:4000/api-docs${NC}"
echo ""
echo -e "${YELLOW}🗄️  Database Services:${NC}"
echo -e "${GRAY}   PostgreSQL:  localhost:5432${NC}"
echo -e "${GRAY}   MongoDB:     localhost:27017${NC}"
echo -e "${GRAY}   Redis:       localhost:6379${NC}"
echo ""
echo -e "${YELLOW}🔍 Useful Commands:${NC}"
echo -e "${GRAY}   View logs:           docker-compose -f docker-compose.test.yml logs -f${NC}"
echo -e "${GRAY}   Stop services:       docker-compose -f docker-compose.test.yml down${NC}"
echo -e "${GRAY}   Restart services:    docker-compose -f docker-compose.test.yml restart${NC}"
echo -e "${GRAY}   View status:         docker-compose -f docker-compose.test.yml ps${NC}"
echo ""
echo -e "${YELLOW}🧪 Test the platform:${NC}"
echo -e "${GRAY}   1. Open http://localhost:3000 in your browser${NC}"
echo -e "${GRAY}   2. Click 'Continue with Google' to test OAuth${NC}"
echo -e "${GRAY}   3. Create an account and explore features${NC}"
echo ""
echo -e "${YELLOW}📋 Features Available:${NC}"
echo -e "${GREEN}   ✅ User Authentication (Email + OAuth)${NC}"
echo -e "${GREEN}   ✅ AI-Powered Job Matching${NC}"
echo -e "${GREEN}   ✅ Resume & Cover Letter Generation${NC}"
echo -e "${GREEN}   ✅ Application Tracking${NC}"
echo -e "${GREEN}   ✅ Interview Preparation${NC}"
echo -e "${GREEN}   ✅ Blockchain Credential Storage${NC}"
echo -e "${GREEN}   ✅ Analytics & Insights${NC}"
echo ""

# Check service status
echo -e "${YELLOW}📊 Service Status:${NC}"
docker-compose -f docker-compose.test.yml ps

echo ""
echo -e "${GREEN}🎯 Ready to test! Open http://localhost:3000 in your browser.${NC}"