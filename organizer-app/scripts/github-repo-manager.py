#!/usr/bin/env python3
"""
Simple GitHub Repository Management Script
Creates and manages GitHub repositories for HackLoad 2025 teams.
"""

import argparse
import json
import os
import sys
import time
import requests
from typing import Dict, List, Optional, Set
from urllib.parse import urlparse


class GitHubAPI:
    def __init__(self, token: str, org: str, dry_run: bool = False):
        self.token = token
        self.org = org
        self.dry_run = dry_run
        self.headers = {
            'Authorization': f'token {token}',
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        }
        self.base_url = 'https://api.github.com'

    def create_repository(self, name: str, description: str) -> bool:
        """Create a new repository in the organization."""
        url = f"{self.base_url}/orgs/{self.org}/repos"
        data = {
            "name": name,
            "description": description,
            "private": False,
            "auto_init": True,
            "license_template": "mit"
        }
        
        if self.dry_run:
            print(f"[DRY RUN] Would create repository: {self.org}/{name}")
            print(f"[DRY RUN] Description: {description}")
            return True
        
        try:
            response = requests.post(url, headers=self.headers, json=data)
            if response.status_code == 201:
                print(f"✅ Created repository: {self.org}/{name}")
                return True
            elif response.status_code == 422:
                # Repository already exists
                print(f"ℹ️ Repository already exists: {self.org}/{name}")
                return True
            else:
                response.raise_for_status()
        except requests.exceptions.RequestException as e:
            print(f"❌ Error creating repository {name}: {e}")
            return False

    def get_collaborators(self, repo_name: str) -> Set[str]:
        """Get current collaborators for a repository."""
        url = f"{self.base_url}/repos/{self.org}/{repo_name}/collaborators"
        
        if self.dry_run:
            print(f"[DRY RUN] Would get collaborators for: {self.org}/{repo_name}")
            return set()
        
        try:
            response = requests.get(url, headers=self.headers)
            response.raise_for_status()
            collaborators = response.json()
            return {collab['login'] for collab in collaborators}
        except requests.exceptions.RequestException as e:
            print(f"❌ Error getting collaborators for {repo_name}: {e}")
            return set()

    def add_collaborator(self, repo_name: str, username: str, permission: str = "push") -> bool:
        """Add a collaborator to a repository."""
        url = f"{self.base_url}/repos/{self.org}/{repo_name}/collaborators/{username}"
        data = {"permission": permission}
        
        if self.dry_run:
            print(f"[DRY RUN] Would add collaborator: {username} to {self.org}/{repo_name} with {permission} permission")
            return True
        
        try:
            response = requests.put(url, headers=self.headers, json=data)
            if response.status_code in [201, 204]:
                print(f"✅ Added collaborator: {username} to {repo_name}")
                return True
            else:
                response.raise_for_status()
        except requests.exceptions.RequestException as e:
            print(f"❌ Error adding collaborator {username} to {repo_name}: {e}")
            return False

    def remove_collaborator(self, repo_name: str, username: str) -> bool:
        """Remove a collaborator from a repository."""
        url = f"{self.base_url}/repos/{self.org}/{repo_name}/collaborators/{username}"
        
        if self.dry_run:
            print(f"[DRY RUN] Would remove collaborator: {username} from {self.org}/{repo_name}")
            return True
        
        try:
            response = requests.delete(url, headers=self.headers)
            if response.status_code == 204:
                print(f"✅ Removed collaborator: {username} from {repo_name}")
                return True
            else:
                response.raise_for_status()
        except requests.exceptions.RequestException as e:
            print(f"❌ Error removing collaborator {username} from {repo_name}: {e}")
            return False

    def get_org_members(self) -> Set[str]:
        """Get organization members (to avoid removing admins)."""
        url = f"{self.base_url}/orgs/{self.org}/members"
        
        if self.dry_run:
            print(f"[DRY RUN] Would get org members for: {self.org}")
            return set()
        
        try:
            response = requests.get(url, headers=self.headers)
            response.raise_for_status()
            members = response.json()
            return {member['login'] for member in members}
        except requests.exceptions.RequestException as e:
            print(f"❌ Error getting org members: {e}")
            return set()


