"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitMonitorService = void 0;
const base_service_1 = require("./base-service");
const criteria_1 = require("../types/criteria");
const github_client_1 = require("../lib/github-client");
class GitMonitorService extends base_service_1.BaseJobService {
    criteriaType = criteria_1.CriteriaType.CODE_REPO;
    serviceName = 'git-monitor-service';
    githubClient;
    constructor(githubConfig) {
        super();
        this.githubClient = new github_client_1.GitHubClient(githubConfig);
    }
    async collectMetrics(team) {
        try {
            const envData = await this.getTeamEnvironmentData(team);
            const repoUrl = envData['GITHUB_REPOSITORY_URL'];
            if (!repoUrl) {
                this.log('debug', `No repository URL found for team ${team.nickname}`);
                return {
                    hasRepository: false,
                    confirmationTitle: 'Репозиторий',
                    confirmationDescription: 'Исходный код решения команды'
                };
            }
            const hasAccess = await this.githubClient.checkRepositoryAccess(repoUrl);
            if (!hasAccess) {
                this.log('warn', `Cannot access repository ${repoUrl} for team ${team.nickname}`);
                return {
                    hasRepository: true,
                    repositoryUrl: repoUrl,
                    commitsCount: 0,
                    hasRecentActivity: false,
                    confirmationUrl: repoUrl,
                    confirmationTitle: 'Репозиторий',
                    confirmationDescription: 'Исходный код решения команды (недоступен для проверки)'
                };
            }
            const repoInfo = await this.githubClient.getRepositoryInfo(repoUrl);
            const oneDayAgo = new Date();
            oneDayAgo.setDate(oneDayAgo.getDate() - 1);
            const commits = await this.githubClient.getCommits(repoUrl, {
                since: oneDayAgo.toISOString(),
                per_page: 100
            });
            const lastCommit = commits.length > 0 ? commits[0] : null;
            const lastCommitTime = lastCommit?.author.date;
            const twoDaysAgo = new Date();
            twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
            const hasRecentActivity = lastCommitTime ?
                new Date(lastCommitTime) > twoDaysAgo : false;
            const metrics = {
                hasRepository: true,
                commitsCount: commits.length,
                lastCommitTime,
                repositoryUrl: repoUrl,
                hasRecentActivity,
                confirmationUrl: repoUrl,
                confirmationTitle: 'Репозиторий',
                confirmationDescription: 'Исходный код решения команды'
            };
            if (repoInfo) {
                const extendedMetrics = metrics;
                extendedMetrics['repositoryName'] = repoInfo.fullName;
                extendedMetrics['defaultBranch'] = repoInfo.defaultBranch;
                extendedMetrics['repositoryCreatedAt'] = repoInfo.createdAt;
                extendedMetrics['repositoryUpdatedAt'] = repoInfo.updatedAt;
            }
            this.log('debug', `Collected git metrics for team ${team.nickname}:`, {
                commitsCount: commits.length,
                hasRecentActivity,
                lastCommitTime
            });
            return metrics;
        }
        catch (error) {
            this.log('error', `Failed to collect git metrics for team ${team.nickname}:`, error);
            return {
                hasRepository: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                confirmationTitle: 'Репозиторий',
                confirmationDescription: 'Исходный код решения команды (ошибка при проверке)'
            };
        }
    }
    evaluateStatus(metrics) {
        if (!metrics.hasRepository) {
            return criteria_1.CriteriaStatus.NO_DATA;
        }
        const metricsWithError = metrics;
        if (metricsWithError['error']) {
            return criteria_1.CriteriaStatus.FAILED;
        }
        const minCommits = 2;
        const commitsCount = metrics.commitsCount || 0;
        const hasRecentActivity = metrics.hasRecentActivity || false;
        if (commitsCount >= minCommits && hasRecentActivity) {
            return criteria_1.CriteriaStatus.PASSED;
        }
        if (commitsCount > 0) {
            return criteria_1.CriteriaStatus.FAILED;
        }
        return criteria_1.CriteriaStatus.NO_DATA;
    }
    calculateScore(status, metrics) {
        if (status === criteria_1.CriteriaStatus.NO_DATA) {
            return 0;
        }
        const metricsWithError = metrics;
        if (status === criteria_1.CriteriaStatus.FAILED && metricsWithError['error']) {
            return metrics.hasRepository ? 25 : 0;
        }
        if (status === criteria_1.CriteriaStatus.PASSED) {
            return 100;
        }
        const commitsCount = metrics.commitsCount || 0;
        const minCommits = 5;
        if (commitsCount === 0) {
            return 10;
        }
        const commitScore = Math.min(80, 10 + (commitsCount / minCommits) * 70);
        const activityBonus = metrics.hasRecentActivity ? 10 : 0;
        return Math.min(99, commitScore + activityBonus);
    }
    async getRepositoryUrl(team) {
        try {
            const envData = await this.getTeamEnvironmentData(team);
            return envData['GITHUB_REPOSITORY_URL'] || null;
        }
        catch (error) {
            this.log('error', `Failed to get repository URL for team ${team.nickname}:`, error);
            return null;
        }
    }
}
exports.GitMonitorService = GitMonitorService;
//# sourceMappingURL=git-monitor.js.map