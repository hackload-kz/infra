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
    this.log('info', `Generating K6 load testing dashboard links for team ${team.nickname}`);

    try {
      // Generate team slug for dashboard links
      const teamSlug = this.generateTeamSlug(team.name, parseInt(team.id));
      
      // Generate dashboard URLs for each test level
      const dashboardLinks = this.taskConfig.userSizes.map(userSize => {
        const testIdPattern = `${teamSlug}-events-${userSize}`;
        return {
          userSize,
          testPattern: testIdPattern,
          dashboardUrl: this.grafana.generateGrafanaDashboardUrl(testIdPattern),
          maxScore: this.taskConfig.scoreWeights[userSize] || 0
        };
      });

      this.log('info', `Generated ${dashboardLinks.length} dashboard links for team ${team.name} (${teamSlug})`);

      // Return dashboard links for teams to check their results
      return {
        teamSlug,
        dashboardLinks,
        maxPossibleScore: Object.values(this.taskConfig.scoreWeights).reduce((sum, score) => sum + score, 0),
        successRateThreshold: this.taskConfig.successRateThreshold,
        testDescription: 'K6 Load Testing - Events API',
        instructions: 'Teams can view their test results using the provided Grafana dashboard links. Tests must achieve ≥95% success rate to earn points.'
      };
    } catch (error) {
      this.log('error', `Failed to generate K6 dashboard links for team ${team.id}:`, error);
      throw error;
    }
  }

  override evaluateStatus(metrics: MetricsData): CriteriaStatus {
    // For K6 dashboard link generation, we always return NO_DATA
    // since we're not actually collecting test results, just providing links
    const dashboardLinks = metrics['dashboardLinks'] as Array<{userSize: number; testPattern: string; dashboardUrl: string; maxScore: number}>;
    
    if (dashboardLinks && dashboardLinks.length > 0) {
      // Links are available for teams to check their results
      return CriteriaStatus.NO_DATA;
    }
    
    return CriteriaStatus.NO_DATA;
  }

  override calculateScore(_status: CriteriaStatus, _metrics: MetricsData): number {
    // For dashboard link generation, no automatic scoring
    // Teams need to check their results manually through Grafana
    return 0;
  }

  /**
   * Generate team slug from team name and ID
   * Converts team name to URL-friendly slug format
   */
  private generateTeamSlug(teamName: string, teamId: number): string {
    // Convert to lowercase and replace spaces/special chars with hyphens
    const slug = teamName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
      .replace(/\s+/g, '-')         // Replace spaces with hyphens
      .replace(/-+/g, '-')          // Replace multiple hyphens with single hyphen
      .replace(/^-|-$/g, '');       // Remove leading/trailing hyphens
    
    // Fallback to team-{id} if slug is empty
    return slug || `team-${teamId}`;
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