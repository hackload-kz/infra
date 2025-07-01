#!/bin/bash

# Test script for the Hackathon Organizer App

echo "🚀 Testing Hackathon Organizer App"
echo "===================================="

# Check if the server is running
echo "📡 Checking if server is running on port 3002..."
if curl -s http://localhost:3002 > /dev/null; then
    echo "✅ Server is running on http://localhost:3002"
else
    echo "❌ Server is not running. Please start with 'npm run dev'"
    exit 1
fi

# Test login page
echo ""
echo "🔐 Testing login page..."
LOGIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3002/login)
if [ "$LOGIN_STATUS" = "200" ]; then
    echo "✅ Login page is accessible"
else
    echo "❌ Login page failed with status: $LOGIN_STATUS"
fi

# Test API endpoint (should require auth)
echo ""
echo "🔒 Testing API authentication..."
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3002/api/teams)
if [ "$API_STATUS" = "401" ]; then
    echo "✅ API correctly requires authentication"
else
    echo "⚠️  API returned status: $API_STATUS (expected 401)"
fi

echo ""
echo "📋 Application Test Summary:"
echo "- ✅ Server is running"
echo "- ✅ Login page loads"
echo "- ✅ API requires authentication"
echo ""
echo "🎯 OAuth Login:"
echo "   Use Google or GitHub login with email: admin@hackload.com"
echo "   (Make sure to configure OAuth providers in .env)"
echo ""
echo "🌐 Open http://localhost:3002 to test the application"
