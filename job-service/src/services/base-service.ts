import { CriteriaType, CriteriaStatus, Team, CriteriaUpdate, MetricsData } from '../types/criteria';
import { BaseJobServiceInterface, ServiceHealth } from '../types/services';
import { HubApiClient } from '../lib/api-client';

export abstract class BaseJobService implements BaseJobServiceInterface {
  abstract readonly criteriaType: CriteriaType;
  abstract readonly serviceName: string;
  
  protected lastRunTime?: Date;
  protected lastSuccessTime?: Date;
  protected errorCount: number = 0;
  protected consecutiveFailures: number = 0;
  protected totalRuns: number = 0;
  protected apiClient?: HubApiClient;
  
  abstract collectMetrics(team: Team): Promise<MetricsData>;
  
  evaluateStatus(_metrics: MetricsData): CriteriaStatus {
    // Default implementation - should be overridden by specific services
    return CriteriaStatus.NO_DATA;
  }
  
  calculateScore(status: CriteriaStatus, _metrics: MetricsData): number {
    // Default scoring based on status
    switch (status) {
      case CriteriaStatus.PASSED:
        return 100;
      case CriteriaStatus.FAILED:
        return 0;
      case CriteriaStatus.NO_DATA:
        return 0;
      default:
        return 0;
    }
  }
  
  async run(): Promise<void> {
    this.lastRunTime = new Date();
    this.totalRuns++;
    
    try {
      const teams = await this.getTeams();
      const updates: CriteriaUpdate[] = [];
      
      for (const team of teams) {
        try {
          const metrics = await this.collectMetrics(team);
          const status = this.evaluateStatus(metrics);
          const score = this.calculateScore(status, metrics);
          
          updates.push({
            teamSlug: team.nickname,
            hackathonId: team.hackathonId,
            criteriaType: this.criteriaType,
            status,
            score,
            metrics,
            updatedBy: this.serviceName
          });
          
          this.log('info', `Processed team ${team.nickname}: ${status} (score: ${score})`);
        } catch (error) {
          this.log('error', `Failed to process team ${team.nickname}:`, error);
          // Continue processing other teams even if one fails
        }
      }
      
      if (updates.length > 0) {
        await this.bulkUpdateCriteria(updates);
        this.log('info', `Successfully updated ${updates.length} team criteria`);
      }
      
      this.lastSuccessTime = new Date();
      this.consecutiveFailures = 0;
      
    } catch (error) {
      this.errorCount++;
      this.consecutiveFailures++;
      await this.handleError(error);
      throw error; // Re-throw to let scheduler handle retries
    }
  }
  
  getHealth(): ServiceHealth {
    const errorRate = this.totalRuns > 0 ? (this.errorCount / this.totalRuns) * 100 : 0;
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (this.consecutiveFailures >= 3) {
      status = 'unhealthy';
    } else if (this.consecutiveFailures > 0 || errorRate > 10) {
      status = 'degraded';
    }
    
    return {
      serviceName: this.serviceName,
      status,
      lastRunTime: this.lastRunTime,
      lastSuccessTime: this.lastSuccessTime,
      errorRate,
      consecutiveFailures: this.consecutiveFailures
    };
  }
  
  setApiClient(apiClient: HubApiClient): void {
    this.apiClient = apiClient;
  }
  
  protected async getTeams(): Promise<Team[]> {
    if (!this.apiClient) {
      throw new Error('API client not configured');
    }
    
    try {
      return await this.apiClient.getTeams();
    } catch (error) {
      this.log('error', 'Failed to fetch teams from Hub API:', error);
      throw error;
    }
  }
  
  protected async getTeamEnvironmentData(team: Team): Promise<Record<string, string>> {
    if (!this.apiClient) {
      throw new Error('API client not configured');
    }
    
    try {
      return await this.apiClient.getTeamEnvironmentDataByNickname(team.nickname);
    } catch (error) {
      this.log('error', `Failed to fetch environment data for team ${team.nickname}:`, error);
      throw error;
    }
  }
  
  protected async bulkUpdateCriteria(updates: CriteriaUpdate[]): Promise<void> {
    if (!this.apiClient) {
      throw new Error('API client not configured');
    }
    
    if (updates.length === 0) {
      this.log('debug', 'No updates to send');
      return;
    }
    
    try {
      const response = await this.apiClient.bulkUpdateCriteria(updates);
      
      if (!response.success) {
        throw new Error(`Bulk update failed: ${response.error || response.message}`);
      }
      
      this.log('info', `Successfully updated ${response.data?.processed || updates.length} criteria`);
      
      if (response.data?.failed && response.data.failed > 0) {
        this.log('warn', `${response.data.failed} updates failed:`, response.data.errors);
      }
    } catch (error) {
      this.log('error', 'Failed to send criteria updates to Hub API:', error);
      throw error;
    }
  }
  
  protected async handleError(error: unknown): Promise<void> {
    this.log('error', `Service ${this.serviceName} encountered an error:`, error);
    
    // Could implement additional error handling here:
    // - Send alerts
    // - Store in dead letter queue
    // - Update service health status
  }
  
  protected log(level: 'debug' | 'info' | 'warn' | 'error', message: string, ...args: unknown[]): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] [${this.serviceName}] ${message}`;
    
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