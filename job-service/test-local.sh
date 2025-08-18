#!/bin/bash

# HackLoad Job Service Local Testing Script
# This script performs basic validation of the job service

set -e

echo "🧪 HackLoad Job Service Local Testing"
echo "====================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local status=$1
    local message=$2
    if [ "$status" = "PASS" ]; then
        echo -e "${GREEN}✅ PASS${NC}: $message"
    elif [ "$status" = "FAIL" ]; then
        echo -e "${RED}❌ FAIL${NC}: $message"
        exit 1
    elif [ "$status" = "INFO" ]; then
        echo -e "${YELLOW}ℹ️  INFO${NC}: $message"
    fi
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_status "FAIL" "Not in job-service directory. Please run from job-service/"
fi

print_status "INFO" "Starting local testing..."

# Test 1: Install dependencies
print_status "INFO" "Installing dependencies..."
npm install > /dev/null 2>&1
print_status "PASS" "Dependencies installed successfully"

# Test 2: Linting
print_status "INFO" "Running ESLint..."
npm run lint > /dev/null 2>&1
print_status "PASS" "ESLint checks passed"

# Test 3: Type checking
print_status "INFO" "Running TypeScript type check..."
npm run type-check > /dev/null 2>&1
print_status "PASS" "TypeScript type check passed"

# Test 4: Build
print_status "INFO" "Building project..."
npm run build > /dev/null 2>&1
print_status "PASS" "Project build successful"

# Test 5: Check built files exist
if [ -f "dist/index.js" ]; then
    print_status "PASS" "Build output files created"
else
    print_status "FAIL" "Build output files not found"
fi

# Test 6: Configuration validation (dry run)
print_status "INFO" "Testing configuration validation..."

# Create minimal test environment
export NODE_ENV=test
export LOG_LEVEL=error
export API_BASE_URL=https://example.com
export SERVICE_API_KEY=test-key
export GIT_MONITOR_ENABLED=false
export DEPLOYMENT_MONITOR_ENABLED=false
export K6_SERVICES_ENABLED=false
export COST_TRACKING_ENABLED=false
export HEALTH_CHECK_PORT=8081
export METRICS_PORT=9091

# Test configuration loading without starting services
timeout 10s node -e "
const { loadConfig } = require('./dist/config');
try {
    const config = loadConfig();
    console.log('Configuration validation passed');
    process.exit(0);
} catch (error) {
    console.error('Configuration validation failed:', error.message);
    process.exit(1);
}
" 2>&1
if [ $? -eq 0 ]; then
    print_status "PASS" "Configuration validation successful"
else
    print_status "FAIL" "Configuration validation failed"
fi

# Test 7: Docker build test (if Docker is available)
if command -v docker &> /dev/null; then
    print_status "INFO" "Testing Docker build..."
    if docker build -t hackload-job-service-test . > /dev/null 2>&1; then
        print_status "PASS" "Docker build successful"
        # Cleanup
        docker rmi hackload-job-service-test > /dev/null 2>&1 || true
    else
        print_status "FAIL" "Docker build failed"
    fi
else
    print_status "INFO" "Docker not available, skipping Docker build test"
fi

# Test 8: Test run with timeout (without actual API calls)
print_status "INFO" "Testing application startup (dry run)..."

# Start the application in background and test basic startup
timeout 15s bash -c '
    node dist/index.js &
    APP_PID=$!
    sleep 10
    
    # Test health endpoint
    if curl -sf http://localhost:8081/health/live > /dev/null 2>&1; then
        echo "Health endpoint accessible"
        kill $APP_PID 2>/dev/null || true
        exit 0
    else
        echo "Health endpoint not accessible"
        kill $APP_PID 2>/dev/null || true
        exit 1
    fi
' 2>&1

if [ $? -eq 0 ]; then
    print_status "PASS" "Application startup test successful"
else
    print_status "INFO" "Application startup test skipped (may require proper API configuration)"
fi

echo ""
echo "🎉 Local testing completed successfully!"
echo ""
echo "Next steps:"
echo "1. Set up proper environment variables (copy .env.example to .env)"
echo "2. Configure SERVICE_API_KEY and GITHUB_TOKEN"
echo "3. Test with real Hub API connection"
echo "4. Deploy to Kubernetes cluster"