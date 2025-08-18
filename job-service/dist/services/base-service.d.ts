import { CriteriaType, CriteriaStatus, Team, CriteriaUpdate, MetricsData } from '../types/criteria';
import { BaseJobServiceInterface, ServiceHealth } from '../types/services';
import { HubApiClient } from '../lib/api-client';
export declare abstract class BaseJobService implements BaseJobServiceInterface {
    abstract readonly criteriaType: CriteriaType;
    abstract readonly serviceName: string;
    protected lastRunTime?: Date;
    protected lastSuccessTime?: Date;
    protected errorCount: number;
    protected consecutiveFailures: number;
    protected totalRuns: number;
    protected apiClient?: HubApiClient;
    abstract collectMetrics(team: Team): Promise<MetricsData>;
    evaluateStatus(_metrics: MetricsData): CriteriaStatus;
    calculateScore(status: CriteriaStatus, _metrics: MetricsData): number;
    run(): Promise<void>;
    getHealth(): ServiceHealth;
    setApiClient(apiClient: HubApiClient): void;
    protected getTeams(): Promise<Team[]>;
    protected getTeamEnvironmentData(team: Team): Promise<Record<string, string>>;
    protected bulkUpdateCriteria(updates: CriteriaUpdate[]): Promise<void>;
    protected handleError(error: unknown): Promise<void>;
    protected log(level: 'debug' | 'info' | 'warn' | 'error', message: string, ...args: unknown[]): void;
}
//# sourceMappingURL=base-service.d.ts.map