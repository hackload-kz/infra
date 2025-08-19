import { BaseJobService } from './base-service';
import { CriteriaType, CriteriaStatus, Team, DeploymentMetrics } from '../types/criteria';
export interface DeploymentMonitorConfig {
    httpTimeout: number;
    userAgent: string;
}
export declare class DeploymentMonitorService extends BaseJobService {
    readonly criteriaType = CriteriaType.DEPLOYED_SOLUTION;
    readonly serviceName = "deployment-monitor-service";
    private config;
    constructor(config: DeploymentMonitorConfig);
    collectMetrics(team: Team): Promise<DeploymentMetrics>;
    evaluateStatus(metrics: DeploymentMetrics): CriteriaStatus;
    calculateScore(status: CriteriaStatus, metrics: DeploymentMetrics): number;
    getEndpointUrl(team: Team): Promise<string | null>;
    private testEndpoint;
    private checkDnsResolution;
}
//# sourceMappingURL=deployment-monitor.d.ts.map