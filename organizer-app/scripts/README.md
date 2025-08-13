# HackLoad 2025 Team Management Scripts

Simple, focused scripts for managing HackLoad 2025 team environments, repositories, and PSID values.

## Overview

This collection provides four main scripts:

1. **`team-env-api.py`** - Core environment variable management
2. **`github-repo-manager.py`** - GitHub repository creation and permissions
3. **`psid-manager.py`** - PSID value management
4. **`godaddy-subdomain-manager.py`** - GoDaddy subdomain management and domain environment variables

All scripts support dry-run mode and work with approved teams only (`teamStatus: "APPROVED"`).

## Requirements

### System Requirements
- Python 3.7+
- `requests` library: `pip install requests`

### API Access
- **Service API Key**: For managing team environment variables
- **GitHub Personal Access Token**: For repository management
- **GoDaddy API Key & Secret**: For DNS subdomain management

### Data Files
- `approved-teams.json` - Team data export from the system
- `approved-members.json` - Member data with GitHub URLs (optional, for repository management)

## Environment Variables

Set these environment variables or pass them as command-line arguments:

```bash
export SERVICE_API_KEY="sk_your_service_key_here"
export GITHUB_TOKEN="ghp_your_github_token_here"
export GODADDY_API_KEY="your_godaddy_api_key"
export GODADDY_API_SECRET="your_godaddy_api_secret"
export TARGET_IP_ADDRESS="192.168.1.100"  # IP address for A records
export API_BASE_URL="https://hub.hackload.kz"  # Optional, defaults to this
export GITHUB_ORG="hackload-kz"  # Optional, defaults to hackload-kz
export GODADDY_DOMAIN="hackload.kz"  # Optional, defaults to hackload.kz
```

## Scripts Documentation

### 1. Team Environment API (`team-env-api.py`)

Core script for managing team environment variables.

#### Usage Examples

```bash
# List all approved teams
./team-env-api.py list

# Get environment variables for a specific team
./team-env-api.py get --team rorobotics

# Set a variable for all approved teams
./team-env-api.py set API_KEY "secret123" --description "API access key"

# Set a secure, read-only variable for a specific team
./team-env-api.py set DATABASE_URL "postgresql://..." \
  --team rorobotics --secure --readonly --category database

# Delete a variable from all approved teams
./team-env-api.py delete OLD_VAR

# Dry run (show what would be done)
./team-env-api.py set TEST_VAR "value" --dry-run
```

#### Command Reference

- `list` - Show all approved teams
- `get --team TEAM` - Get environment variables for a team  
- `set KEY VALUE [options]` - Set environment variable
- `delete KEY [options]` - Delete environment variable

#### Set Command Options
- `--team TEAM` - Apply to specific team (default: all approved teams)
- `--description TEXT` - Variable description
- `--category CATEGORY` - Variable category (default: general)
- `--secure` - Mark as secure/sensitive
- `--readonly` - Mark as read-only (not editable by team)

### 2. GitHub Repository Manager (`github-repo-manager.py`)

Creates GitHub repositories and manages team member access.

#### Usage Examples

```bash
# Create repositories for all approved teams with member access
./github-repo-manager.py

# Dry run to see what would be done
./github-repo-manager.py --dry-run

# Create repositories without setting environment variables
./github-repo-manager.py --no-env-vars

# Use custom files and settings
./github-repo-manager.py \
  --teams-file custom-teams.json \
  --members-file custom-members.json \
  --github-org my-org
```

#### What It Does

For each approved team:

1. **Creates GitHub Repository**
   - Name: `teamNickname` from approved-teams.json
   - Description: "HackLoad 2025 - Репозиторий команды {teamName}"
   - Public repository with MIT license
   - Auto-initialized with README

2. **Manages Collaborator Access**
   - Adds team members as collaborators with push permissions
   - Removes unauthorized collaborators (protects org admins)
   - Syncs permissions based on team membership

3. **Sets Environment Variable** (unless `--no-env-vars`)
   - Adds `Repo` environment variable with repository URL
   - Read-only variable for team reference

#### Member Data Requirements

The `approved-members.json` file should contain:

```json
{
  "data": [
    {
      "email": "member@example.com",
      "githubUrl": "https://github.com/username"
    }
  ]
}
```

### 3. PSID Manager (`psid-manager.py`)

Manages PSID (Payment System ID) values for teams.

#### Usage Examples

