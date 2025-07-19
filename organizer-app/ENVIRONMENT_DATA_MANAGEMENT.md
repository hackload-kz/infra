# Environment Data Management

This guide explains how to create, update, and delete environment parameters for teams in the hackathon platform.

## Overview

Environment data management allows organizers to securely store and share configuration data with teams, such as API keys, database URLs, and other environment variables needed for development.

## Access Control

- **Organizers**: Full access to create, read, update, and delete environment parameters for all teams
- **Team Members**: Read-only access to their team's environment parameters
- **Non-team Members**: No access to environment parameters

## Getting Started

### Dashboard Access (Organizers Only)

Navigate to the team management dashboard:
1. Go to `/dashboard/teams`
2. Select a team by clicking on their name
3. Scroll down to the "Environment Data" section
4. Click "Manage Environment" button

### Space Cabinet Access (Team Members)

Team members can view their environment data:
1. Go to `/space/tasks/environment`
2. View read-only environment parameters for your team

## Creating Environment Parameters

### Step 1: Access the Management Interface

From the team detail page in the dashboard, click the "Manage Environment" button to open the environment management interface.

### Step 2: Add New Parameter

1. Click the "Add Parameter" button
2. Fill out the form with the following fields:

#### Required Fields
- **Key**: Unique identifier for the parameter (e.g., `DATABASE_URL`, `API_KEY`)
- **Value**: The actual value of the parameter

#### Optional Fields
- **Category**: Group parameters by type for better organization
  - `git` - Git repositories and version control
  - `database` - Database connections and credentials
  - `infrastructure` - Infrastructure and deployment configs
  - `cloud` - Cloud services and APIs
  - `credentials` - Authentication credentials
  - `security` - Security tokens and certificates
  - `api` - API endpoints and keys
  - `общие` - General/miscellaneous parameters

- **Description**: Human-readable description of what this parameter is for
- **Secure**: Mark as confidential to mask the value in the interface

### Step 3: Save the Parameter

Click "Save" to create the new environment parameter. It will immediately be available to the team.

## Updating Environment Parameters

### Method 1: Inline Editing

1. In the environment management table, locate the parameter you want to edit
2. Click the "Edit" (pencil) icon in the Actions column
3. The row will expand into an edit form
4. Modify the desired fields:
   - Key name
   - Value
   - Category
   - Description
   - Security setting
5. Click "Save" to apply changes or "Cancel" to discard

### Method 2: Bulk Updates

For multiple parameters, edit them one by one using the inline editing method. Each parameter is saved independently.

## Deleting Environment Parameters

### Single Parameter Deletion

1. Locate the parameter in the environment management table
2. Click the "Delete" (trash) icon in the Actions column
3. Confirm the deletion in the popup dialog
4. The parameter will be permanently removed

⚠️ **Warning**: Deletion is permanent and cannot be undone. Make sure the parameter is no longer needed before deleting.

## Security Features

### Secure Parameters

- Mark sensitive data (passwords, API keys, tokens) as "Secure"
- Secure parameters are masked with `***` in the interface
- Team members can toggle visibility using the eye icon
- Values are always shown in full when copying to clipboard

### Access Levels

- **Organizers**: Can see all parameters and manage them
- **Team Members**: Read-only access, can copy values but cannot modify
- **Secure Parameter Visibility**: 
  - Default: Hidden (`***`)
  - Click eye icon to reveal temporarily
  - Copy function always copies the real value

## Best Practices

### Naming Conventions

- Use UPPER_CASE for environment variable names
- Use descriptive names: `DATABASE_URL` instead of `DB`
- Prefix related variables: `AUTH_CLIENT_ID`, `AUTH_CLIENT_SECRET`

### Organization

- Group related parameters using categories
- Add descriptions for complex parameters
- Use consistent naming patterns within categories

### Security

- Always mark sensitive data as "Secure"
- Regularly review and rotate credentials
- Document parameter purposes in descriptions
- Remove unused parameters promptly

### Examples

#### Database Configuration
```
Key: DATABASE_URL
Value: postgresql://user:password@host:5432/database
Category: database
Description: Primary PostgreSQL database connection string
Secure: Yes
```

