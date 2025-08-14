#!/usr/bin/env python3
"""
Set ENDPOINT_URL Environment Variables for HackLoad 2025 Teams
Sets ENDPOINT_URL=https://<team-slug>.hub.hackload.kz for all approved teams.
"""

import argparse
import json
import os
import sys
import requests
from typing import Dict, List


class TeamEnvAPI:
    def __init__(self, api_base_url: str, api_key: str, dry_run: bool = False):
        self.api_base_url = api_base_url.rstrip('/')
        self.api_key = api_key
        self.dry_run = dry_run

    def set_team_env_var(self, team_nickname: str, key: str, value: str, 
                        description: str = "", category: str = "general", 
                        is_secure: bool = False, is_editable: bool = True) -> bool:
        """Set or update an environment variable for a team."""
        url = f"{self.api_base_url}/api/service/teams/{team_nickname}/environment/{key}"
        
        headers = {
            'X-API-Key': self.api_key,
            'Content-Type': 'application/json'
        }
        
        data = {
            "value": value,
            "description": description,
            "category": category,
            "isSecure": is_secure,
            "isEditable": is_editable
        }
        
        if self.dry_run:
            print(f"[DRY RUN] Would PUT to {url}")
            print(f"[DRY RUN] Data: {json.dumps(data, indent=2, ensure_ascii=False)}")
            return True
        
        try:
            response = requests.put(url, headers=headers, json=data)
            response.raise_for_status()
            print(f"✅ Set {key}={value} for team {team_nickname}")
            return True
        except requests.exceptions.RequestException as e:
            print(f"❌ Error setting {key} for team {team_nickname}: {e}")
            return False


def load_teams_data(teams_file: str) -> List[Dict]:
    """Load teams data from JSON file and filter for approved teams only."""
    try:
        with open(teams_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
            teams = data.get('data', [])
            
            # Filter for approved teams only
            approved_teams = [team for team in teams if team.get('teamStatus') == 'APPROVED']
            
            total_teams = len(teams)
            approved_count = len(approved_teams)
            rejected_count = total_teams - approved_count
            
            print(f"📊 Team Statistics:")
            print(f"   Total teams: {total_teams}")
            print(f"   ✅ Approved teams: {approved_count}")
            print(f"   ❌ Rejected/Other teams: {rejected_count}")
            print()
            
            return approved_teams
    except FileNotFoundError:
        print(f"❌ Teams file not found: {teams_file}")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"❌ Invalid JSON in teams file: {e}")
        sys.exit(1)


def validate_approved_teams(teams: List[Dict]) -> bool:
    """Validate that we're only processing approved teams."""
    non_approved_teams = [team for team in teams if team.get('teamStatus') != 'APPROVED']
    
    if non_approved_teams:
        print("❌ ERROR: Found non-approved teams in the dataset!")
        for team in non_approved_teams:
            print(f"   - {team.get('teamName', 'Unknown')} ({team.get('teamNickname', 'Unknown')}): {team.get('teamStatus', 'Unknown')}")
        print()
        print("This script should only process APPROVED teams.")
        print("Please verify the data source and filtering logic.")
        return False
    
    return True


def generate_endpoint_url(team_nickname: str, base_domain: str = "hub.hackload.kz") -> str:
    """Generate the endpoint URL for a team."""
    return f"https://{team_nickname}.{base_domain}"


