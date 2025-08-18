export interface Metrics {
    jobExecutions: {
        total: number;
        successful: number;
        failed: number;
        byService: Record<string, {
            total: number;
            successful: number;
            failed: number;
        }>;
    };
    jobDurations: {
        byService: Record<string, {
            min: number;
            max: number;
            avg: number;
            last: number;
            count: number;
        }>;
    };
    teamsProcessed: {
        total: number;
        byService: Record<string, number>;
    };
    serviceHealth: Record<string, {
        status: 'healthy' | 'degraded' | 'unhealthy';
        lastRunTime?: string;
        lastSuccessTime?: string;
        errorRate: number;
        consecutiveFailures: number;
    }>;
    systemMetrics: {
        uptime: number;
        startTime: string;
        lastMetricsReset: string;
        activeServices: number;
    };
}
export declare class MetricsCollector {
    private metrics;
    private startTime;
    constructor();
    private initializeMetrics;
    recordJobExecution(serviceName: string, success: boolean, duration: number, teamsProcessed?: number): void;
    updateServiceHealth(serviceName: string, health: {
        status: 'healthy' | 'degraded' | 'unhealthy';
        lastRunTime?: Date;
        lastSuccessTime?: Date;
        errorRate: number;
        consecutiveFailures: number;
    }): void;
    updateSystemMetrics(activeServices: number): void;
    getMetrics(): Metrics;
    getPrometheusMetrics(): string;
    reset(): void;
}
export declare const metricsCollector: MetricsCollector;
//# sourceMappingURL=metrics.d.ts.map