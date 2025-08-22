/**
 * K6 Booking Testing Service for "Ticket Booking" Task
 * 
 * Evaluates team performance on the Ticket Booking load testing challenge.
 * Tests are performed at different load levels (1K, 5K, 10K, 25K, 50K users)
 * with scoring based on achieving 95% success rate threshold.
 * Uses booking test pattern: <teamSlug>-booking-<userSize>-<testNumber>
 */

import { BaseJobService } from './base-service';
import { GrafanaClient } from '../lib/grafana-client';
import { CriteriaType, CriteriaStatus, Team, MetricsData } from '../types/criteria';

export interface K6BookingTestingMetrics {
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

export interface BookingTaskConfig {
  userSizes: number[];
  successRateThreshold: number;
  scoreWeights: Record<number, number>;
}

/**
 * K6 Booking Testing Service for Ticket Booking Task
 */
export class K6BookingTestingService extends BaseJobService {
  readonly criteriaType: CriteriaType = CriteriaType.TICKET_BOOKING;
  readonly serviceName: string = 'K6BookingTestingService';
  
  private grafana: GrafanaClient;
  private metrics: K6BookingTestingMetrics;
  private readonly taskConfig: BookingTaskConfig;

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

    // Configuration for Ticket Booking load testing task
    this.taskConfig = {
      userSizes: [1000, 5000, 10000, 25000, 50000],
      successRateThreshold: 95.0, // 95% success rate required
      scoreWeights: {
        1000: 10,    // 10 points for 1K users
        5000: 20,    // 20 points for 5K users
        10000: 30,   // 30 points for 10K users
        25000: 30,   // 30 points for 25K users (equal to 10K)
        50000: 40    // 40 points for 50K users
      }
    };

    this.log('info', 'K6 Booking Testing Service initialized', {
      taskConfig: this.taskConfig
    });
  }

  async collectMetrics(team: Team): Promise<MetricsData> {
    this.log('info', `Collecting K6 booking testing metrics for team ${team.nickname}`);

    if (!this.grafana.isConfigured()) {
      this.log('warn', 'Grafana not configured, skipping K6 booking testing evaluation');
      return {};
    }

    try {
      // Use team nickname directly as approved teams have specific nicknames for test IDs
      const teamSlug = team.nickname;
      const summary = await this.grafana.generateBookingTeamSummary(parseInt(team.id), teamSlug, team.name);
      
      this.log('info', `Team ${team.name} (${teamSlug}): ${summary.totalScore} points, ${summary.passedTests}/${summary.totalTests} booking tests passed`);

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
          grafanaDashboardUrl: result.grafanaDashboardUrl,
          testId: result.testId
        })),
        maxPossibleScore: Object.values(this.taskConfig.scoreWeights).reduce((sum, score) => sum + score, 0),
        successRateThreshold: this.taskConfig.successRateThreshold,
        teamSlug,
        taskType: 'booking'
      };
    } catch (error) {
      this.log('error', `Failed to collect K6 booking testing metrics for team ${team.id}:`, error);
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
   * Generate Grafana dashboard URL for a specific booking test
   */
  generateDashboardUrl(testId: string): string {
    return this.grafana.generateGrafanaDashboardUrl(testId);
  }

  /**
   * Get service configuration for debugging
   */
  getConfiguration(): BookingTaskConfig {
    return { ...this.taskConfig };
  }

  /**
   * Get current metrics for monitoring
   */
  getCurrentMetrics(): K6BookingTestingMetrics {
    return { ...this.metrics };
  }
}