#### API Integration
```
Key: STRIPE_API_KEY
Value: sk_live_xxxxxxxxxxxxx
Category: api
Description: Stripe payment processing API key
Secure: Yes
```

#### Git Repository
```
Key: REPO_URL
Value: https://github.com/team/project.git
Category: git
Description: Main project repository
Secure: No
```

## Table Interface

The environment parameters are displayed in a clean table format with the following columns:

- **Key**: Parameter name with category badge and security indicator
- **Value**: Masked or visible value in a code block
- **Description**: Human-readable description or "-" if empty
- **Updated**: Last modification date
- **Actions**: Edit, Copy, Delete, and Visibility toggle buttons

### Action Buttons

- **👁️ Eye**: Toggle visibility for secure parameters
- **📋 Copy**: Copy the parameter value to clipboard
- **✏️ Edit**: Edit the parameter inline
- **🗑️ Delete**: Permanently delete the parameter

## API Integration

For programmatic access, teams can use the Service API endpoints:

```
GET /api/service/teams/{teamSlug}/environment
GET /api/service/teams/{teamSlug}/environment/{key}
```

*Note: API access requires proper authentication and team membership.*

### Example Commands

#### Fetch All Environment Variables

```bash
# Using curl
curl -H "Authorization: Bearer YOUR_SERVICE_KEY" \
     -H "Content-Type: application/json" \
     https://your-platform.com/api/service/teams/your-team-slug/environment

# Using wget
wget --header="Authorization: Bearer YOUR_SERVICE_KEY" \
     --header="Content-Type: application/json" \
     -O environment.json \
     https://your-platform.com/api/service/teams/your-team-slug/environment
```

#### Fetch Specific Environment Variable

```bash
# Get DATABASE_URL
curl -H "Authorization: Bearer YOUR_SERVICE_KEY" \
     -H "Content-Type: application/json" \
     https://your-platform.com/api/service/teams/your-team-slug/environment/DATABASE_URL

# Get API_KEY
curl -H "Authorization: Bearer YOUR_SERVICE_KEY" \
     -H "Content-Type: application/json" \
     https://your-platform.com/api/service/teams/your-team-slug/environment/API_KEY
```

#### Integration Examples

##### Node.js Integration

```javascript
// fetch-env.js
const fetch = require('node-fetch');

async function fetchEnvironmentData(teamSlug, serviceKey) {
  try {
    const response = await fetch(
      `https://your-platform.com/api/service/teams/${teamSlug}/environment`,
      {
        headers: {
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const envData = await response.json();
    
    // Set environment variables
    envData.forEach(item => {
      process.env[item.key] = item.value;
    });
    
    console.log('Environment variables loaded successfully');
    return envData;
  } catch (error) {
    console.error('Failed to fetch environment data:', error);
    throw error;
  }
}

// Usage
fetchEnvironmentData('your-team-slug', process.env.SERVICE_KEY)
  .then(() => {
    // Your application code here
    console.log('Database URL:', process.env.DATABASE_URL);
  })
  .catch(console.error);
```

##### Python Integration

```python
# fetch_env.py
import requests
import os
import json

def fetch_environment_data(team_slug, service_key):
    """Fetch environment data from the platform API"""
    url = f"https://your-platform.com/api/service/teams/{team_slug}/environment"
    headers = {
        'Authorization': f'Bearer {service_key}',
        'Content-Type': 'application/json'
    }
    
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        
        env_data = response.json()
        
        # Set environment variables
        for item in env_data:
            os.environ[item['key']] = item['value']
        
        print('Environment variables loaded successfully')
        return env_data
    
    except requests.exceptions.RequestException as e:
        print(f'Failed to fetch environment data: {e}')
        raise

# Usage
if __name__ == "__main__":
    service_key = os.getenv('SERVICE_KEY')
    team_slug = 'your-team-slug'
    
    env_data = fetch_environment_data(team_slug, service_key)
    
    # Your application code here
    print('Database URL:', os.getenv('DATABASE_URL'))
