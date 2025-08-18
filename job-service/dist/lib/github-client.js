"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitHubClient = void 0;
class GitHubClient {
    config;
    constructor(config) {
        this.config = config;
        if (!config.token && !config.appId) {
            throw new Error('Either GitHub token or App ID must be provided');
        }
    }
    async getRepositoryInfo(repoUrl) {
        const repoPath = this.extractRepositoryPath(repoUrl);
        if (!repoPath) {
            this.log('warn', `Invalid repository URL: ${repoUrl}`);
            return null;
        }
        try {
            const response = await this.makeRequest(`/repos/${repoPath}`);
            return {
                id: response['id'],
                name: response['name'],
                fullName: response['full_name'],
                htmlUrl: response['html_url'],
                defaultBranch: response['default_branch'],
                createdAt: response['created_at'],
                updatedAt: response['updated_at']
            };
        }
        catch (error) {
            this.log('error', `Failed to fetch repository info for ${repoUrl}:`, error);
            return null;
        }
    }
    async getCommits(repoUrl, options) {
        const repoPath = this.extractRepositoryPath(repoUrl);
        if (!repoPath) {
            this.log('warn', `Invalid repository URL: ${repoUrl}`);
            return [];
        }
        try {
            const params = new URLSearchParams();
            if (options?.since)
                params.append('since', options.since);
            if (options?.until)
                params.append('until', options.until);
            if (options?.branch)
                params.append('sha', options.branch);
            params.append('per_page', (options?.per_page || 100).toString());
            const url = `/repos/${repoPath}/commits${params.toString() ? `?${params.toString()}` : ''}`;
            const response = await this.makeRequest(url);
            return response.map((commit) => {
                const c = commit;
                const commitData = c['commit'];
                const authorData = commitData['author'];
                return {
                    sha: c['sha'],
                    message: commitData['message'],
                    author: {
                        name: authorData['name'],
                        email: authorData['email'],
                        date: authorData['date']
                    },
                    url: c['html_url']
                };
            });
        }
        catch (error) {
            this.log('error', `Failed to fetch commits for ${repoUrl}:`, error);
            return [];
        }
    }
    async checkRepositoryAccess(repoUrl) {
        const repoPath = this.extractRepositoryPath(repoUrl);
        if (!repoPath) {
            return false;
        }
        try {
            await this.makeRequest(`/repos/${repoPath}`);
            return true;
        }
        catch (error) {
            this.log('debug', `Repository access check failed for ${repoUrl}:`, error);
            return false;
        }
    }
    extractRepositoryPath(repoUrl) {
        try {
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
        }
        catch (error) {
            this.log('debug', `Failed to parse repository URL ${repoUrl}:`, error);
            return null;
        }
    }
    async makeRequest(endpoint) {
        const url = `${this.config.apiUrl}${endpoint}`;
        const headers = {
            'Accept': 'application/vnd.github+json',
            'User-Agent': 'HackLoad-JobService/1.0',
            'X-GitHub-Api-Version': '2022-11-28'
        };
        if (this.config.token) {
            headers['Authorization'] = `Bearer ${this.config.token}`;
        }
        else if (this.config.appId && this.config.privateKey) {
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
        }
        catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                throw new Error('GitHub API request timeout');
            }
            throw error;
        }
    }
    log(level, message, ...args) {
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
exports.GitHubClient = GitHubClient;
//# sourceMappingURL=github-client.js.map