#!/bin/bash

# Helper script to get team slugs from the database
# Usage: ./get-team-slugs.sh [DATABASE_URL]
#
# This script helps get team nicknames that can be used with add-psid-to-teams.sh
# when automatic team discovery is not available.

set -euo pipefail

# Configuration
DATABASE_URL="${1:-${DATABASE_URL:-}}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log() {
    echo -e "${BLUE}[INFO]${NC} $1" >&2
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" >&2
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

# Check if psql is available
check_dependencies() {
    if ! command -v psql &> /dev/null; then
        log_error "psql is required but not installed."
        log_error "Install PostgreSQL client tools or use Docker:"
        log_error "  docker run --rm -i postgres:15 psql \$DATABASE_URL -c \"SELECT nickname FROM teams ORDER BY name;\""
        exit 1
    fi
}

# Validate database URL
validate_database_url() {
    if [[ -z "$DATABASE_URL" ]]; then
        log_error "Database URL is required"
        echo "Usage: $0 [DATABASE_URL]" >&2
        echo "" >&2
        echo "Examples:" >&2
        echo "  $0 postgresql://user:pass@localhost:5432/dbname" >&2
        echo "  DATABASE_URL=postgresql://... $0" >&2
        echo "" >&2
        echo "You can also set the DATABASE_URL environment variable." >&2
        exit 1
    fi
}

# Get team slugs from database
get_team_slugs() {
    log "Connecting to database..."
    
    local query="SELECT nickname FROM teams WHERE nickname IS NOT NULL AND nickname != '' ORDER BY name;"
    
    if ! psql "$DATABASE_URL" -t -c "$query" 2>/dev/null; then
        log_error "Failed to connect to database or execute query"
        log_error "Please check your DATABASE_URL and database connectivity"
        exit 1
    fi
}

# Alternative: Use npx prisma to get team slugs
get_team_slugs_prisma() {
    log "Using Prisma to fetch team slugs..."
    
    if [[ ! -f "package.json" ]] || ! grep -q "prisma" package.json; then
        log_error "This doesn't appear to be a Prisma project"
        return 1
    fi
    
    # Create temporary script to fetch teams
    local temp_script=$(mktemp)
    cat > "$temp_script" << 'EOF'
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function getTeams() {
  try {
    const teams = await prisma.team.findMany({
      select: { nickname: true },
      where: { 
        nickname: { not: null },
        AND: { nickname: { not: '' } }
      },
      orderBy: { name: 'asc' }
    })
    
    teams.forEach(team => console.log(team.nickname))
  } catch (error) {
    console.error('Error:', error.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

getTeams()
EOF
    
    if ! node "$temp_script" 2>/dev/null; then
        rm -f "$temp_script"
        log_error "Failed to fetch teams using Prisma"
        return 1
    fi
    
    rm -f "$temp_script"
}

# Main execution
main() {
    validate_database_url
    
    log "Fetching team slugs from database..."
    
    # Try direct database connection first
    if check_dependencies 2>/dev/null && get_team_slugs; then
        log_success "Team slugs retrieved successfully"
    elif get_team_slugs_prisma 2>/dev/null; then
        log_success "Team slugs retrieved using Prisma" >&2
    else
        log_error "Failed to retrieve team slugs"
        echo "" >&2
        log_error "Alternative methods:" >&2
        echo "1. Use psql directly:" >&2
        echo "   psql \$DATABASE_URL -c \"SELECT nickname FROM teams ORDER BY name;\"" >&2
        echo "" >&2
        echo "2. Use Docker with psql:" >&2
        echo "   docker run --rm postgres:15 psql \$DATABASE_URL -c \"SELECT nickname FROM teams ORDER BY name;\"" >&2
        echo "" >&2
        echo "3. Access the dashboard at /dashboard/teams to see team nicknames" >&2
        exit 1
    fi
}

main "$@"