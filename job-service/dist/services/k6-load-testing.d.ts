import { BaseJobService } from './base-service';
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
export declare class K6LoadTestingService extends BaseJobService {
    readonly criteriaType: CriteriaType;
    readonly serviceName: string;
    private grafana;
    private metrics;
    private readonly taskConfig;
    constructor();
    collectMetrics(team: Team): Promise<MetricsData>;
    evaluateStatus(metrics: MetricsData): CriteriaStatus;
    calculateScore(status: CriteriaStatus, metrics: MetricsData): number;
    generateDashboardUrl(testId: string): string;
    getConfiguration(): GetEventsTaskConfig;
    getCurrentMetrics(): K6LoadTestingMetrics;
}
//# sourceMappingURL=k6-load-testing.d.ts.map