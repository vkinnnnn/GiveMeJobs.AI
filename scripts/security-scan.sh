#!/bin/bash

# Security Scanning Script
# This script runs various security checks on the codebase

set -e

echo "========================================="
echo "GiveMeJobs Security Scan"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track issues found
CRITICAL_ISSUES=0
HIGH_ISSUES=0
MEDIUM_ISSUES=0
LOW_ISSUES=0

# Function to print colored output
print_status() {
  if [ "$1" == "PASS" ]; then
    echo -e "${GREEN}✓ $2${NC}"
  elif [ "$1" == "FAIL" ]; then
    echo -e "${RED}✗ $2${NC}"
  elif [ "$1" == "WARN" ]; then
    echo -e "${YELLOW}⚠ $2${NC}"
  else
    echo "$2"
  fi
}

# 1. NPM Audit
echo "1. Running npm audit..."
echo "-----------------------------------"
if npm audit --audit-level=moderate; then
  print_status "PASS" "No moderate or higher vulnerabilities found"
else
  print_status "FAIL" "Vulnerabilities found in dependencies"
  AUDIT_RESULT=$(npm audit --json)
  CRITICAL=$(echo $AUDIT_RESULT | grep -o '"critical":[0-9]*' | grep -o '[0-9]*' || echo "0")
  HIGH=$(echo $AUDIT_RESULT | grep -o '"high":[0-9]*' | grep -o '[0-9]*' || echo "0")
  MEDIUM=$(echo $AUDIT_RESULT | grep -o '"moderate":[0-9]*' | grep -o '[0-9]*' || echo "0")
  
  CRITICAL_ISSUES=$((CRITICAL_ISSUES + CRITICAL))
  HIGH_ISSUES=$((HIGH_ISSUES + HIGH))
  MEDIUM_ISSUES=$((MEDIUM_ISSUES + MEDIUM))
fi
echo ""

# 2. Check for hardcoded secrets
echo "2. Scanning for hardcoded secrets..."
echo "-----------------------------------"
SECRET_PATTERNS=(
  "password\s*=\s*['\"][^'\"]*['\"]"
  "api[_-]?key\s*=\s*['\"][^'\"]*['\"]"
  "secret\s*=\s*['\"][^'\"]*['\"]"
  "token\s*=\s*['\"][^'\"]*['\"]"
  "private[_-]?key\s*=\s*['\"][^'\"]*['\"]"
  "aws[_-]?access[_-]?key"
  "AKIA[0-9A-Z]{16}"
)

SECRETS_FOUND=0
for pattern in "${SECRET_PATTERNS[@]}"; do
  if grep -r -i -E "$pattern" --include="*.ts" --include="*.js" --exclude-dir=node_modules --exclude-dir=dist . > /dev/null 2>&1; then
    SECRETS_FOUND=$((SECRETS_FOUND + 1))
  fi
done

if [ $SECRETS_FOUND -eq 0 ]; then
  print_status "PASS" "No hardcoded secrets found"
else
  print_status "FAIL" "Potential hardcoded secrets found: $SECRETS_FOUND"
  CRITICAL_ISSUES=$((CRITICAL_ISSUES + SECRETS_FOUND))
fi
echo ""

# 3. Check for console.log statements
echo "3. Checking for console.log statements..."
echo "-----------------------------------"
CONSOLE_LOGS=$(grep -r "console\.log" --include="*.ts" --include="*.js" --exclude-dir=node_modules --exclude-dir=dist packages/ | wc -l)
if [ $CONSOLE_LOGS -eq 0 ]; then
  print_status "PASS" "No console.log statements found"
else
  print_status "WARN" "Found $CONSOLE_LOGS console.log statements (should use logger)"
  LOW_ISSUES=$((LOW_ISSUES + 1))
fi
echo ""

# 4. Check for TODO/FIXME comments
echo "4. Checking for TODO/FIXME comments..."
echo "-----------------------------------"
TODO_COUNT=$(grep -r -i "TODO\|FIXME" --include="*.ts" --include="*.js" --exclude-dir=node_modules --exclude-dir=dist packages/ | wc -l)
if [ $TODO_COUNT -eq 0 ]; then
  print_status "PASS" "No TODO/FIXME comments found"
else
  print_status "WARN" "Found $TODO_COUNT TODO/FIXME comments"
  LOW_ISSUES=$((LOW_ISSUES + 1))
fi
echo ""

# 5. Check for proper error handling
echo "5. Checking error handling..."
echo "-----------------------------------"
UNHANDLED_PROMISES=$(grep -r "\.then(" --include="*.ts" --include="*.js" --exclude-dir=node_modules --exclude-dir=dist packages/ | grep -v "\.catch(" | wc -l)
if [ $UNHANDLED_PROMISES -eq 0 ]; then
  print_status "PASS" "All promises have error handling"
else
  print_status "WARN" "Found $UNHANDLED_PROMISES promises without .catch()"
  MEDIUM_ISSUES=$((MEDIUM_ISSUES + 1))
fi
echo ""

