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

    this.log('info', 'K6 Archive Testing Service initialized', {
      taskConfig: this.taskConfig
    });
  }

  async collectMetrics(team: Team): Promise<MetricsData> {
    this.log('info', `Generating K6 archive testing dashboard links for team ${team.nickname}`);

    try {
      // Generate team slug for dashboard links
      const teamSlug = this.generateTeamSlug(team.name, parseInt(team.id));
      
      // Generate dashboard URLs using the actual Prometheus test pattern
      // Pattern: <teamSlug>-archive-<userSize>-<testid> (similar to events)
      const dashboardLinks = this.taskConfig.userSizes.map(userSize => {
        const testIdPattern = `${teamSlug}-archive-${userSize}-*`;
        return {
          userSize,
          testPattern: testIdPattern,
          dashboardUrl: this.grafana.generateGrafanaDashboardUrl(testIdPattern),
          maxScore: this.taskConfig.scoreWeights[userSize] || 0,
          description: `K6 Archive Testing - ${userSize} пользователей`
        };
      });

      this.log('info', `Generated ${dashboardLinks.length} archive dashboard links for team ${team.name} (${teamSlug})`);

      // Return dashboard links for teams to check their archive test results
      return {
        teamSlug,
        dashboardLinks,
        maxPossibleScore: Object.values(this.taskConfig.scoreWeights).reduce((sum, score) => sum + score, 0),
        successRateThreshold: this.taskConfig.successRateThreshold,
        testDescription: 'K6 Load Testing - Archive Search API',
        taskType: 'archive',
        instructions: 'Команды могут просматривать результаты своих архивных тестов через Grafana dashboard. Формат test ID: ' + `${teamSlug}-archive-<userSize>-<testid>`
      };
    } catch (error) {
      this.log('error', `Failed to generate K6 archive dashboard links for team ${team.id}:`, error);
      throw error;
    }
  }

  override evaluateStatus(metrics: MetricsData): CriteriaStatus {
    // For K6 archive dashboard link generation, we always return NO_DATA
    // since we're not actually collecting test results, just providing links
    const dashboardLinks = metrics['dashboardLinks'] as Array<{userSize: number; testPattern: string; dashboardUrl: string; maxScore: number; description: string}>;
    
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
}