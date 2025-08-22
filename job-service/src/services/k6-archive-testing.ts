/**
 * K6 Archive Testing Service for "Archive Search" Task
 * 
 * Evaluates team performance on the Archive Search load testing challenge.
 * Tests are performed at different load levels (1K, 5K, 25K, 50K, 100K users)
 * with scoring based on achieving 95% success rate threshold.
 * Uses archive test pattern: <teamSlug>-archive-<userSize>-<testNumber>
 */

import { BaseJobService } from './base-service';
import { GrafanaClient } from '../lib/grafana-client';
import { CriteriaType, CriteriaStatus, Team, MetricsData } from '../types/criteria';

export interface K6ArchiveTestingMetrics {
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

export interface ArchiveTaskConfig {
  userSizes: number[];
  successRateThreshold: number;
  scoreWeights: Record<number, number>;
}

/**
 * K6 Archive Testing Service for Archive Search Task
 */
export class K6ArchiveTestingService extends BaseJobService {
  readonly criteriaType: CriteriaType = CriteriaType.ARCHIVE_SEARCH;
  readonly serviceName: string = 'K6ArchiveTestingService';
  
  private grafana: GrafanaClient;
  private metrics: K6ArchiveTestingMetrics;
  private readonly taskConfig: ArchiveTaskConfig;

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

    // Configuration for Archive Search load testing task
    this.taskConfig = {
      userSizes: [1000, 5000, 10000, 50000, 100000],
      successRateThreshold: 95.0, // 95% success rate required
      scoreWeights: {
        1000: 10,    // 10 points for 1K users
        5000: 20,    // 20 points for 5K users
        10000: 30,   // 30 points for 10K users
        50000: 40,   // 40 points for 50K users
        100000: 50   // 50 points for 100K users
      }
    };

    this.log('info', 'K6 Archive Testing Service initialized', {
      taskConfig: this.taskConfig
    });
  }

  async collectMetrics(team: Team): Promise<MetricsData> {
    this.log('info', `Collecting K6 archive testing metrics for team ${team.nickname}`);

    if (!this.grafana.isConfigured()) {
      this.log('warn', 'Grafana not configured, skipping K6 archive testing evaluation');
      return {};
    }

    try {
      // Use team nickname directly as approved teams have specific nicknames for test IDs
      const teamSlug = team.nickname;
      const summary = await this.grafana.generateArchiveTeamSummary(parseInt(team.id), teamSlug, team.name);
      
      this.log('info', `Team ${team.name} (${teamSlug}): ${summary.totalScore} points, ${summary.passedTests}/${summary.totalTests} archive tests passed`);

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
        teamSlug,
        taskType: 'archive'
      };
    } catch (error) {
      this.log('error', `Failed to collect K6 archive testing metrics for team ${team.id}:`, error);
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
   * Generate Grafana dashboard URL for a specific archive test
   */
  generateDashboardUrl(testId: string): string {
    return this.grafana.generateGrafanaDashboardUrl(testId);
  }

  /**
   * Get service configuration for debugging
   */
  getConfiguration(): ArchiveTaskConfig {
    return { ...this.taskConfig };
  }

  /**
   * Get current metrics for monitoring
   */
  getCurrentMetrics(): K6ArchiveTestingMetrics {
    return { ...this.metrics };
  }

  /**
   * Generate detailed report for archive test results showing passed tests with user loads and P95 latency
   */
  async generateArchiveTestReport(team: Team): Promise<string> {
    this.log('info', `Generating archive test report for team ${team.nickname}`);

    if (!this.grafana.isConfigured()) {
      return 'Grafana not configured - cannot generate archive test report';
    }

    try {
      const teamSlug = team.nickname;
      const summary = await this.grafana.generateArchiveTeamSummary(parseInt(team.id), teamSlug, team.name);
      
      const passedTests = summary.testResults.filter(result => result.testPassed);
      
      if (passedTests.length === 0) {
        return `Archive Test Report for ${team.name} (${teamSlug}):
❌ No passed archive tests found
Total tests attempted: ${summary.totalTests}
Score: ${summary.totalScore} / ${Object.values(this.taskConfig.scoreWeights).reduce((sum, score) => sum + score, 0)} points`;
      }

      let report = `Archive Test Report for ${team.name} (${teamSlug}):
✅ Passed Tests: ${passedTests.length}/${summary.totalTests}
🏆 Total Score: ${summary.totalScore} / ${Object.values(this.taskConfig.scoreWeights).reduce((sum, score) => sum + score, 0)} points

Passed Test Details:`;

      // Sort passed tests by user size for better readability
      const sortedPassedTests = passedTests.sort((a, b) => a.userSize - b.userSize);

      for (const test of sortedPassedTests) {
        const p95LatencyMs = (test.p95Latency * 1000).toFixed(1); // Convert seconds to milliseconds
        report += `
  📊 ${test.userSize.toLocaleString()} users: 
     • Score: ${test.score} points
     • Success Rate: ${test.successRate.toFixed(1)}%
     • P95 Latency: ${p95LatencyMs}ms
     • Peak RPS: ${test.peakRps.toFixed(0)}
     • Test ID: ${test.testId}`;
      }

      // Add highest load achieved
      const maxUserSize = Math.max(...passedTests.map(t => t.userSize));
      report += `

🎯 Highest Load Achieved: ${maxUserSize.toLocaleString()} users
📈 Best P95 Latency: ${Math.min(...passedTests.map(t => t.p95Latency * 1000)).toFixed(1)}ms`;

      if (summary.lastTestTime) {
        report += `
🕒 Last Test: ${summary.lastTestTime.toLocaleString()}`;
      }

      this.log('info', `Archive test report generated for team ${teamSlug}: ${passedTests.length} passed tests`);
      return report;

    } catch (error) {
      this.log('error', `Failed to generate archive test report for team ${team.id}:`, error);
      return `Error generating archive test report for ${team.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
}