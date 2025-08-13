#!/bin/bash

# Script to add PSID environment property to all teams
# Usage: ./add-psid-to-teams.sh [API_BASE_URL] [SERVICE_API_KEY]
#
# Requirements:
# - curl
# - jq (for JSON processing)
# - Valid service API key with environment:write permissions

set -euo pipefail

# Configuration
DEFAULT_API_BASE_URL="http://localhost:3000"
API_BASE_URL="${1:-$DEFAULT_API_BASE_URL}"
SERVICE_API_KEY="${2:-}"

# PSID Configuration
PSID_KEY="PSID"
PSID_VALUE="Заполни меня"
PSID_CATEGORY="cloud"
PSID_DESCRIPTION="ID Платежного аккаунта PS.KZ"
PSID_IS_SECURE=false
PSID_IS_EDITABLE=true

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Validate dependencies
check_dependencies() {
    if ! command -v curl &> /dev/null; then
        log_error "curl is required but not installed."
        exit 1
    fi

    if ! command -v jq &> /dev/null; then
        log_error "jq is required but not installed."
        exit 1
    fi
}

# Validate input parameters
validate_params() {
    if [[ -z "$SERVICE_API_KEY" ]]; then
        log_error "Service API key is required"
        echo "Usage: $0 [API_BASE_URL] SERVICE_API_KEY"
        echo ""
        echo "Example:"
        echo "  $0 http://localhost:3000 sk-1234567890abcdef..."
        echo "  $0 https://your-domain.com sk-1234567890abcdef..."
        exit 1
    fi

    log "Using API base URL: $API_BASE_URL"
    log "Service API key provided: ${SERVICE_API_KEY:0:10}..."
}

# Fetch all teams using the dashboard teams API
fetch_teams() {
    log "Fetching all teams..."
    
    # Note: This endpoint requires authentication, but we'll use a simpler approach
    # by directly accessing the database through the service API pattern
    # For now, we'll need to get team slugs manually or use a different approach
    
    # Alternative: Use a predefined list of team slugs or fetch from database
    # For this example, we'll demonstrate with a way to discover teams
    
    local teams_endpoint="${API_BASE_URL}/api/dashboard/teams"
    
    # Try to fetch teams (this may require session authentication)
    local teams_response
    teams_response=$(curl -s -w "\n%{http_code}" "$teams_endpoint" || echo "000")
    local teams_http_code
    teams_http_code=$(echo "$teams_response" | tail -n1)
    local teams_body
    teams_body=$(echo "$teams_response" | head -n -1)
    
    if [[ "$teams_http_code" == "200" ]]; then
        echo "$teams_body" | jq -r '.[].nickname'
    else
        log_warning "Could not fetch teams via API (HTTP $teams_http_code)"
        log "You may need to provide team slugs manually or use database access"
        return 1
    fi
}

# Add PSID environment variable to a specific team
add_psid_to_team() {
    local team_slug="$1"
    log "Adding PSID environment variable to team: $team_slug"
    
    local endpoint="${API_BASE_URL}/api/service/teams/${team_slug}/environment/${PSID_KEY}"
    
    local payload
    payload=$(cat <<EOF
{
  "value": "$PSID_VALUE",
  "description": "$PSID_DESCRIPTION",
  "category": "$PSID_CATEGORY",
  "isSecure": $PSID_IS_SECURE,
  "isEditable": $PSID_IS_EDITABLE
}
EOF
    )
    
    log "Sending request to: $endpoint"
    
    local response
    response=$(curl -s -w "\n%{http_code}" \
        -X PUT \
        -H "Content-Type: application/json" \
        -H "X-API-Key: $SERVICE_API_KEY" \
        -d "$payload" \
        "$endpoint" || echo "000")
    
    local http_code
    http_code=$(echo "$response" | tail -n1)
    local body
    body=$(echo "$response" | head -n -1)
    
    case "$http_code" in
        200)
            log_success "Successfully added PSID to team $team_slug"
            echo "$body" | jq '.' 2>/dev/null || echo "$body"
            return 0
            ;;
        401)
            log_error "Authentication failed for team $team_slug - Check your API key"
            return 1
            ;;
        403)
            log_error "Insufficient permissions for team $team_slug"
            return 1
            ;;
        404)
            log_error "Team $team_slug not found"
            return 1
            ;;
        *)
            log_error "Failed to add PSID to team $team_slug (HTTP $http_code)"
            echo "$body"
            return 1
            ;;
    esac
}

