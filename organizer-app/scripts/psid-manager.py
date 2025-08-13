#!/usr/bin/env python3
"""
Simple PSID Management Script
Manages PSID (Payment System ID) values for HackLoad 2025 teams.
"""

import argparse
import json
import os
import sys
import csv
from typing import Dict, List, Optional


class PSIDManager:
    def __init__(self, teams_file: str, api_base_url: str, api_key: str, dry_run: bool = False):
        self.teams_file = teams_file
        self.api_base_url = api_base_url
        self.api_key = api_key
        self.dry_run = dry_run
        
        # Import the team env API we created earlier
        from subprocess import run, PIPE
        import sys
        script_dir = os.path.dirname(os.path.abspath(__file__))
        sys.path.append(script_dir)
        
        # We'll use the TeamEnvAPI from team-env-api.py
        # Import it dynamically to avoid import issues
        import importlib.util
        spec = importlib.util.spec_from_file_location("team_env_api", 
                                                     os.path.join(script_dir, "team-env-api.py"))
        team_env_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(team_env_module)
        
        self.team_env_api = team_env_module.TeamEnvAPI(api_base_url, api_key, dry_run)

    def load_teams_data(self) -> List[Dict]:
        """Load teams data from JSON file."""
        try:
            with open(self.teams_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                teams = data.get('data', [])
                # Filter for approved teams only
                return [team for team in teams if team.get('teamStatus') == 'APPROVED']
        except FileNotFoundError:
            print(f"❌ Teams file not found: {self.teams_file}")
            sys.exit(1)
        except json.JSONDecodeError as e:
            print(f"❌ Invalid JSON in teams file: {e}")
            sys.exit(1)

    def load_psid_mapping(self, psid_file: str) -> Dict[str, str]:
        """Load PSID mapping from CSV file."""
        psid_map = {}
        
        if not os.path.exists(psid_file):
            print(f"❌ PSID file not found: {psid_file}")
            return psid_map
        
        try:
            with open(psid_file, 'r', encoding='utf-8') as f:
                # Try to detect if it's CSV or JSON
                first_line = f.readline().strip()
                f.seek(0)
                
                if first_line.startswith('{') or first_line.startswith('['):
                    # JSON format
                    data = json.load(f)
                    if isinstance(data, dict):
                        psid_map = data
                    elif isinstance(data, list):
                        # List of dicts with team and psid fields
                        for item in data:
                            team_key = item.get('team') or item.get('teamNickname') or item.get('nickname')
                            psid_value = item.get('psid') or item.get('PSID') or item.get('id')
                            if team_key and psid_value:
                                psid_map[team_key] = str(psid_value)
                else:
                    # CSV format - expect columns: team,psid or teamNickname,PSID
                    reader = csv.DictReader(f)
                    for row in reader:
                        team_key = (row.get('team') or row.get('teamNickname') or 
                                   row.get('nickname') or row.get('Team'))
                        psid_value = (row.get('psid') or row.get('PSID') or 
                                     row.get('id') or row.get('ID'))
                        if team_key and psid_value:
                            psid_map[team_key.strip()] = str(psid_value).strip()
        
        except Exception as e:
            print(f"❌ Error reading PSID file {psid_file}: {e}")
        
        return psid_map

    def get_current_psid_values(self, teams: List[Dict]) -> Dict[str, str]:
        """Get current PSID values from team environment variables."""
        current_psids = {}
        
        for team in teams:
            team_nickname = team['teamNickname']
            env_vars = team.get('environmentVariables', [])
            
            for env_var in env_vars:
                if env_var.get('key') == 'PSID':
                    current_psids[team_nickname] = env_var.get('value', '')
                    break
        
        return current_psids

    def update_psid_values(self, psid_mapping: Dict[str, str], teams: List[Dict]) -> bool:
        """Update PSID values for teams."""
        success_count = 0
        total_count = 0
        
        current_psids = self.get_current_psid_values(teams)
        
        for team in teams:
            team_nickname = team['teamNickname']
            team_name = team['teamName']
            
            if team_nickname not in psid_mapping:
                print(f"⚠️ No PSID mapping found for team: {team_nickname}")
                continue
            
            new_psid = psid_mapping[team_nickname]
            current_psid = current_psids.get(team_nickname, '')
            
            total_count += 1
            
            if current_psid == new_psid:
                print(f"ℹ️ PSID already up to date for {team_nickname}: {new_psid}")
                success_count += 1
                continue
            
            print(f"🔄 Updating PSID for {team_name} ({team_nickname}): {current_psid} -> {new_psid}")
            
            success = self.team_env_api.set_team_env_var(
                team_nickname,
                "PSID",
                new_psid,
                "ID Платежного аккаунта PS.KZ",
                "cloud",
                False,  # not secure
                True    # editable
            )
            
            if success:
                success_count += 1
        
        print(f"\n📊 Summary: {success_count}/{total_count} PSID updates processed successfully")
        return success_count == total_count

    def export_current_psids(self, output_file: str, teams: List[Dict]) -> bool:
        """Export current PSID values to a file."""
        current_psids = self.get_current_psid_values(teams)
        
        try:
            if output_file.endswith('.json'):
                with open(output_file, 'w', encoding='utf-8') as f:
                    json.dump(current_psids, f, indent=2, ensure_ascii=False)
            else:
                # CSV format
                with open(output_file, 'w', encoding='utf-8', newline='') as f:
                    writer = csv.writer(f)
                    writer.writerow(['team', 'psid'])
                    for team_nickname, psid in current_psids.items():
                        writer.writerow([team_nickname, psid])
            
            print(f"✅ Exported PSID values to: {output_file}")
            return True
        except Exception as e:
            print(f"❌ Error exporting PSID values: {e}")
            return False

    def list_teams_with_psids(self, teams: List[Dict]):
        """List all teams with their current PSID values."""
        current_psids = self.get_current_psid_values(teams)
        
        print(f"📋 PSID status for {len(teams)} approved teams:")
        print()
        
        for team in teams:
            team_nickname = team['teamNickname']
            team_name = team['teamName']
            psid = current_psids.get(team_nickname, 'Not Set')
            
            status_icon = "✅" if psid and psid != "Заполни меня" else "❌"
            print(f"{status_icon} {team_nickname:25} | {psid:15} | {team_name}")


def main():
    parser = argparse.ArgumentParser(description='Manage PSID values for teams')
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
    
    # Update PSIDs
    update_parser = subparsers.add_parser('update', help='Update PSID values from file')
    update_parser.add_argument('psid_file', help='CSV or JSON file with PSID mappings')
    
    # List PSIDs
    list_parser = subparsers.add_parser('list', help='List current PSID values')
    
    # Export PSIDs
    export_parser = subparsers.add_parser('export', help='Export current PSID values')
    export_parser.add_argument('output_file', help='Output file (CSV or JSON based on extension)')
    
    # Set single PSID
    set_parser = subparsers.add_parser('set', help='Set PSID for a specific team')
    set_parser.add_argument('team', help='Team nickname')
    set_parser.add_argument('psid', help='PSID value')
    
    args = parser.parse_args()
    
    if not args.api_key:
        print("❌ API key is required. Set SERVICE_API_KEY environment variable or use --api-key")
        sys.exit(1)
    
    print("============================================================")
    print("PSID Manager for HackLoad 2025 Teams")
    print("============================================================")
    print(f"📁 Teams file: {args.teams_file}")
    print(f"🌐 API base URL: {args.api_base_url}")
    print(f"🧪 Dry run: {args.dry_run}")
    print()
    
    manager = PSIDManager(args.teams_file, args.api_base_url, args.api_key, args.dry_run)
    teams = manager.load_teams_data()
    
    print(f"📋 Found {len(teams)} approved teams")
    print()
    
    if args.action == 'list':
        manager.list_teams_with_psids(teams)
    
    elif args.action == 'export':
        success = manager.export_current_psids(args.output_file, teams)
        if not success:
            sys.exit(1)
    
    elif args.action == 'update':
        psid_mapping = manager.load_psid_mapping(args.psid_file)
        if not psid_mapping:
            print("❌ No PSID mappings found in file")
            sys.exit(1)
        
        print(f"📥 Loaded {len(psid_mapping)} PSID mappings")
        if args.dry_run:
            print("🧪 DRY RUN MODE - No changes will be made")
        print()
        
        success = manager.update_psid_values(psid_mapping, teams)
        if not success:
            sys.exit(1)
    
    elif args.action == 'set':
        success = manager.team_env_api.set_team_env_var(
            args.team,
            "PSID",
            args.psid,
            "ID Платежного аккаунта PS.KZ",
            "cloud",
            False,  # not secure
            True    # editable
        )
        if not success:
            sys.exit(1)
    
    else:
        parser.print_help()


if __name__ == '__main__':
    main()