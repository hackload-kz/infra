import { BaseJobService } from './base-service';
import { CriteriaType, CriteriaStatus, Team, GitMetrics } from '../types/criteria';
import { GitHubConfig } from '../lib/github-client';
export declare class GitMonitorService extends BaseJobService {
    readonly criteriaType = CriteriaType.CODE_REPO;
    readonly serviceName = "git-monitor-service";
    private githubClient;
    constructor(githubConfig: GitHubConfig);
    collectMetrics(team: Team): Promise<GitMetrics>;
    evaluateStatus(metrics: GitMetrics): CriteriaStatus;
    calculateScore(status: CriteriaStatus, metrics: GitMetrics): number;
    getRepositoryUrl(team: Team): Promise<string | null>;
}
//# sourceMappingURL=git-monitor.d.ts.map