# Add PSID environment variable to multiple teams using bulk update
bulk_add_psid_to_team() {
    local team_slug="$1"
    log "Bulk adding PSID environment variable to team: $team_slug"
    
    local endpoint="${API_BASE_URL}/api/service/teams/environment"
    
    local payload
    payload=$(cat <<EOF
{
  "teamSlug": "$team_slug",
  "updates": [
    {
      "key": "$PSID_KEY",
      "value": "$PSID_VALUE",
      "description": "$PSID_DESCRIPTION",
      "category": "$PSID_CATEGORY",
      "isSecure": $PSID_IS_SECURE,
      "isEditable": $PSID_IS_EDITABLE
    }
  ]
}
EOF
    )
    
    log "Sending bulk request to: $endpoint"
    
    local response
    response=$(curl -s -w "\n%{http_code}" \
        -X PUT \
        -H "Content-Type: application/json" \
        -H "X-API-Key: $SERVICE_API_KEY" \
        -d "$payload" \
        "$endpoint" || echo "000")
    
    local http_code
    http_code=$(echo "$response" | tail -n1)
    local body
    body=$(echo "$response" | head -n -1)
    
    case "$http_code" in
        200)
            log_success "Successfully bulk added PSID to team $team_slug"
            echo "$body" | jq '.' 2>/dev/null || echo "$body"
            return 0
            ;;
        401)
            log_error "Authentication failed for team $team_slug - Check your API key"
            return 1
            ;;
        403)
            log_error "Insufficient permissions for team $team_slug"
            return 1
            ;;
        404)
            log_error "Team $team_slug not found"
            return 1
            ;;
        *)
            log_error "Failed to bulk add PSID to team $team_slug (HTTP $http_code)"
            echo "$body"
            return 1
            ;;
    esac
}

# Process teams from command line arguments or stdin
process_teams() {
    local teams=()
    
    # Check if team slugs are provided as additional arguments
    if [[ $# -gt 2 ]]; then
        # Team slugs provided as arguments
        for ((i=3; i<=$#; i++)); do
            teams+=("${!i}")
        done
        log "Processing ${#teams[@]} teams from command line arguments"
    else
        # Try to fetch teams automatically
        log "No team slugs provided, attempting to fetch automatically..."
        
        local fetched_teams
        if fetched_teams=$(fetch_teams); then
            while IFS= read -r team_slug; do
                [[ -n "$team_slug" ]] && teams+=("$team_slug")
            done <<< "$fetched_teams"
            log "Found ${#teams[@]} teams automatically"
        else
            log_error "Could not fetch teams automatically"
            log "Please provide team slugs as arguments:"
            log "Usage: $0 [API_BASE_URL] SERVICE_API_KEY team1 team2 team3 ..."
            exit 1
        fi
    fi
    
    if [[ ${#teams[@]} -eq 0 ]]; then
        log_error "No teams to process"
        exit 1
    fi
    
    # Process each team
    local success_count=0
    local error_count=0
    
    log "Starting to add PSID environment variable to ${#teams[@]} teams..."
    echo ""
    
    for team_slug in "${teams[@]}"; do
        echo "----------------------------------------"
        if add_psid_to_team "$team_slug"; then
            ((success_count++))
        else
            ((error_count++))
        fi
        echo ""
    done
    
    echo "========================================"
    log_success "Processing completed!"
    log "Successfully processed: $success_count teams"
    [[ $error_count -gt 0 ]] && log_warning "Failed to process: $error_count teams"
    
    return $error_count
}

# Main execution
main() {
    echo "========================================"
    echo "PSID Environment Variable Setup Script"
    echo "========================================"
    echo ""
    
    check_dependencies
    validate_params
    
    echo ""
    log "Configuration:"
    log "  Key: $PSID_KEY"
    log "  Value: $PSID_VALUE"
    log "  Category: $PSID_CATEGORY"
    log "  Description: $PSID_DESCRIPTION"
    log "  Is Secure: $PSID_IS_SECURE"
    log "  Is Editable: $PSID_IS_EDITABLE"
    echo ""
    
    process_teams "$@"
}

# Run main function with all arguments
main "$@"