```

##### Shell Script Integration

```bash
#!/bin/bash
# load-env.sh

TEAM_SLUG="your-team-slug"
SERVICE_KEY="${SERVICE_KEY}"
API_BASE="https://your-platform.com/api/service"

if [ -z "$SERVICE_KEY" ]; then
    echo "Error: SERVICE_KEY environment variable is required"
    exit 1
fi

# Fetch environment data
ENV_DATA=$(curl -s -H "Authorization: Bearer $SERVICE_KEY" \
                -H "Content-Type: application/json" \
                "$API_BASE/teams/$TEAM_SLUG/environment")

# Check if request was successful
if [ $? -ne 0 ]; then
    echo "Error: Failed to fetch environment data"
    exit 1
fi

# Parse JSON and export variables
echo "$ENV_DATA" | jq -r '.[] | "export \(.key)=\"\(.value)\""' > .env.temp

# Source the environment variables
source .env.temp

# Clean up temporary file
rm .env.temp

echo "Environment variables loaded successfully"

# Usage example
echo "Database URL: $DATABASE_URL"
```

##### Docker Integration

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Copy environment loading script
COPY scripts/load-env.js ./

# Load environment variables at runtime
RUN node load-env.js

# Start the application
CMD ["npm", "start"]
```

```javascript
// scripts/load-env.js
const fs = require('fs');
const fetch = require('node-fetch');

async function loadEnvironment() {
  const teamSlug = process.env.TEAM_SLUG;
  const serviceKey = process.env.SERVICE_KEY;
  
  if (!teamSlug || !serviceKey) {
    console.error('TEAM_SLUG and SERVICE_KEY must be provided');
    process.exit(1);
  }
  
  try {
    const response = await fetch(
      `https://your-platform.com/api/service/teams/${teamSlug}/environment`,
      {
        headers: {
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const envData = await response.json();
    
    // Create .env file
    const envFile = envData
      .map(item => `${item.key}="${item.value}"`)
      .join('\n');
    
    fs.writeFileSync('.env', envFile);
    console.log('Environment file created successfully');
    
  } catch (error) {
    console.error('Failed to load environment:', error);
    process.exit(1);
  }
}

loadEnvironment();
```

##### GitHub Actions Integration

```yaml
# .github/workflows/deploy.yml
name: Deploy Application

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Load Environment Variables
      env:
        SERVICE_KEY: ${{ secrets.SERVICE_KEY }}
        TEAM_SLUG: ${{ secrets.TEAM_SLUG }}
      run: |
        curl -H "Authorization: Bearer $SERVICE_KEY" \
             -H "Content-Type: application/json" \
             https://your-platform.com/api/service/teams/$TEAM_SLUG/environment \
             | jq -r '.[] | "\(.key)=\(.value)"' >> $GITHUB_ENV
    
    - name: Build and Deploy
      run: |
        echo "Using DATABASE_URL: $DATABASE_URL"
        # Your deployment commands here
```

### Authentication

To use the API endpoints, you need a service key:

1. Contact platform administrators to get a service key for your team
2. Store the service key securely (environment variable, secrets manager)
3. Include the key in the `Authorization` header: `Bearer YOUR_SERVICE_KEY`

### Rate Limiting

API calls are rate-limited to prevent abuse:

- **Limit**: 100 requests per minute per service key
- **Burst**: Up to 10 requests per second
- **Reset**: Limits reset every minute

### Error Handling

Common HTTP status codes:

- `200 OK`: Request successful
- `401 Unauthorized`: Invalid or missing service key
- `403 Forbidden`: Service key doesn't have access to this team
- `404 Not Found`: Team or environment variable not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

## Troubleshooting

### Common Issues

1. **Parameter not visible to team**: Check if team member is properly assigned to the team
2. **Cannot edit parameter**: Only organizers can modify environment data
3. **Secure parameter always shows stars**: Click the eye icon to toggle visibility
4. **Category not showing**: Categories are optional; parameters without categories show in "General"

### Support

If you encounter issues with environment data management, contact the platform administrators or check the system logs for detailed error messages.
t