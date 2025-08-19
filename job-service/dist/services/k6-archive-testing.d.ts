import { BaseJobService } from './base-service';
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
export declare class K6ArchiveTestingService extends BaseJobService {
    readonly criteriaType: CriteriaType;
    readonly serviceName: string;
    private grafana;
    private metrics;
    private readonly taskConfig;
    constructor();
    collectMetrics(team: Team): Promise<MetricsData>;
    evaluateStatus(metrics: MetricsData): CriteriaStatus;
    calculateScore(status: CriteriaStatus, metrics: MetricsData): number;
    private generateTeamSlug;
    generateDashboardUrl(testId: string): string;
    getConfiguration(): ArchiveTaskConfig;
    getCurrentMetrics(): K6ArchiveTestingMetrics;
}
//# sourceMappingURL=k6-archive-testing.d.ts.map