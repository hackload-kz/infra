export interface GitHubConfig {
  token?: string;
  apiUrl: string;
  appId?: string;
  privateKey?: string;
}

export interface GitHubCommit {
  sha: string;
  message: string;
  author: {
    name: string;
    email: string;
    date: string;
  };
  url: string;
}

export interface GitHubRepository {
  id: number;
  name: string;
  fullName: string;
  htmlUrl: string;
  defaultBranch: string;
  createdAt: string;
  updatedAt: string;
}

export class GitHubClient {
  private readonly config: GitHubConfig;
  
  constructor(config: GitHubConfig) {
    this.config = config;
    
    if (!config.token && !config.appId) {
      throw new Error('Either GitHub token or App ID must be provided');
    }
  }
  
  async getRepositoryInfo(repoUrl: string): Promise<GitHubRepository | null> {
    const repoPath = this.extractRepositoryPath(repoUrl);
    if (!repoPath) {
      this.log('warn', `Invalid repository URL: ${repoUrl}`);
      return null;
    }
    
    try {
      const response = await this.makeRequest(`/repos/${repoPath}`) as Record<string, unknown>;
      
      return {
        id: response['id'] as number,
        name: response['name'] as string,
        fullName: response['full_name'] as string,
        htmlUrl: response['html_url'] as string,
        defaultBranch: response['default_branch'] as string,
        createdAt: response['created_at'] as string,
        updatedAt: response['updated_at'] as string
      };
    } catch (error) {
      this.log('error', `Failed to fetch repository info for ${repoUrl}:`, error);
      return null;
    }
  }
  
  async getCommits(repoUrl: string, options?: {
    since?: string;
    until?: string;
    branch?: string;
    per_page?: number;
  }): Promise<GitHubCommit[]> {
    const repoPath = this.extractRepositoryPath(repoUrl);
    if (!repoPath) {
      this.log('warn', `Invalid repository URL: ${repoUrl}`);
      return [];
    }
    
    try {
      const params = new URLSearchParams();
      if (options?.since) params.append('since', options.since);
      if (options?.until) params.append('until', options.until);
      if (options?.branch) params.append('sha', options.branch);
      params.append('per_page', (options?.per_page || 100).toString());
      
      const url = `/repos/${repoPath}/commits${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await this.makeRequest(url) as unknown[];
      
      return response.map((commit: unknown) => {
        const c = commit as Record<string, unknown>;
        const commitData = c['commit'] as Record<string, unknown>;
        const authorData = commitData['author'] as Record<string, unknown>;
        
        return {
          sha: c['sha'] as string,
          message: commitData['message'] as string,
          author: {
            name: authorData['name'] as string,
            email: authorData['email'] as string,
            date: authorData['date'] as string
          },
          url: c['html_url'] as string
        };
      });
    } catch (error) {
      this.log('error', `Failed to fetch commits for ${repoUrl}:`, error);
      return [];
    }
  }
  
  async checkRepositoryAccess(repoUrl: string): Promise<boolean> {
    const repoPath = this.extractRepositoryPath(repoUrl);
    if (!repoPath) {
      return false;
    }
    
    try {
      await this.makeRequest(`/repos/${repoPath}`);
      return true;
    } catch (error) {
      this.log('debug', `Repository access check failed for ${repoUrl}:`, error);
      return false;
    }
  }
  
  private extractRepositoryPath(repoUrl: string): string | null {
    try {
      // Handle various GitHub URL formats:
      // https://github.com/owner/repo
      // https://github.com/owner/repo.git
      // git@github.com:owner/repo.git
      
      let normalizedUrl = repoUrl;
      
      if (repoUrl.startsWith('git@github.com:')) {
        normalizedUrl = repoUrl.replace('git@github.com:', 'https://github.com/');
      }
      
      if (normalizedUrl.endsWith('.git')) {
        normalizedUrl = normalizedUrl.slice(0, -4);
      }
      
      const url = new URL(normalizedUrl);
      if (url.hostname !== 'github.com') {
        return null;
      }
      
      const pathParts = url.pathname.split('/').filter(part => part.length > 0);
      if (pathParts.length < 2) {
        return null;
      }
      
      return `${pathParts[0]}/${pathParts[1]}`;
    } catch (error) {
      this.log('debug', `Failed to parse repository URL ${repoUrl}:`, error);
      return null;
    }
  }
  
  private async makeRequest(endpoint: string): Promise<unknown> {
    const url = `${this.config.apiUrl}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'HackLoad-JobService/1.0',
      'X-GitHub-Api-Version': '2022-11-28'
    };
    
    if (this.config.token) {
      headers['Authorization'] = `Bearer ${this.config.token}`;
    } else if (this.config.appId && this.config.privateKey) {
      // For GitHub Apps, we would need to implement JWT token generation
      // For now, just use the token if provided
      throw new Error('GitHub App authentication not yet implemented');
    }
    
    try {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(url, {
        headers,
        signal: controller.signal
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`GitHub API error ${response.status}: ${response.statusText} - ${errorText}`);
      }
      
      return await response.json();
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('GitHub API request timeout');
      }
      throw error;
    }
  }
  
  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, ...args: unknown[]): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] [GitHubClient] ${message}`;
    
    switch (level) {
      case 'debug':
        console.debug(logMessage, ...args);
        break;
      case 'info':
        console.info(logMessage, ...args);
        break;
      case 'warn':
        console.warn(logMessage, ...args);
        break;
      case 'error':
        console.error(logMessage, ...args);
        break;
    }
  }
}