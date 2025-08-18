import { BaseJobService } from './base-service';
import { CriteriaType, CriteriaStatus, Team, GitMetrics } from '../types/criteria';
import { GitHubClient, GitHubConfig } from '../lib/github-client';

export class GitMonitorService extends BaseJobService {
  readonly criteriaType = CriteriaType.CODE_REPO;
  readonly serviceName = 'git-monitor-service';
  
  private githubClient: GitHubClient;
  
  constructor(githubConfig: GitHubConfig) {
    super();
    this.githubClient = new GitHubClient(githubConfig);
  }
  
  async collectMetrics(team: Team): Promise<GitMetrics> {
    try {
      const envData = await this.getTeamEnvironmentData(team);
      const repoUrl = envData['Repo'];
      
      if (!repoUrl) {
        this.log('debug', `No repository URL found for team ${team.nickname}`);
        return {
          hasRepository: false,
          confirmationTitle: 'Репозиторий',
          confirmationDescription: 'Исходный код решения команды'
        };
      }
      
      // Check if we can access the repository
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
      
      // Get repository info
      const repoInfo = await this.githubClient.getRepositoryInfo(repoUrl);
      
      // Get commits from August 15th, 2025
      const hackathonStart = new Date('2025-08-15T00:00:00Z');

      const commits = await this.githubClient.getCommits(repoUrl, {
        since: hackathonStart.toISOString(),
        per_page: 100
      });
      
      const lastCommit = commits.length > 0 ? commits[0] : null;
      const lastCommitTime = lastCommit?.author.date;
      
      // Check for recent activity (within last 1 days)
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      const hasRecentActivity = lastCommitTime ?
        new Date(lastCommitTime) > oneDayAgo : false;

      const metrics: GitMetrics = {
        hasRepository: true,
        commitsCount: commits.length,
        lastCommitTime,
        repositoryUrl: repoUrl,
        hasRecentActivity,
        confirmationUrl: repoUrl,
        confirmationTitle: 'Репозиторий',
        confirmationDescription: 'Исходный код решения команды'
      };
      
      // Add additional repository info if available
      if (repoInfo) {
        const extendedMetrics = metrics as GitMetrics & Record<string, unknown>;
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
      
    } catch (error) {
      this.log('error', `Failed to collect git metrics for team ${team.nickname}:`, error);
      
      // Return basic metrics on error
      return {
        hasRepository: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        confirmationTitle: 'Репозиторий',
        confirmationDescription: 'Исходный код решения команды (ошибка при проверке)'
      };
    }
  }
  
  override evaluateStatus(metrics: GitMetrics): CriteriaStatus {
    if (!metrics.hasRepository) {
      return CriteriaStatus.NO_DATA;
    }
    
    // If we have an error, consider it as failed
    const metricsWithError = metrics as GitMetrics & Record<string, unknown>;
    if (metricsWithError['error']) {
      return CriteriaStatus.FAILED;
    }
    
    // Criteria for passing:
    // 1. At least 2 commits in the last 1 days
    // 2. Has recent activity (within last 2 days)
    const minCommits = 2;
    const commitsCount = metrics.commitsCount || 0;
    const hasRecentActivity = metrics.hasRecentActivity || false;
    
    if (commitsCount >= minCommits && hasRecentActivity) {
      return CriteriaStatus.PASSED;
    }
    
    // If there are some commits but not meeting the full criteria
    if (commitsCount > 0) {
      return CriteriaStatus.FAILED;
    }
    
    return CriteriaStatus.NO_DATA;
  }
  
  override calculateScore(status: CriteriaStatus, metrics: GitMetrics): number {
    if (status === CriteriaStatus.NO_DATA) {
      return 0;
    }
    
    const metricsWithError = metrics as GitMetrics & Record<string, unknown>;
    if (status === CriteriaStatus.FAILED && metricsWithError['error']) {
      // If there's an error, give partial credit if we know there's a repository
      return metrics.hasRepository ? 25 : 0;
    }
    
    if (status === CriteriaStatus.PASSED) {
      return 100;
    }
    
    // For FAILED status, calculate partial score based on commit count
    const commitsCount = metrics.commitsCount || 0;
    const minCommits = 5;
    
    if (commitsCount === 0) {
      return 10; // Some credit for having a repository
    }
    
    // Linear scaling based on commit count (10-80 points)
    const commitScore = Math.min(80, 10 + (commitsCount / minCommits) * 70);
    
    // Bonus for recent activity
    const activityBonus = metrics.hasRecentActivity ? 10 : 0;
    
    return Math.min(99, commitScore + activityBonus); // Cap at 99 to distinguish from fully passed
  }
  
  async getRepositoryUrl(team: Team): Promise<string | null> {
    try {
      const envData = await this.getTeamEnvironmentData(team);
      return envData['Repo'] || null;
    } catch (error) {
      this.log('error', `Failed to get repository URL for team ${team.nickname}:`, error);
      return null;
    }
  }
  
}