```bash
# List current PSID values for all teams
./psid-manager.py list

# Update PSIDs from a CSV file
./psid-manager.py update psid-mappings.csv

# Update PSIDs from a JSON file  
./psid-manager.py update psid-mappings.json

# Set PSID for a specific team
./psid-manager.py set rorobotics 123456

# Export current PSIDs to CSV
./psid-manager.py export current-psids.csv

# Export current PSIDs to JSON
./psid-manager.py export current-psids.json

# Dry run update
./psid-manager.py update psid-mappings.csv --dry-run
```

#### PSID File Formats

**CSV Format:**
```csv
team,psid
rorobotics,123456
team-1011,789012
```

**JSON Format:**
```json
{
  "rorobotics": "123456",
  "team-1011": "789012"
}
```

Or as array:
```json
[
  {"team": "rorobotics", "psid": "123456"},
  {"team": "team-1011", "psid": "789012"}
]
```

#### Command Reference

- `list` - Show PSID status for all approved teams
- `update FILE` - Update PSIDs from CSV or JSON file
- `export FILE` - Export current PSIDs to CSV or JSON
- `set TEAM PSID` - Set PSID for specific team

## Common Workflows

### Initial Setup

```bash
# 1. Create repositories for all teams
./github-repo-manager.py --dry-run  # Preview first
./github-repo-manager.py

# 2. Set up common environment variables
./team-env-api.py set NODE_ENV "production" --readonly
./team-env-api.py set API_BASE_URL "https://api.example.com" --readonly

# 3. Update PSIDs from provided file
./psid-manager.py update team-psids.csv
```

### Daily Operations

```bash
# Check PSID status
./psid-manager.py list

# Add new environment variable for all teams
./team-env-api.py set NEW_FEATURE_FLAG "true" --description "Enable new feature"

# Update specific team's PSID
./psid-manager.py set team-name 987654
```

### Maintenance

```bash
# Export current state for backup
./psid-manager.py export backup-psids-$(date +%Y%m%d).json

# Audit team environment variables
./team-env-api.py get --team rorobotics

# Dry run before bulk changes
./team-env-api.py set MAINTENANCE_MODE "true" --dry-run
```

### 4. GoDaddy Subdomain Manager (`godaddy-subdomain-manager.py`)

Manages GoDaddy DNS A records for team subdomains and automatically sets the MAIN_DOMAIN environment variable.

#### Key Features
- **Subdomain Creation**: Creates `teamname.domain.com` A records pointing to specified IP
- **Environment Integration**: Automatically sets `MAIN_DOMAIN` env var for each team
- **Prefix Support**: Optional prefix for environments (e.g., `dev-teamname.domain.com`)
- **Validation**: Comprehensive domain access and IP address validation
- **Safety**: Checks for existing subdomains, supports force recreation

#### Prerequisites
- GoDaddy API credentials with DNS management access
- Target IP address for A records
- **Important**: GoDaddy now requires accounts to have 10+ domains OR Premium Discount Domain Club for API access

#### Usage Examples

```bash
# Validate GoDaddy API access
./godaddy-subdomain-manager.py validate

# List existing A records
./godaddy-subdomain-manager.py list

# Create subdomains for all approved teams
./godaddy-subdomain-manager.py create --ip-address 192.168.1.100

# Create subdomain for specific team with prefix
./godaddy-subdomain-manager.py create --team rorobotics --ip-address 192.168.1.100 --subdomain-prefix dev

# Force recreate existing subdomains
./godaddy-subdomain-manager.py create --ip-address 192.168.1.100 --force-recreate

# Delete subdomains for all teams
./godaddy-subdomain-manager.py delete

# Use test environment (OTE)
./godaddy-subdomain-manager.py create --ip-address 192.168.1.100 --use-ote

# Skip environment variable updates
./godaddy-subdomain-manager.py create --ip-address 192.168.1.100 --skip-env-vars
```

#### Command Options

| Option | Description | Default |
|--------|-------------|---------|
| `--godaddy-api-key` | GoDaddy API Key | `$GODADDY_API_KEY` |
| `--godaddy-api-secret` | GoDaddy API Secret | `$GODADDY_API_SECRET` |
| `--domain` | Main domain name | `hackload.kz` |
| `--ip-address` | Target IP for A records | `$TARGET_IP_ADDRESS` |
| `--subdomain-prefix` | Prefix for subdomains | None |
| `--use-ote` | Use test environment | False |
| `--force-recreate` | Recreate existing subdomains | False |
| `--skip-env-vars` | Skip MAIN_DOMAIN env var updates | False |
| `--team` | Process specific team only | All approved teams |

