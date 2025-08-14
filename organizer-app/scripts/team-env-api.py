#!/usr/bin/env python3
"""
Simple Team Environment Variable Management Script
Manages environment variables for HackLoad 2025 teams via API.
"""

import argparse
import json
import os
import sys
import requests
from typing import Dict, List, Optional


class TeamEnvAPI:
    def __init__(self, api_base_url: str, api_key: str, dry_run: bool = False):
        self.api_base_url = api_base_url.rstrip('/')
        self.api_key = api_key
        self.dry_run = dry_run

    def get_team_env_vars(self, team_nickname: str = None) -> Optional[Dict]:
        """Get environment variables for a team or all teams."""
        url = f"{self.api_base_url}/api/service/teams/environment"
        
        headers = {
            'X-API-Key': self.api_key,
            'Content-Type': 'application/json'
        }
        
        params = {}
        if team_nickname:
            params['team'] = team_nickname
        
        if self.dry_run:
            print(f"[DRY RUN] Would GET from {url}")
            if params:
                print(f"[DRY RUN] Query params: {params}")
            return {"dry_run": True}
        
        try:
            response = requests.get(url, headers=headers, params=params)
            response.raise_for_status()
            data = response.json()
            
            if team_nickname:
                print(f"✅ Retrieved environment variables for team {team_nickname}")
                if 'team' in data:
                    team_data = data['team']
                    print(f"📋 Found {len(team_data['environment'])} variables:")
                    variables = []
                    for var in team_data['environment']:
                        secure_indicator = "🔒" if var['isSecure'] else "🔓"
                        var_info = {
                            'key': var['key'],
                            'value': var['value'],
                            'category': var.get('category', 'general'),
                            'isSecure': var['isSecure'],
                            'description': var.get('description', '')
                        }
                        variables.append(var_info)
                        print(f"  {secure_indicator} {var['key']}={var['value']} ({var.get('category', 'general')})")
                        if var.get('description'):
                            print(f"    📝 {var['description']}")
                    
                    print(f"\n📄 Variable values list:")
                    for var in variables:
                        print(f"  {var['key']}: {var['value']}")
            else:
                print(f"✅ Retrieved environment variables for all teams")
                print(f"📋 Found {len(data['teams'])} teams:")
                all_variables = {}
                for team in data['teams']:
                    team_vars = []
                    for var in team['environment']:
                        var_info = {
                            'key': var['key'],
                            'value': var['value'],
                            'category': var.get('category', 'general'),
                            'isSecure': var['isSecure'],
                            'description': var.get('description', '')
                        }
                        team_vars.append(var_info)
                    all_variables[team['teamSlug']] = team_vars
                    print(f"  • {team['teamSlug']} ({team['teamName']}) - {len(team['environment'])} variables")
                
                print(f"\n📄 All teams variable values:")
                for team_slug, variables in all_variables.items():
                    if variables:
                        print(f"  {team_slug}:")
                        for var in variables:
                            print(f"    {var['key']}: {var['value']}")
                    else:
                        print(f"  {team_slug}: (no variables)")
            
            return data
        except requests.exceptions.RequestException as e:
            print(f"❌ Error getting env vars: {e}")
            return None

    def set_team_env_var(self, team_nickname: str, key: str, value: str, 
                        description: str = "", category: str = "general", 
                        is_secure: bool = False, is_editable: bool = True) -> bool:
        """Set or update an environment variable for a team."""
        url = f"{self.api_base_url}/api/service/teams/{team_nickname}/environment/{key}"
        
        # Service API uses X-API-Key header instead of Bearer
        headers = {
            'X-API-Key': self.api_key,
            'Content-Type': 'application/json'
        }
        
        data = {
            "value": value,
            "description": description,
            "category": category,
            "isSecure": is_secure
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

    def delete_team_env_var(self, team_nickname: str, key: str) -> bool:
        """Delete an environment variable for a team."""
        url = f"{self.api_base_url}/api/service/teams/{team_nickname}/environment/{key}"
        
        headers = {
            'X-API-Key': self.api_key,
            'Content-Type': 'application/json'
        }
        
        if self.dry_run:
            print(f"[DRY RUN] Would DELETE from {url}")
            return True
        
        try:
            response = requests.delete(url, headers=headers)
            response.raise_for_status()
            print(f"✅ Deleted {key} for team {team_nickname}")
            return True
        except requests.exceptions.RequestException as e:
            print(f"❌ Error deleting {key} for team {team_nickname}: {e}")
            return False


def load_teams_data(teams_file: str) -> List[Dict]:
    """Load teams data from JSON file."""
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


def validate_team_exists(team_nickname: str, approved_teams: List[Dict]) -> bool:
    """Validate that a specific team exists and is approved."""
    team_nicknames = {team['teamNickname'] for team in approved_teams}
    
    if team_nickname not in team_nicknames:
        print(f"❌ ERROR: Team '{team_nickname}' not found in approved teams!")
        print(f"Available approved teams:")
        for team in approved_teams:
            print(f"   - {team['teamNickname']} ({team['teamName']})")
        return False
    
    return True


def main():
    parser = argparse.ArgumentParser(description='Manage team environment variables')
    parser.add_argument('--teams-file', default='approved-teams.json',
                       help='Path to teams JSON file')
    parser.add_argument('--api-base-url', 
                       default=os.getenv('API_BASE_URL', 'https://hub.hackload.kz'),
                       help='API base URL')
    parser.add_argument('--api-key',
                       default=os.getenv('SERVICE_API_KEY'),
                       help='Service API key')
    parser.add_argument('--dry-run', action='store_true',
                       help='Show what would be done without making changes')
    
    # Action subcommands
    subparsers = parser.add_subparsers(dest='action', help='Available actions')
    
    # Set variable
    set_parser = subparsers.add_parser('set', help='Set environment variable')
    set_parser.add_argument('key', help='Environment variable key')
    set_parser.add_argument('value', help='Environment variable value')
    set_parser.add_argument('--description', default='', help='Variable description')
    set_parser.add_argument('--category', default='general', help='Variable category')
    set_parser.add_argument('--secure', action='store_true', help='Mark as secure')
    set_parser.add_argument('--readonly', action='store_true', help='Mark as read-only')
    set_parser.add_argument('--team', help='Specific team nickname (if not set, applies to all approved teams)')
    
    # Get variables
    get_parser = subparsers.add_parser('get', help='Get environment variables')
    get_parser.add_argument('--team', help='Team nickname (if not specified, gets all teams)')
    
    # Delete variable
    del_parser = subparsers.add_parser('delete', help='Delete environment variable')
    del_parser.add_argument('key', help='Environment variable key')
    del_parser.add_argument('--team', help='Specific team nickname (if not set, applies to all approved teams)')
    
    # List teams
    list_parser = subparsers.add_parser('list', help='List approved teams')
    
    args = parser.parse_args()
    
    if not args.api_key:
        print("❌ API key is required. Set SERVICE_API_KEY environment variable or use --api-key")
        sys.exit(1)
    
    api = TeamEnvAPI(args.api_base_url, args.api_key, args.dry_run)
    
    if args.action == 'list':
        teams = load_teams_data(args.teams_file)
        
        # Validate that we only have approved teams
        if not validate_approved_teams(teams):
            sys.exit(1)
        
        print(f"📋 Found {len(teams)} approved teams:")
        for i, team in enumerate(teams, 1):
            status = team.get('teamStatus', 'UNKNOWN')
            member_count = team.get('memberCount', len(team.get('members', [])))
            print(f"  {i:2d}. {team['teamNickname']} - {team['teamName']}")
            print(f"      Status: {status} | Members: {member_count}")
        return
    
    if args.action == 'get':
        if args.team:
            # If specific team requested, validate it exists and is approved
            approved_teams = load_teams_data(args.teams_file)
            if not validate_approved_teams(approved_teams):
                sys.exit(1)
            if not validate_team_exists(args.team, approved_teams):
                sys.exit(1)
            print(f"🎯 Getting variables for specific approved team: {args.team}")
        else:
            print(f"🌐 Getting variables for all teams")
        
        api.get_team_env_vars(args.team)
        return
    
    if args.action == 'set':
        # Load approved teams for validation
        approved_teams = load_teams_data(args.teams_file)
        
        # Validate that we only have approved teams
        if not validate_approved_teams(approved_teams):
            sys.exit(1)
        
        if args.team:
            # Apply to specific team - validate it exists and is approved
            if not validate_team_exists(args.team, approved_teams):
                sys.exit(1)
            teams = [{'teamNickname': args.team, 'teamName': f'Specific team: {args.team}'}]
            print(f"🎯 Setting variable for specific approved team: {args.team}")
        else:
            # Apply to all approved teams
            teams = approved_teams
            print(f"🌐 Setting variable for all {len(teams)} approved teams")
        
        print(f"📝 Variable: {args.key}={args.value}")
        print(f"📋 Description: {args.description or '(no description)'}")
        print(f"🏷️ Category: {args.category}")
        print(f"🔒 Secure: {'Yes' if args.secure else 'No'}")
        print(f"✏️ Editable: {'No' if args.readonly else 'Yes'}")
        print()
        
        success_count = 0
        total_count = len(teams)
        
        for i, team in enumerate(teams, 1):
            team_nickname = team['teamNickname']
            team_name = team.get('teamName', 'Unknown')
            
            print(f"🔄 Processing team {i}/{total_count}: {team_nickname} ({team_name})")
            
            success = api.set_team_env_var(
                team_nickname, 
                args.key, 
                args.value,
                args.description,
                args.category,
                args.secure,
                not args.readonly  # isEditable is opposite of readonly
            )
            
            if success:
                success_count += 1
                print(f"   ✅ Success")
            else:
                print(f"   ❌ Failed")
        
        print(f"\n📊 Summary: {success_count}/{total_count} teams processed successfully")
        if success_count < total_count:
            print(f"⚠️ {total_count - success_count} teams had errors")
            sys.exit(1)
        else:
            print("✅ All teams processed successfully!")
    
    elif args.action == 'delete':
        # Load approved teams for validation
        approved_teams = load_teams_data(args.teams_file)
        
        # Validate that we only have approved teams
        if not validate_approved_teams(approved_teams):
            sys.exit(1)
        
        if args.team:
            # Apply to specific team - validate it exists and is approved
            if not validate_team_exists(args.team, approved_teams):
                sys.exit(1)
            teams = [{'teamNickname': args.team, 'teamName': f'Specific team: {args.team}'}]
            print(f"🎯 Deleting variable from specific approved team: {args.team}")
        else:
            # Apply to all approved teams
            teams = approved_teams
            print(f"🌐 Deleting variable from all {len(teams)} approved teams")
        
        print(f"🗑️ Variable to delete: {args.key}")
        print()
        
        success_count = 0
        total_count = len(teams)
        
        for i, team in enumerate(teams, 1):
            team_nickname = team['teamNickname']
            team_name = team.get('teamName', 'Unknown')
            
            print(f"🔄 Processing team {i}/{total_count}: {team_nickname} ({team_name})")
            
            success = api.delete_team_env_var(team_nickname, args.key)
            if success:
                success_count += 1
                print(f"   ✅ Success")
            else:
                print(f"   ❌ Failed")
        
        print(f"\n📊 Summary: {success_count}/{total_count} teams processed successfully")
        if success_count < total_count:
            print(f"⚠️ {total_count - success_count} teams had errors")
            sys.exit(1)
        else:
            print("✅ All teams processed successfully!")
    else:
        parser.print_help()


if __name__ == '__main__':
    main()