def set_endpoint_urls(teams: List[Dict], api: TeamEnvAPI, base_domain: str = "hub.hackload.kz"):
    """Set ENDPOINT_URL environment variables for all approved teams."""
    success_count = 0
    total_count = len(teams)
    
    print(f"🌐 Setting ENDPOINT_URL for {total_count} approved teams")
    print(f"📋 Variable: ENDPOINT_URL")
    print(f"🏷️ Category: api")
    print(f"📝 Description: Доменное имя, которое будет использоваться при обращение к Billeter API команды")
    print(f"🔒 Secure: No")
    print(f"✏️ Editable: No (Read-only)")
    print(f"🌍 Base domain: {base_domain}")
    print()
    
    for i, team in enumerate(teams, 1):
        team_name = team.get('teamName', 'Unknown')
        team_nickname = team['teamNickname']
        team_status = team.get('teamStatus', 'UNKNOWN')
        member_count = team.get('memberCount', len(team.get('members', [])))
        
        # Generate endpoint URL
        endpoint_url = generate_endpoint_url(team_nickname, base_domain)
        
        print(f"🔄 Processing team {i}/{total_count}: {team_nickname} ({team_name})")
        print(f"   Status: {team_status} | Members: {member_count}")
        print(f"   Endpoint URL: {endpoint_url}")
        
        # Validate team data
        if not team_nickname:
            print(f"   ⚠️ Skipping team {team_name}: No team nickname")
            continue
        
        success = api.set_team_env_var(
            team_nickname,
            "ENDPOINT_URL",
            endpoint_url,
            "Доменное имя, которое будет использоваться при обращение к Billeter API команды",
            "api",  # category
            False,  # not secure
            False   # not editable (read-only)
        )
        
        if success:
            success_count += 1
            print(f"   ✅ Success")
        else:
            print(f"   ❌ Failed")
        
        print()
    
    print("=" * 60)
    print("📊 ENDPOINT URL SETUP SUMMARY")
    print("=" * 60)
    print(f"Teams processed: {success_count}/{total_count}")
    print(f"Environment variables set: {success_count}")
    print(f"Base domain used: {base_domain}")
    
    if success_count == total_count:
        print("✅ All teams processed successfully!")
        print()
        print("🔗 Teams can now access their Billeter API using their ENDPOINT_URL:")
        for team in teams:
            endpoint_url = generate_endpoint_url(team['teamNickname'], base_domain)
            print(f"   • {team['teamNickname']}: {endpoint_url}")
    else:
        print(f"⚠️ {total_count - success_count} teams had errors")
    
    return success_count == total_count


def main():
    parser = argparse.ArgumentParser(
        description='Set ENDPOINT_URL environment variables for approved teams',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Set endpoint URLs for all approved teams
  ./set-endpoint-urls.py
  
  # Dry run to see what would be done
  ./set-endpoint-urls.py --dry-run
  
  # Use custom base domain
  ./set-endpoint-urls.py --base-domain "custom.domain.com"
  
  # Use custom teams file
  ./set-endpoint-urls.py --teams-file custom-teams.json

Generated URLs will be in format: https://<team-nickname>.<base-domain>
Example: https://rorobotics.hub.hackload.kz
        """
    )
    
    parser.add_argument('--teams-file', default='approved-teams.json',
                       help='Path to teams JSON file (default: approved-teams.json)')
    parser.add_argument('--api-base-url', 
                       default=os.getenv('API_BASE_URL', 'https://hub.hackload.kz'),
                       help='API base URL (default: https://hub.hackload.kz)')
    parser.add_argument('--api-key',
                       default=os.getenv('SERVICE_API_KEY'),
                       help='Service API key (or set SERVICE_API_KEY env var)')
    parser.add_argument('--base-domain', default='hub.hackload.kz',
                       help='Base domain for endpoint URLs (default: hub.hackload.kz)')
    parser.add_argument('--dry-run', action='store_true',
                       help='Show what would be done without making changes')
    
    args = parser.parse_args()
    
    if not args.api_key:
        print("❌ API key is required. Set SERVICE_API_KEY environment variable or use --api-key")
        sys.exit(1)
    
    print("============================================================")
    print("ENDPOINT_URL Environment Variable Setup for HackLoad 2025")
    print("============================================================")
    print(f"📁 Teams file: {args.teams_file}")
    print(f"🌐 API base URL: {args.api_base_url}")
    print(f"🏷️ Base domain: {args.base_domain}")
    print(f"🧪 Dry run: {args.dry_run}")
    print()
    
    # Load and validate approved teams
    teams = load_teams_data(args.teams_file)
    
    if not validate_approved_teams(teams):
        sys.exit(1)
    
    if args.dry_run:
        print("🧪 DRY RUN MODE - No changes will be made")
        print()
    
    # Initialize API
    api = TeamEnvAPI(args.api_base_url, args.api_key, args.dry_run)
    
    # Set endpoint URLs
    success = set_endpoint_urls(teams, api, args.base_domain)
    
    if not success:
        sys.exit(1)


if __name__ == '__main__':
    main()