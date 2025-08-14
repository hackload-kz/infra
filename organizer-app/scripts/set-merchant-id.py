#!/usr/bin/env python3
"""
Set MERCHANT_ID Environment Variables for HackLoad 2025 Teams
Sets MERCHANT_ID=<team-nickname> for all approved teams from team-env-config.json.
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


def load_team_config(config_file: str) -> Dict:
    """Load team configuration from JSON file."""
    try:
        with open(config_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
            if 'teams' not in data:
                print(f"❌ Invalid config file: missing 'teams' section")
                sys.exit(1)
            
            teams_data = data['teams']
            print(f"📊 Configuration Statistics:")
            print(f"   Total teams in config: {len(teams_data)}")
            print(f"   Configuration generated: {data.get('meta', {}).get('generated_at', 'Unknown')}")
            print()
            
            return data
    except FileNotFoundError:
        print(f"❌ Configuration file not found: {config_file}")
        print("💡 Generate it first using: ./generate-team-env-config.py")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"❌ Invalid JSON in configuration file: {e}")
        sys.exit(1)


def extract_merchant_ids(teams_data: Dict) -> List[Dict]:
    """Extract MERCHANT_ID values for all teams from configuration."""
    merchant_data = []
    
    for team_nickname, team_config in teams_data.items():
        team_info = team_config.get('team_info', {})
        env_vars = team_config.get('environment_variables', {})
        
        if 'MERCHANT_ID' in env_vars:
            merchant_data.append({
                'team_nickname': team_nickname,
                'team_name': team_info.get('name', 'Unknown'),
                'merchant_id': env_vars['MERCHANT_ID'],
                'status': team_info.get('status', 'UNKNOWN'),
                'member_count': team_info.get('member_count', 0)
            })
        else:
            print(f"⚠️ Missing MERCHANT_ID for team {team_nickname}")
    
    return merchant_data


def set_merchant_ids(merchant_data: List[Dict], api: TeamEnvAPI):
    """Set MERCHANT_ID environment variables for all teams."""
    success_count = 0
    total_count = len(merchant_data)
    
    print(f"🌐 Setting MERCHANT_ID for {total_count} teams")
    print(f"📋 Variable: MERCHANT_ID")
    print(f"🏷️ Category: payment")
    print(f"📝 Description: Необходим для обращения к Платежном шлюзу")
    print(f"🔒 Secure: No")
    print(f"✏️ Editable: No (Read-only)")
    print()
    
    for i, team_data in enumerate(merchant_data, 1):
        team_nickname = team_data['team_nickname']
        team_name = team_data['team_name']
        merchant_id = team_data['merchant_id']
        status = team_data['status']
        member_count = team_data['member_count']
        
        print(f"🔄 Processing team {i}/{total_count}: {team_nickname} ({team_name})")
        print(f"   Status: {status} | Members: {member_count}")
        print(f"   Merchant ID: {merchant_id}")
        
        success = api.set_team_env_var(
            team_nickname,
            "MERCHANT_ID",
            merchant_id,
            "Необходим для обращения к Платежном шлюзу",
            "payment",  # category
            False,      # not secure
            False       # not editable (read-only)
        )
        
        if success:
            success_count += 1
            print(f"   ✅ Success")
        else:
            print(f"   ❌ Failed")
        
        print()
    
    print("=" * 60)
    print("📊 MERCHANT_ID SETUP SUMMARY")
    print("=" * 60)
    print(f"Teams processed: {success_count}/{total_count}")
    print(f"Environment variables set: {success_count}")
    
    if success_count == total_count:
        print("✅ All teams processed successfully!")
        print()
        print("💳 Teams can now use their MERCHANT_ID for payment gateway access:")
        for team_data in merchant_data:
            print(f"   • {team_data['team_nickname']}: {team_data['merchant_id']}")
    else:
        print(f"⚠️ {total_count - success_count} teams had errors")
    
    return success_count == total_count


def main():
    parser = argparse.ArgumentParser(
        description='Set MERCHANT_ID environment variables for teams from config file',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Set MERCHANT_ID for all teams from config file
  ./set-merchant-id.py
  
  # Dry run to see what would be done
  ./set-merchant-id.py --dry-run
  
  # Use custom config file
  ./set-merchant-id.py --config-file custom-config.json
  
  # Use custom API settings
  ./set-merchant-id.py --api-base-url "https://custom.api.com"

This script reads MERCHANT_ID values from team-env-config.json and sets them
as read-only environment variables for each team in the payment category.
        """
    )
    
    parser.add_argument('--config-file', default='team-env-config.json',
                       help='Path to team configuration JSON file (default: team-env-config.json)')
    parser.add_argument('--api-base-url', 
                       default=os.getenv('API_BASE_URL', 'https://hub.hackload.kz'),
                       help='API base URL for requests (default: https://hub.hackload.kz)')
    parser.add_argument('--api-key',
                       default=os.getenv('SERVICE_API_KEY'),
                       help='Service API key (or set SERVICE_API_KEY env var)')
    parser.add_argument('--dry-run', action='store_true',
                       help='Show what would be done without making changes')
    
    args = parser.parse_args()
    
    if not args.api_key:
        print("❌ API key is required. Set SERVICE_API_KEY environment variable or use --api-key")
        sys.exit(1)
    
    print("============================================================")
    print("MERCHANT_ID Environment Variable Setup for HackLoad 2025")
    print("============================================================")
    print(f"📁 Config file: {args.config_file}")
    print(f"🌐 API base URL: {args.api_base_url}")
    print(f"🧪 Dry run: {args.dry_run}")
    print()
    
    # Load team configuration
    config_data = load_team_config(args.config_file)
    
    # Extract MERCHANT_ID data
    merchant_data = extract_merchant_ids(config_data['teams'])
    
    if not merchant_data:
        print("❌ No teams with MERCHANT_ID found in configuration file")
        sys.exit(1)
    
    if args.dry_run:
        print("🧪 DRY RUN MODE - No changes will be made")
        print()
    
    # Initialize API
    api = TeamEnvAPI(args.api_base_url, args.api_key, args.dry_run)
    
    # Set MERCHANT_ID environment variables
    success = set_merchant_ids(merchant_data, api)
    
    if not success:
        sys.exit(1)


if __name__ == '__main__':
    main()