class TeamEnvAPI:
    def __init__(self, api_base_url: str, api_key: str, dry_run: bool = False):
        self.api_base_url = api_base_url.rstrip('/')
        self.api_key = api_key
        self.dry_run = dry_run
        self.headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        }

    def set_repo_env_var(self, team_nickname: str, repo_url: str) -> bool:
        """Set the repository URL as an environment variable."""
        url = f"{self.api_base_url}/api/teams/{team_nickname}/env"
        
        data = {
            "key": "Repo",
            "value": repo_url,
            "description": "Репозиторий для хранения кода в рамках хакатона",
            "category": "general",
            "isSecure": False,
            "isEditable": False  # Read-only
        }
        
        if self.dry_run:
            print(f"[DRY RUN] Would set Repo env var for team {team_nickname}: {repo_url}")
            return True
        
        try:
            response = requests.post(url, headers=self.headers, json=data)
            response.raise_for_status()
            print(f"✅ Set Repo URL for team {team_nickname}")
            return True
        except requests.exceptions.RequestException as e:
            print(f"❌ Error setting repo URL for team {team_nickname}: {e}")
            return False


def extract_github_username(github_url: str) -> Optional[str]:
    """Extract GitHub username from various URL formats."""
    if not github_url:
        return None
    
    # Handle various GitHub URL formats
    github_url = github_url.strip()
    if github_url.startswith('github.com/'):
        github_url = 'https://' + github_url
    elif not github_url.startswith('http'):
        github_url = 'https://github.com/' + github_url
    
    try:
        parsed = urlparse(github_url)
        if parsed.netloc in ['github.com', 'www.github.com']:
            path_parts = parsed.path.strip('/').split('/')
            if path_parts and path_parts[0]:
                return path_parts[0]
    except Exception:
        pass
    
    return None


def load_teams_data(teams_file: str) -> List[Dict]:
    """Load teams data from JSON file."""
    try:
        with open(teams_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
            teams = data.get('data', [])
            # Filter for approved teams only
            return [team for team in teams if team.get('teamStatus') == 'APPROVED']
    except FileNotFoundError:
        print(f"❌ Teams file not found: {teams_file}")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"❌ Invalid JSON in teams file: {e}")
        sys.exit(1)