#### Expected Results
- **DNS Records**: `teamname.domain.com` A record pointing to specified IP
- **Environment Variables**: `MAIN_DOMAIN=teamname.domain.com` set for each team
- **TTL**: 600 seconds (GoDaddy minimum requirement)
- **Propagation**: DNS changes typically take effect within 1 hour

#### Special Configuration: `team.hub.hackload.kz` Pattern

To create subdomains like `rorobotics.hub.hackload.kz`:

```bash
# Use hub.hackload.kz as the base domain
export GODADDY_DOMAIN="hub.hackload.kz"
./godaddy-subdomain-manager.py --domain hub.hackload.kz --ip-address 192.168.1.100 create

# This creates:
# - rorobotics.hub.hackload.kz -> 192.168.1.100
# - team-1011.hub.hackload.kz -> 192.168.1.100
# - Sets MAIN_DOMAIN=rorobotics.hub.hackload.kz for each team
```

**Prerequisites**: Ensure `hub.hackload.kz` is properly configured as a subdomain and managed by your GoDaddy account.

#### Common Issues

1. **ACCESS_DENIED Error**:
   - Account needs 10+ domains OR Premium Discount Domain Club
   - Verify API credentials are for production (not OTE) environment

2. **Domain Not Found**:
   - Ensure domain is managed by the GoDaddy account
   - Check domain spelling and API environment (production vs OTE)

3. **Rate Limiting**:
   - Script automatically handles GoDaddy's 60 requests/minute limit
   - Large batch operations include delays between requests

4. **TTL Errors**:
   - Script automatically sets minimum TTL of 600 seconds
   - Cannot use TTL values below GoDaddy's requirement

## Error Handling

All scripts include comprehensive error handling:

- **Missing files**: Clear error messages with suggestions
- **API failures**: Detailed error reporting with HTTP status codes
- **Rate limiting**: Built-in delays between API calls
- **Partial failures**: Continue processing other teams, report summary
- **Invalid data**: Skip invalid entries with warnings

## Security Notes

- **API Keys**: Store in environment variables, never in code
- **GitHub Tokens**: Use tokens with minimal required permissions
- **Secure Variables**: Use `--secure` flag for sensitive data
- **Read-only Variables**: Use `--readonly` for configuration that teams shouldn't modify
- **Repository Access**: Team members get push permission, not admin

## Troubleshooting

### Common Issues

1. **"API key is required"**
   - Set `SERVICE_API_KEY` environment variable
   - Or use `--api-key` parameter

2. **"GitHub token is required"**  
   - Set `GITHUB_TOKEN` environment variable
   - Or use `--github-token` parameter

3. **"Teams file not found"**
   - Ensure `approved-teams.json` exists in current directory
   - Or specify path with `--teams-file`

4. **"Repository already exists"**
   - This is normal - script will update collaborators
   - Repository creation is idempotent

5. **"No GitHub URL found for member"**
   - Check that `approved-members.json` contains GitHub URLs
   - Verify email addresses match between files

6. **Rate limiting errors**
   - Scripts include built-in delays
   - For large teams, consider running in smaller batches

7. **"ACCESS_DENIED" from GoDaddy API**
   - Account needs 10+ domains OR Premium Discount Domain Club
   - Verify using production API credentials, not OTE test credentials
   - Set `GODADDY_API_KEY` and `GODADDY_API_SECRET` environment variables

8. **"Domain not found" from GoDaddy**
   - Ensure domain is managed by your GoDaddy account
   - For `hub.hackload.kz` pattern, verify subdomain is properly configured
   - Check API environment (production vs OTE)

### Debug Mode

Use `--dry-run` with any script to see what would be done without making changes:

```bash
./team-env-api.py set DEBUG "true" --dry-run
./github-repo-manager.py --dry-run
./psid-manager.py update psids.csv --dry-run
./godaddy-subdomain-manager.py validate --dry-run
./godaddy-subdomain-manager.py create --ip-address 192.168.1.100 --team rorobotics --dry-run
```

## Migration from Old Scripts

If migrating from the complex previous scripts:

1. **Export current data**:
   ```bash
   ./psid-manager.py export current-state.json
   ```

2. **Test with dry-run**:
   ```bash
   ./github-repo-manager.py --dry-run
   ```

3. **Run new scripts**:
   ```bash
   ./github-repo-manager.py
   ```

The new scripts are designed to be safe and idempotent - running them multiple times won't cause issues.

## Support

For issues or questions:
1. Check this documentation
2. Use `--dry-run` to preview changes
3. Review script output for specific error messages
4. Check GitHub repository issues for known problems