# 6. Check for SQL injection vulnerabilities
echo "6. Checking for SQL injection vulnerabilities..."
echo "-----------------------------------"
SQL_CONCAT=$(grep -r "query.*+\|query.*\${" --include="*.ts" --include="*.js" --exclude-dir=node_modules --exclude-dir=dist packages/backend/ | wc -l)
if [ $SQL_CONCAT -eq 0 ]; then
  print_status "PASS" "No SQL string concatenation found"
else
  print_status "FAIL" "Found $SQL_CONCAT potential SQL injection points"
  HIGH_ISSUES=$((HIGH_ISSUES + SQL_CONCAT))
fi
echo ""

# 7. Check for eval() usage
echo "7. Checking for eval() usage..."
echo "-----------------------------------"
EVAL_USAGE=$(grep -r "eval(" --include="*.ts" --include="*.js" --exclude-dir=node_modules --exclude-dir=dist packages/ | wc -l)
if [ $EVAL_USAGE -eq 0 ]; then
  print_status "PASS" "No eval() usage found"
else
  print_status "FAIL" "Found $EVAL_USAGE eval() calls (security risk)"
  CRITICAL_ISSUES=$((CRITICAL_ISSUES + EVAL_USAGE))
fi
echo ""

# 8. Check environment variables
echo "8. Checking environment variable usage..."
echo "-----------------------------------"
if [ -f ".env" ]; then
  print_status "WARN" ".env file found in repository (should be in .gitignore)"
  MEDIUM_ISSUES=$((MEDIUM_ISSUES + 1))
else
  print_status "PASS" "No .env file in repository"
fi

if [ -f ".env.example" ]; then
  print_status "PASS" ".env.example file exists"
else
  print_status "WARN" ".env.example file missing"
  LOW_ISSUES=$((LOW_ISSUES + 1))
fi
echo ""

# 9. Check for weak cryptography
echo "9. Checking for weak cryptography..."
echo "-----------------------------------"
WEAK_CRYPTO=$(grep -r "md5\|sha1\|DES\|RC4" --include="*.ts" --include="*.js" --exclude-dir=node_modules --exclude-dir=dist packages/ | wc -l)
if [ $WEAK_CRYPTO -eq 0 ]; then
  print_status "PASS" "No weak cryptography algorithms found"
else
  print_status "FAIL" "Found $WEAK_CRYPTO uses of weak cryptography"
  HIGH_ISSUES=$((HIGH_ISSUES + WEAK_CRYPTO))
fi
echo ""

# 10. Check TypeScript strict mode
echo "10. Checking TypeScript configuration..."
echo "-----------------------------------"
if grep -q '"strict": true' tsconfig.json; then
  print_status "PASS" "TypeScript strict mode enabled"
else
  print_status "WARN" "TypeScript strict mode not enabled"
  MEDIUM_ISSUES=$((MEDIUM_ISSUES + 1))
fi
echo ""

# 11. Check for CORS configuration
echo "11. Checking CORS configuration..."
echo "-----------------------------------"
CORS_WILDCARD=$(grep -r "origin.*\*" --include="*.ts" --include="*.js" --exclude-dir=node_modules --exclude-dir=dist packages/backend/ | wc -l)
if [ $CORS_WILDCARD -eq 0 ]; then
  print_status "PASS" "No CORS wildcard origins found"
else
  print_status "FAIL" "Found $CORS_WILDCARD CORS wildcard configurations"
  HIGH_ISSUES=$((HIGH_ISSUES + CORS_WILDCARD))
fi
echo ""

# 12. Check for rate limiting
echo "12. Checking rate limiting implementation..."
echo "-----------------------------------"
if grep -r "rateLimit\|rate-limit" --include="*.ts" --include="*.js" --exclude-dir=node_modules --exclude-dir=dist packages/backend/ > /dev/null; then
  print_status "PASS" "Rate limiting implemented"
else
  print_status "WARN" "Rate limiting not found"
  HIGH_ISSUES=$((HIGH_ISSUES + 1))
fi
echo ""

# Summary
echo ""
echo "========================================="
echo "Security Scan Summary"
echo "========================================="
echo -e "${RED}Critical Issues: $CRITICAL_ISSUES${NC}"
echo -e "${RED}High Issues: $HIGH_ISSUES${NC}"
echo -e "${YELLOW}Medium Issues: $MEDIUM_ISSUES${NC}"
echo -e "${YELLOW}Low Issues: $LOW_ISSUES${NC}"
echo ""

TOTAL_ISSUES=$((CRITICAL_ISSUES + HIGH_ISSUES + MEDIUM_ISSUES + LOW_ISSUES))

if [ $TOTAL_ISSUES -eq 0 ]; then
  echo -e "${GREEN}✓ All security checks passed!${NC}"
  exit 0
elif [ $CRITICAL_ISSUES -gt 0 ] || [ $HIGH_ISSUES -gt 0 ]; then
  echo -e "${RED}✗ Critical or high severity issues found. Please fix before deploying.${NC}"
  exit 1
else
  echo -e "${YELLOW}⚠ Some issues found. Review and fix when possible.${NC}"
  exit 0
fi
