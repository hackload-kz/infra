#!/usr/bin/env python3
"""
Generate Team Environment Configuration JSON for HackLoad 2025
Creates a JSON file with all approved teams and their environment variables.
"""

import argparse
import json
import os
import sys
import secrets
import string
from datetime import datetime
from typing import Dict, List


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


def generate_merchant_password(length: int = 26) -> str:
    """Generate a random merchant password using specified character set."""
    # Character set: 0-9, a-z, A-Z, #, -, @
    characters = string.ascii_letters + string.digits + '#-@'
    return ''.join(secrets.choice(characters) for _ in range(length))


def generate_team_environment_variables(team_nickname: str, base_url: str = "https://hub.hackload.kz", 
                                      github_org: str = "hackload-kz") -> Dict[str, str]:
    """Generate all environment variables for a team."""
    return {
        "ENDPOINT_URL": f"https://{team_nickname}.hub.hackload.kz",
        "EVENT_PROVIDER": f"{base_url}/event/{team_nickname}/event-provider",
        "PAYMENT_ENDPOINT": f"{base_url}/event/{team_nickname}/payments",
        "Repo": f"https://github.com/{github_org}/{team_nickname}",
        "MERCHANT_ID": team_nickname,
        "MERCHANT_PASSWORD": generate_merchant_password()
    }


def generate_teams_config(teams: List[Dict], base_url: str = "https://hub.hackload.kz", 
                         github_org: str = "hackload-kz") -> Dict:
    """Generate complete configuration for all approved teams."""
    config = {
        "meta": {
            "generated_at": datetime.now().isoformat(),
            "total_teams": len(teams),
            "base_url": base_url,
            "github_org": github_org,
            "description": "Environment variables configuration for HackLoad 2025 approved teams"
        },
        "teams": {}
    }
    
    print(f"🌐 Generating environment variables for {len(teams)} approved teams")
    print(f"🏷️ Base URL: {base_url}")
    print(f"🐙 GitHub Organization: {github_org}")
    print()
    
    for i, team in enumerate(teams, 1):
        team_name = team.get('teamName', 'Unknown')
        team_nickname = team['teamNickname']
        team_status = team.get('teamStatus', 'UNKNOWN')
        member_count = team.get('memberCount', len(team.get('members', [])))
        
        print(f"🔄 Processing team {i}/{len(teams)}: {team_nickname} ({team_name})")
        print(f"   Status: {team_status} | Members: {member_count}")
        
        # Validate team data
        if not team_nickname:
            print(f"   ⚠️ Skipping team {team_name}: No team nickname")
            continue
        
        # Generate environment variables
        env_vars = generate_team_environment_variables(team_nickname, base_url, github_org)
        
        # Add team info to config
        config["teams"][team_nickname] = {
            "team_info": {
                "name": team_name,
                "nickname": team_nickname,
                "status": team_status,
                "member_count": member_count,
                "level": team.get('teamLevel', 'UNKNOWN')
            },
            "environment_variables": env_vars
        }
        
        print(f"   ✅ Generated {len(env_vars)} environment variables")
        for key, value in env_vars.items():
            if key == "MERCHANT_PASSWORD":
                print(f"      {key}: {value[:6]}***{value[-3:]} (masked)")
            else:
                print(f"      {key}: {value}")
        print()
    
    return config


def main():
    parser = argparse.ArgumentParser(
        description='Generate environment variables configuration JSON for approved teams',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Generate config for all approved teams
  ./generate-team-env-config.py
  
  # Use custom output file
  ./generate-team-env-config.py --output team-config.json
  
  # Use custom base URL and GitHub org
  ./generate-team-env-config.py --base-url "https://custom.api.com" --github-org "my-org"
  
  # Use custom teams file
  ./generate-team-env-config.py --teams-file custom-teams.json

Generated JSON structure:
{
  "meta": { "generated_at": "...", "total_teams": 25, ... },
  "teams": {
    "rorobotics": {
      "team_info": { "name": "Rorobotics", ... },
      "environment_variables": {
        "ENDPOINT_URL": "https://rorobotics.hub.hackload.kz",
        "EVENT_PROVIDER": "https://hub.hackload.kz/event/rorobotics/event-provider",
        "PAYMENT_ENDPOINT": "https://hub.hackload.kz/event/rorobotics/payments",
        "Repo": "https://github.com/hackload-kz/rorobotics",
        "MERCHANT_ID": "rorobotics",
        "MERCHANT_PASSWORD": "aBc123#-@XyZ..."
      }
    }
  }
}
        """
    )
    
    parser.add_argument('--teams-file', default='approved-teams.json',
                       help='Path to teams JSON file (default: approved-teams.json)')
    parser.add_argument('--output', '-o', default='team-env-config.json',
                       help='Output JSON file path (default: team-env-config.json)')
    parser.add_argument('--base-url', default='https://hub.hackload.kz',
                       help='Base URL for API endpoints (default: https://hub.hackload.kz)')
    parser.add_argument('--github-org', default='hackload-kz',
                       help='GitHub organization name (default: hackload-kz)')
    parser.add_argument('--pretty', action='store_true',
                       help='Format JSON output with indentation for readability')
    
    args = parser.parse_args()
    
    print("============================================================")
    print("Team Environment Configuration Generator for HackLoad 2025")
    print("============================================================")
    print(f"📁 Teams file: {args.teams_file}")
    print(f"📄 Output file: {args.output}")
    print(f"🌐 Base URL: {args.base_url}")
    print(f"🐙 GitHub org: {args.github_org}")
    print(f"🎨 Pretty format: {args.pretty}")
    print()
    
    # Load and validate approved teams
    teams = load_teams_data(args.teams_file)
    
    if not validate_approved_teams(teams):
        sys.exit(1)
    
    # Generate configuration
    config = generate_teams_config(teams, args.base_url, args.github_org)
    
    # Write configuration to file
    try:
        with open(args.output, 'w', encoding='utf-8') as f:
            if args.pretty:
                json.dump(config, f, indent=2, ensure_ascii=False)
            else:
                json.dump(config, f, ensure_ascii=False)
        
        print("=" * 60)
        print("📊 CONFIGURATION GENERATION SUMMARY")
        print("=" * 60)
        print(f"Teams processed: {len(config['teams'])}")
        print(f"Total environment variables: {len(config['teams']) * 6}")
        print(f"Output file: {args.output}")
        print(f"File size: {os.path.getsize(args.output)} bytes")
        
        print()
        print("✅ Configuration file generated successfully!")
        print()
        print("📋 Environment Variables per team:")
        print("   • ENDPOINT_URL - Team-specific Billeter API endpoint")
        print("   • EVENT_PROVIDER - Event provider endpoint")
        print("   • PAYMENT_ENDPOINT - Payment gateway API endpoint")
        print("   • Repo - Team's GitHub repository URL")
        print("   • MERCHANT_ID - Team nickname as merchant identifier")
        print("   • MERCHANT_PASSWORD - Randomly generated 26-character password")
        
        print()
        print("🔐 Security Notes:")
        print("   • MERCHANT_PASSWORD values are randomly generated")
        print("   • Consider treating MERCHANT_PASSWORD as sensitive data")
        print("   • Store configuration file securely")
        
    except Exception as e:
        print(f"❌ Error writing configuration file: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()