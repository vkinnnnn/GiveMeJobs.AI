#!/bin/bash

# Build Optimization Script
# This script analyzes and optimizes the production build

set -e

echo "========================================="
echo "GiveMeJobs Build Optimization"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 1. Clean previous builds
echo -e "${BLUE}1. Cleaning previous builds...${NC}"
rm -rf packages/backend/dist
rm -rf packages/frontend/.next
rm -rf packages/frontend/out
echo -e "${GREEN}✓ Build directories cleaned${NC}"
echo ""

# 2. Install dependencies
echo -e "${BLUE}2. Installing dependencies...${NC}"
npm ci --production=false
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# 3. Run type checking
echo -e "${BLUE}3. Running type checks...${NC}"
npm run type-check
echo -e "${GREEN}✓ Type checking passed${NC}"
echo ""

# 4. Build backend
echo -e "${BLUE}4. Building backend...${NC}"
cd packages/backend
npm run build

# Check backend build size
BACKEND_SIZE=$(du -sh dist | cut -f1)
echo -e "${GREEN}✓ Backend built successfully (Size: $BACKEND_SIZE)${NC}"
cd ../..
echo ""

# 5. Build frontend
echo -e "${BLUE}5. Building frontend...${NC}"
cd packages/frontend
npm run build

# Check frontend build size
FRONTEND_SIZE=$(du -sh .next | cut -f1)
echo -e "${GREEN}✓ Frontend built successfully (Size: $FRONTEND_SIZE)${NC}"
cd ../..
echo ""

# 6. Analyze bundle sizes
echo -e "${BLUE}6. Analyzing bundle sizes...${NC}"

# Backend analysis
echo "Backend bundle analysis:"
if [ -d "packages/backend/dist" ]; then
  find packages/backend/dist -name "*.js" -exec du -h {} \; | sort -rh | head -10
fi
echo ""

# Frontend analysis
echo "Frontend bundle analysis:"
if [ -d "packages/frontend/.next" ]; then
  find packages/frontend/.next/static -name "*.js" -exec du -h {} \; | sort -rh | head -10
fi
echo ""

# 7. Check for large dependencies
echo -e "${BLUE}7. Checking for large dependencies...${NC}"
echo "Top 10 largest node_modules:"
du -sh node_modules/* 2>/dev/null | sort -rh | head -10
echo ""

# 8. Optimize images (if any)
echo -e "${BLUE}8. Checking for unoptimized images...${NC}"
LARGE_IMAGES=$(find packages/frontend/public -type f \( -name "*.jpg" -o -name "*.png" \) -size +500k 2>/dev/null | wc -l)
if [ $LARGE_IMAGES -gt 0 ]; then
  echo -e "${YELLOW}⚠ Found $LARGE_IMAGES images larger than 500KB${NC}"
  echo "Consider optimizing these images"
else
  echo -e "${GREEN}✓ No large images found${NC}"
fi
echo ""

# 9. Check for source maps in production
echo -e "${BLUE}9. Checking for source maps...${NC}"
SOURCE_MAPS=$(find packages/frontend/.next -name "*.map" 2>/dev/null | wc -l)
if [ $SOURCE_MAPS -gt 0 ]; then
  echo -e "${YELLOW}⚠ Found $SOURCE_MAPS source map files${NC}"
  echo "Consider disabling source maps in production for security"
else
  echo -e "${GREEN}✓ No source maps found${NC}"
fi
echo ""

# 10. Generate build report
echo -e "${BLUE}10. Generating build report...${NC}"
cat > build-report.txt <<EOF
GiveMeJobs Build Report
Generated: $(date)

Build Sizes:
- Backend: $BACKEND_SIZE
- Frontend: $FRONTEND_SIZE

Bundle Analysis:
- Backend files: $(find packages/backend/dist -name "*.js" | wc -l) JavaScript files
- Frontend files: $(find packages/frontend/.next -name "*.js" | wc -l) JavaScript files

Optimization Recommendations:
EOF

# Add recommendations based on findings
if [ $LARGE_IMAGES -gt 0 ]; then
  echo "- Optimize $LARGE_IMAGES large images" >> build-report.txt
fi

if [ $SOURCE_MAPS -gt 0 ]; then
  echo "- Remove source maps from production build" >> build-report.txt
fi

# Check bundle sizes
FRONTEND_SIZE_MB=$(du -sm packages/frontend/.next | cut -f1)
if [ $FRONTEND_SIZE_MB -gt 50 ]; then
  echo "- Frontend bundle is large ($FRONTEND_SIZE_MB MB), consider code splitting" >> build-report.txt
fi

echo -e "${GREEN}✓ Build report generated: build-report.txt${NC}"
echo ""

# Summary
echo "========================================="
echo "Build Optimization Summary"
echo "========================================="
echo -e "Backend Size: ${GREEN}$BACKEND_SIZE${NC}"
echo -e "Frontend Size: ${GREEN}$FRONTEND_SIZE${NC}"
echo ""
echo "Build artifacts ready for deployment!"
echo ""

# Display recommendations
if [ -s build-report.txt ]; then
  echo "Recommendations:"
  grep "^-" build-report.txt
  echo ""
fi

echo "Next steps:"
echo "1. Review build-report.txt for optimization opportunities"
echo "2. Test the production build locally"
echo "3. Deploy to staging environment"
echo "4. Run performance tests"
echo "5. Deploy to production"
