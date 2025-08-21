/**
 * K6 Load Testing Service for "Get Events" Task
 * 
 * Evaluates team performance on the Get Events load testing challenge.
 * Tests are performed at different load levels (1K, 5K, 25K, 50K, 100K users)
 * with scoring based on achieving 95% success rate threshold.
 */

import { BaseJobService } from './base-service';
import { GrafanaClient } from '../lib/grafana-client';
import { CriteriaType, CriteriaStatus, Team, MetricsData } from '../types/criteria';

export interface K6LoadTestingMetrics {
  teamsEvaluated: number;
  totalTestsFound: number;
  testsPassedOverall: number;
  averageScore: number;
  lastEvaluationDuration: number;
  topPerformers: Array<{
    teamSlug: string;
    score: number;
    passedTests: number;
  }>;
}

export interface GetEventsTaskConfig {
  userSizes: number[];
  successRateThreshold: number;
  scoreWeights: Record<number, number>;
}

/**
 * K6 Load Testing Service for Get Events Task
 */
export class K6LoadTestingService extends BaseJobService {
  readonly criteriaType: CriteriaType = CriteriaType.EVENT_SEARCH;
  readonly serviceName: string = 'K6LoadTestingService';
  
  private grafana: GrafanaClient;
  private metrics: K6LoadTestingMetrics;
  private readonly taskConfig: GetEventsTaskConfig;

  constructor() {
    super();
    
    this.grafana = new GrafanaClient();
    this.metrics = {
      teamsEvaluated: 0,
      totalTestsFound: 0,
      testsPassedOverall: 0,
      averageScore: 0,
      lastEvaluationDuration: 0,
      topPerformers: []
    };

    // Configuration for Get Events load testing task
    this.taskConfig = {
      userSizes: [1000, 5000, 25000, 50000, 100000],
      successRateThreshold: 95.0, // 95% success rate required
      scoreWeights: {
        1000: 10,    // 10 points for 1K users
        5000: 20,    // 20 points for 5K users
        25000: 30,   // 30 points for 25K users
        50000: 40,   // 40 points for 50K users
        100000: 50   // 50 points for 100K users
      }
    };

    this.log('info', 'K6 Load Testing Service initialized', {
      taskConfig: this.taskConfig
    });
  }

  async collectMetrics(team: Team): Promise<MetricsData> {
    this.log('info', `[K6LoadTestingService] Starting metrics collection for team: ${team.name} (${team.nickname})`);

    if (!this.grafana.isConfigured()) {
      this.log('error', 'Grafana not configured, skipping K6 load testing evaluation - check dashboardBaseUrl in config');
      return {};
    }

    try {
      // Use team nickname directly as the slug (since test IDs use nickname, not generated slug from name)
      const teamSlug = team.nickname;
      
      const summary = await this.grafana.generateTeamSummary(parseInt(team.id), teamSlug, team.name);
      
      this.log('info', `Team ${team.name} (${teamSlug}): ${summary.totalScore} points, ${summary.passedTests}/${summary.totalTests} tests passed`);

      // Return metrics data for BaseJobService
      return {
        totalScore: summary.totalScore,
        passedTests: summary.passedTests,
        totalTests: summary.totalTests,
        lastTestTime: summary.lastTestTime?.toISOString(),
        testResults: summary.testResults.map(result => ({
          userSize: result.userSize,
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
        maxPossibleScore: Object.values(this.taskConfig.scoreWeights).reduce((sum, score) => sum + score, 0),
        successRateThreshold: this.taskConfig.successRateThreshold,
        teamSlug
      };
    } catch (error) {
      this.log('error', `Failed to collect K6 load testing metrics for team ${team.id}:`, error);
      throw error;
    }
  }

  override evaluateStatus(metrics: MetricsData): CriteriaStatus {
    const totalTests = (metrics['totalTests'] as number) || 0;
    const passedTests = (metrics['passedTests'] as number) || 0;
    const totalScore = (metrics['totalScore'] as number) || 0;
    
    if (totalTests === 0) {
      return CriteriaStatus.NO_DATA;
    } else if (passedTests > 0 && totalScore > 0) {
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
   * Generate Grafana dashboard URL for a specific test
   */
  generateDashboardUrl(testId: string): string {
    return this.grafana.generateGrafanaDashboardUrl(testId);
  }

  /**
   * Get service configuration for debugging
   */
  getConfiguration(): GetEventsTaskConfig {
    return { ...this.taskConfig };
  }

  /**
   * Get current metrics for monitoring
   */
  getCurrentMetrics(): K6LoadTestingMetrics {
    return { ...this.metrics };
  }
}