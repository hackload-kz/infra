/**
 * K6 Authorization Testing Service for "Authorization Check" Task
 * 
 * Evaluates team performance on the Authorization Check testing challenge.
 * Tests are performed without specific user loads, focusing on authorization
 * functionality with 95% success rate threshold for passing.
 * Uses auth test pattern: <teamSlug>-check-authorizations-*-<testId>
 */

import { BaseJobService } from './base-service';
import { GrafanaClient } from '../lib/grafana-client';
import { CriteriaType, CriteriaStatus, Team, MetricsData } from '../types/criteria';

export interface K6AuthorizationTestingMetrics {
  teamsEvaluated: number;
  totalTestsFound: number;
  testsPassedOverall: number;
  averageSuccessRate: number;
  lastEvaluationDuration: number;
  topPerformers: Array<{
    teamSlug: string;
    successRate: number;
    testsPassed: number;
  }>;
}

export interface AuthorizationTaskConfig {
  successRateThreshold: number;
  baseScore: number;
}

/**
 * K6 Authorization Testing Service for Authorization Check Task
 */
export class K6AuthorizationTestingService extends BaseJobService {
  readonly criteriaType: CriteriaType = CriteriaType.AUTH_PERFORMANCE;
  readonly serviceName: string = 'K6AuthorizationTestingService';
  
  private grafana: GrafanaClient;
  private metrics: K6AuthorizationTestingMetrics;
  private readonly taskConfig: AuthorizationTaskConfig;

  constructor() {
    super();
    
    this.grafana = new GrafanaClient();
    this.metrics = {
      teamsEvaluated: 0,
      totalTestsFound: 0,
      testsPassedOverall: 0,
      averageSuccessRate: 0,
      lastEvaluationDuration: 0,
      topPerformers: []
    };

    // Configuration for Authorization Check testing task
    this.taskConfig = {
      successRateThreshold: 100.0, // 100% success rate required for authorization
      baseScore: 100 // Base score for passing authorization tests
    };

    this.log('info', 'K6 Authorization Testing Service initialized', {
      taskConfig: this.taskConfig
    });
  }

  async collectMetrics(team: Team): Promise<MetricsData> {
    this.log('info', `Collecting K6 authorization testing metrics for team ${team.nickname}`);

    if (!this.grafana.isConfigured()) {
      this.log('warn', 'Grafana not configured, skipping K6 authorization testing evaluation');
      return {};
    }

    try {
      // Use team nickname directly as approved teams have specific nicknames for test IDs
      const teamSlug = team.nickname;
      const summary = await this.grafana.generateAuthorizationTeamSummary(parseInt(team.id), teamSlug, team.name);
      
      this.log('info', `Team ${team.name} (${teamSlug}): ${summary.totalScore} points, ${summary.passedTests}/${summary.totalTests} authorization tests passed`);

      // Return metrics data for BaseJobService
      return {
        totalScore: summary.totalScore,
        passedTests: summary.passedTests,
        totalTests: summary.totalTests,
        lastTestTime: summary.lastTestTime?.toISOString(),
        // Authorization-specific metrics based on K6 thresholds
        totalRequests: summary.testResults.length > 0 ? summary.testResults[0].totalRequests : 0,
        failedTests: summary.totalTests - summary.passedTests,
        p95: summary.testResults.length > 0 ? summary.testResults[0].p95Latency : undefined,
        successRate: summary.testResults.length > 0 ? summary.testResults[0].successRate : 0,
        thresholdsMet: summary.testResults.length > 0 ? summary.testResults[0].testPassed : false,
        expectedRequests: 42, // From K6 threshold: 'http_reqs': ['count===42']
        checksRequired: 100, // From K6 threshold: 'checks': ['rate>=1'] (100%)
        testResults: summary.testResults.map(result => ({
          testPassed: result.testPassed,
          score: result.score,
          successRate: result.successRate,
          totalRequests: result.totalRequests,
          errorCount: result.errorCount,
          peakRps: result.peakRps,
          p95Latency: result.p95Latency,
          grafanaDashboardUrl: result.grafanaDashboardUrl,
          testId: result.testId
        })),
        maxPossibleScore: this.taskConfig.baseScore,
        successRateThreshold: this.taskConfig.successRateThreshold,
        teamSlug,
        taskType: 'authorization'
      };
    } catch (error) {
      this.log('error', `Failed to collect K6 authorization testing metrics for team ${team.id}:`, error);
      throw error;
    }
  }

  override evaluateStatus(metrics: MetricsData): CriteriaStatus {
    const totalTests = (metrics['totalTests'] as number) || 0;
    const passedTests = (metrics['passedTests'] as number) || 0;
    
    if (totalTests === 0) {
      return CriteriaStatus.NO_DATA;
    } else if (passedTests > 0) {
      return CriteriaStatus.PASSED;
    } else {
      return CriteriaStatus.FAILED;
    }
  }

  override calculateScore(status: CriteriaStatus, metrics: MetricsData): number {
    // Return the calculated score from metrics, or use default scoring
    const totalScore = (metrics['totalScore'] as number) || 0;
    
    if (totalScore > 0) {
      return totalScore;
    }
    
    // Fallback to default scoring
    return super.calculateScore(status, metrics);
  }

  /**
   * Generate Grafana dashboard URL for a specific authorization test
   */
  generateDashboardUrl(testId: string): string {
    return this.grafana.generateGrafanaDashboardUrl(testId);
  }

  /**
   * Get service configuration for debugging
   */
  getConfiguration(): AuthorizationTaskConfig {
    return { ...this.taskConfig };
  }

  /**
   * Get current metrics for monitoring
   */
  getCurrentMetrics(): K6AuthorizationTestingMetrics {
    return { ...this.metrics };
  }
}