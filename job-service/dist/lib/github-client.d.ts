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
export declare class GitHubClient {
    private readonly config;
    constructor(config: GitHubConfig);
    getRepositoryInfo(repoUrl: string): Promise<GitHubRepository | null>;
    getCommits(repoUrl: string, options?: {
        since?: string;
        until?: string;
        branch?: string;
        per_page?: number;
    }): Promise<GitHubCommit[]>;
    checkRepositoryAccess(repoUrl: string): Promise<boolean>;
    private extractRepositoryPath;
    private makeRequest;
    private log;
}
//# sourceMappingURL=github-client.d.ts.map