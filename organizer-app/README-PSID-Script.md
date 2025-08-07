# PSID Environment Variable Setup Script

This script automatically adds the "PSID" environment variable to all teams in the hackathon platform using the service API.

## Prerequisites

1. **Dependencies**: `curl` and `jq` must be installed
2. **Service API Key**: Valid service API key with `environment:write` permissions
3. **Network Access**: Access to the application's API endpoints

## PSID Configuration

The script will add the following environment variable to each team:

- **Key**: `PSID`
- **Value**: `"null"`  
- **Category**: `cloud`
- **Description**: `"Public Service Identity - Cloud service identifier"`
- **Is Secure**: `false`
- **Is Editable**: `true`

## Usage

### Method 1: Automatic Team Discovery
```bash
./add-psid-to-teams.sh [API_BASE_URL] SERVICE_API_KEY
```

### Method 2: Manual Team List
```bash
./add-psid-to-teams.sh [API_BASE_URL] SERVICE_API_KEY team1 team2 team3
```

### Examples

**Local development:**
```bash
./add-psid-to-teams.sh http://localhost:3000 sk-1234567890abcdef
```

**Production with specific teams:**
```bash
./add-psid-to-teams.sh https://hub.hackload.kz sk-1234567890abcdef awesome-team ninja-coders data-wizards
```

**Using environment variables:**
```bash
export HACKLOAD_API_KEY="sk-1234567890abcdef"
./add-psid-to-teams.sh https://hub.hackload.kz $HACKLOAD_API_KEY
```

## Script Features

### ✅ Comprehensive Error Handling
- Validates dependencies (curl, jq)
- Checks API key authentication
- Handles network errors and API failures
- Provides detailed error messages

### ✅ Flexible Team Input
- Automatic team discovery via API
- Manual team specification via command line
- Support for processing any number of teams

### ✅ Progress Tracking
- Real-time progress updates
- Success/failure counters
- Detailed logging with colors

### ✅ Safe Operations
- Uses proper HTTP methods (PUT)
- Validates API responses
- Non-destructive (updates existing or creates new)
- Proper authentication with service keys

## API Endpoints Used

### Individual Team Update
```
PUT /api/service/teams/{teamSlug}/environment/PSID
```

### Bulk Team Update
```
PUT /api/service/teams/environment
```

## Output Examples

### Successful Execution
```
========================================
PSID Environment Variable Setup Script
========================================

[INFO] Using API base URL: http://localhost:3000
[INFO] Service API key provided: sk-1234567...

[INFO] Configuration:
[INFO]   Key: PSID
[INFO]   Value: null
[INFO]   Category: cloud
[INFO]   Description: Public Service Identity - Cloud service identifier
[INFO]   Is Secure: false
[INFO]   Is Editable: true

[INFO] Processing 3 teams from command line arguments
[INFO] Starting to add PSID environment variable to 3 teams...

----------------------------------------
[INFO] Adding PSID environment variable to team: awesome-team
[INFO] Sending request to: http://localhost:3000/api/service/teams/awesome-team/environment/PSID
[SUCCESS] Successfully added PSID to team awesome-team

----------------------------------------
[INFO] Adding PSID environment variable to team: ninja-coders
[INFO] Sending request to: http://localhost:3000/api/service/teams/ninja-coders/environment/PSID
[SUCCESS] Successfully added PSID to team ninja-coders

========================================
[SUCCESS] Processing completed!
[INFO] Successfully processed: 3 teams
```

### Error Handling
```
[ERROR] Authentication failed for team awesome-team - Check your API key
[ERROR] Team nonexistent-team not found
[WARNING] Failed to process: 1 teams
```

## Service API Key Requirements

Your service API key must have the following permissions:
- `environment:write` - Required to create/update environment variables

You can create and manage service API keys in the admin dashboard at `/dashboard/security`.

## Troubleshooting

### Common Issues

**1. Authentication Failed (401)**
- Verify your service API key is correct
- Check if the key has expired
- Ensure the key is active

**2. Insufficient Permissions (403)**  
- Verify your service API key has `environment:write` permission
- Contact an administrator to update key permissions

**3. Team Not Found (404)**
- Check team slug spelling
- Verify the team exists in the system
- Use correct team nicknames (not display names)

**4. Network/Connection Issues**
- Check if the API base URL is correct
- Verify network connectivity to the server
- Check if the application is running

### Getting Team Slugs

If automatic team discovery fails, you can get team slugs from:

1. **Database Query:**
```sql
SELECT nickname FROM teams ORDER BY name;
```

2. **Dashboard UI:**
Visit `/dashboard/teams` and note the team nicknames in the URL or table

3. **API Export:**
Use the export functionality to get team lists

## Security Considerations

- **Service API Key**: Store securely, never commit to version control
- **Network Security**: Use HTTPS in production
- **Access Control**: Limit who can run this script
- **Audit Trail**: All operations are logged in the system

## Customization

To modify the PSID configuration, edit these variables in the script:

```bash
# PSID Configuration
PSID_KEY="PSID"
PSID_VALUE="null"
PSID_CATEGORY="cloud"
PSID_DESCRIPTION="Public Service Identity - Cloud service identifier"
PSID_IS_SECURE=false
PSID_IS_EDITABLE=true
```

## Integration Examples

### GitHub Actions
```yaml
- name: Add PSID to Teams
  run: |
    ./add-psid-to-teams.sh ${{ secrets.API_BASE_URL }} ${{ secrets.SERVICE_API_KEY }}
```

### Docker
```dockerfile
FROM alpine:latest
RUN apk add --no-cache curl jq bash
COPY add-psid-to-teams.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/add-psid-to-teams.sh
```

### Cron Job
```bash
# Add to crontab for daily execution
0 2 * * * /path/to/add-psid-to-teams.sh https://api.hackload.kz sk-key-here >> /var/log/psid-setup.log 2>&1
```