#!/bin/bash

# Example usage of the PSID setup script
# This demonstrates different ways to use the add-psid-to-teams.sh script

echo "PSID Setup Script - Usage Examples"
echo "=================================="
echo ""

# Check if the main script exists
if [[ ! -f "./add-psid-to-teams.sh" ]]; then
    echo "Error: add-psid-to-teams.sh not found in current directory"
    exit 1
fi

echo "Available usage methods:"
echo ""

echo "1. Automatic team discovery (requires API access):"
echo "   ./add-psid-to-teams.sh http://localhost:3000 sk-your-service-key-here"
echo ""

echo "2. Manual team list:"
echo "   ./add-psid-to-teams.sh http://localhost:3000 sk-your-service-key-here team1 team2 team3"
echo ""

echo "3. Get team slugs first (if auto-discovery fails):"
echo "   # Get team slugs from database"
echo "   ./get-team-slugs.sh postgresql://user:pass@localhost:5432/dbname"
echo ""
echo "   # Then use the team slugs with the main script"
echo "   ./add-psid-to-teams.sh http://localhost:3000 sk-key \$(./get-team-slugs.sh \$DATABASE_URL)"
echo ""

echo "4. Production example:"
echo "   ./add-psid-to-teams.sh https://hub.hackload.kz sk-production-key-here"
echo ""

echo "5. Using environment variables:"
echo "   export HACKLOAD_API_URL=\"https://hub.hackload.kz\""
echo "   export HACKLOAD_SERVICE_KEY=\"sk-your-key-here\""
echo "   ./add-psid-to-teams.sh \$HACKLOAD_API_URL \$HACKLOAD_SERVICE_KEY"
echo ""

echo "Note: Replace 'sk-your-service-key-here' with your actual service API key"
echo "      Service keys can be created in the admin dashboard at /dashboard/security"