def load_members_data(members_file: str) -> Dict[str, str]:
    """Load members data and create email to GitHub URL mapping."""
    try:
        with open(members_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
            members = data.get('data', [])
            return {
                member['email']: member.get('githubUrl', '')
                for member in members
                if member.get('email') and member.get('githubUrl')
            }
    except FileNotFoundError:
        print(f"⚠️ Members file not found: {members_file}. GitHub collaborators won't be managed.")
        return {}
    except json.JSONDecodeError as e:
        print(f"❌ Invalid JSON in members file: {e}")
        return {}


def sync_team_repositories(teams: List[Dict], github_api: GitHubAPI, 
                          team_env_api: Optional[TeamEnvAPI], 
                          email_to_github: Dict[str, str]):
    """Synchronize repositories for all teams."""
    success_count = 0
    total_count = len(teams)
    
    # Get org members to avoid removing them
    org_members = github_api.get_org_members()
    
    for team in teams:
        team_name = team['teamName']
        team_nickname = team['teamNickname']
        
        print(f"\n🔄 Processing team: {team_name} ({team_nickname})")
        
        # 1. Create or update repository
        description = f"HackLoad 2025 - Репозиторий команды {team_name}"
        repo_created = github_api.create_repository(team_nickname, description)
        
        if not repo_created:
            print(f"❌ Failed to create/access repository for team {team_nickname}")
            continue
        
        # 2. Manage collaborators
        if email_to_github:
            current_collaborators = github_api.get_collaborators(team_nickname)
            
            # Get expected collaborators from team members
            expected_collaborators = set()
            for member in team['members']:
                email = member.get('email', '')
                github_url = email_to_github.get(email)
                if github_url:
                    username = extract_github_username(github_url)
                    if username:
                        expected_collaborators.add(username)
                    else:
                        print(f"⚠️ Could not extract username from GitHub URL: {github_url}")
                else:
                    print(f"⚠️ No GitHub URL found for member: {email}")
            
            # Add missing collaborators
            for username in expected_collaborators:
                if username not in current_collaborators:
                    github_api.add_collaborator(team_nickname, username)
                    time.sleep(0.5)  # Rate limiting
            
            # Remove unauthorized collaborators (but keep org members)
            for username in current_collaborators:
                if username not in expected_collaborators and username not in org_members:
                    github_api.remove_collaborator(team_nickname, username)
                    time.sleep(0.5)  # Rate limiting
        
        # 3. Set repository URL as environment variable
        if team_env_api:
            repo_url = f"https://github.com/{github_api.org}/{team_nickname}"
            team_env_api.set_repo_env_var(team_nickname, repo_url)
        
        success_count += 1
        time.sleep(2)  # Rate limiting between teams
    
    print(f"\n📊 Summary: {success_count}/{total_count} teams processed successfully")
    return success_count == total_count


def main():
    parser = argparse.ArgumentParser(description='Manage GitHub repositories for teams')
    parser.add_argument('--teams-file', default='approved-teams.json',
                       help='Path to teams JSON file')
    parser.add_argument('--members-file', default='approved-members.json',
                       help='Path to members JSON file with GitHub URLs')
    parser.add_argument('--github-token',
                       default=os.getenv('GITHUB_TOKEN'),
                       help='GitHub personal access token')
    parser.add_argument('--github-org',
                       default=os.getenv('GITHUB_ORG', 'hackload-kz'),
                       help='GitHub organization name')
    parser.add_argument('--api-base-url',
                       default=os.getenv('API_BASE_URL', 'https://hub.hackload.kz'),
                       help='API base URL for setting repo env vars')
    parser.add_argument('--api-key',
                       default=os.getenv('SERVICE_API_KEY'),
                       help='Service API key for setting repo env vars')
    parser.add_argument('--dry-run', action='store_true',
                       help='Show what would be done without making changes')
    parser.add_argument('--no-env-vars', action='store_true',
                       help='Skip setting repository URLs as environment variables')
    
    args = parser.parse_args()
    
    if not args.github_token:
        print("❌ GitHub token is required. Set GITHUB_TOKEN environment variable or use --github-token")
        sys.exit(1)
    
    print("============================================================")
    print("GitHub Repository Manager for HackLoad 2025 Teams")
    print("============================================================")
    print(f"📁 Teams file: {args.teams_file}")
    print(f"👥 Members file: {args.members_file}")
    print(f"🏢 GitHub org: {args.github_org}")
    print(f"🌐 API base URL: {args.api_base_url}")
    print(f"🧪 Dry run: {args.dry_run}")
    print(f"🔧 Set env vars: {not args.no_env_vars}")
    print()
    
    # Load data
    teams = load_teams_data(args.teams_file)
    email_to_github = load_members_data(args.members_file)
    
    print(f"📋 Found {len(teams)} approved teams")
    print(f"👥 Found {len(email_to_github)} members with GitHub URLs")
    
    if args.dry_run:
        print("🧪 DRY RUN MODE - No changes will be made")
    print()
    
    # Initialize APIs
    github_api = GitHubAPI(args.github_token, args.github_org, args.dry_run)
    
    team_env_api = None
    if not args.no_env_vars and args.api_key:
        team_env_api = TeamEnvAPI(args.api_base_url, args.api_key, args.dry_run)
    elif not args.no_env_vars:
        print("⚠️ No API key provided, skipping environment variable updates")
    
    # Sync repositories
    success = sync_team_repositories(teams, github_api, team_env_api, email_to_github)
    
    if not success:
        sys.exit(1)


if __name__ == '__main__':
    main()