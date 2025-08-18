import { JobScheduler } from '../scheduler';
export interface HealthServerConfig {
    healthPort: number;
    metricsPort: number;
}
export interface HealthResponse {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    uptime: number;
    services: Array<{
        name: string;
        status: 'healthy' | 'degraded' | 'unhealthy';
        lastRunTime?: string;
        lastSuccessTime?: string;
        errorRate: number;
        consecutiveFailures: number;
    }>;
    summary: {
        totalServices: number;
        healthyServices: number;
        degradedServices: number;
        unhealthyServices: number;
    };
}
export declare class HealthServer {
    private healthServer?;
    private metricsServer?;
    private scheduler?;
    private config;
    constructor(config: HealthServerConfig);
    setScheduler(scheduler: JobScheduler): void;
    start(): Promise<void>;
    stop(): Promise<void>;
    private startHealthServer;
    private startMetricsServer;
    private handleHealthRequest;
    private handleMetricsRequest;
    private getHealthStatus;
}
//# sourceMappingURL=server.d.ts.map