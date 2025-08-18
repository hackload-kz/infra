"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metricsCollector = exports.MetricsCollector = void 0;
class MetricsCollector {
    metrics;
    startTime;
    constructor() {
        this.startTime = new Date();
        this.metrics = this.initializeMetrics();
    }
    initializeMetrics() {
        return {
            jobExecutions: {
                total: 0,
                successful: 0,
                failed: 0,
                byService: {}
            },
            jobDurations: {
                byService: {}
            },
            teamsProcessed: {
                total: 0,
                byService: {}
            },
            serviceHealth: {},
            systemMetrics: {
                uptime: 0,
                startTime: this.startTime.toISOString(),
                lastMetricsReset: this.startTime.toISOString(),
                activeServices: 0
            }
        };
    }
    recordJobExecution(serviceName, success, duration, teamsProcessed = 0) {
        this.metrics.jobExecutions.total++;
        if (success) {
            this.metrics.jobExecutions.successful++;
        }
        else {
            this.metrics.jobExecutions.failed++;
        }
        if (!this.metrics.jobExecutions.byService[serviceName]) {
            this.metrics.jobExecutions.byService[serviceName] = { total: 0, successful: 0, failed: 0 };
        }
        this.metrics.jobExecutions.byService[serviceName].total++;
        if (success) {
            this.metrics.jobExecutions.byService[serviceName].successful++;
        }
        else {
            this.metrics.jobExecutions.byService[serviceName].failed++;
        }
        if (!this.metrics.jobDurations.byService[serviceName]) {
            this.metrics.jobDurations.byService[serviceName] = {
                min: duration,
                max: duration,
                avg: duration,
                last: duration,
                count: 0
            };
        }
        const serviceDurations = this.metrics.jobDurations.byService[serviceName];
        serviceDurations.min = Math.min(serviceDurations.min, duration);
        serviceDurations.max = Math.max(serviceDurations.max, duration);
        serviceDurations.count++;
        serviceDurations.avg = ((serviceDurations.avg * (serviceDurations.count - 1)) + duration) / serviceDurations.count;
        serviceDurations.last = duration;
        this.metrics.teamsProcessed.total += teamsProcessed;
        if (!this.metrics.teamsProcessed.byService[serviceName]) {
            this.metrics.teamsProcessed.byService[serviceName] = 0;
        }
        this.metrics.teamsProcessed.byService[serviceName] += teamsProcessed;
    }
    updateServiceHealth(serviceName, health) {
        this.metrics.serviceHealth[serviceName] = {
            status: health.status,
            lastRunTime: health.lastRunTime?.toISOString(),
            lastSuccessTime: health.lastSuccessTime?.toISOString(),
            errorRate: health.errorRate,
            consecutiveFailures: health.consecutiveFailures
        };
    }
    updateSystemMetrics(activeServices) {
        this.metrics.systemMetrics.uptime = Date.now() - this.startTime.getTime();
        this.metrics.systemMetrics.activeServices = activeServices;
    }
    getMetrics() {
        this.metrics.systemMetrics.uptime = Date.now() - this.startTime.getTime();
        return JSON.parse(JSON.stringify(this.metrics));
    }
    getPrometheusMetrics() {
        const metrics = this.getMetrics();
        const lines = [];
        lines.push('# HELP job_executions_total Total number of job executions');
        lines.push('# TYPE job_executions_total counter');
        for (const [service, data] of Object.entries(metrics.jobExecutions.byService)) {
            lines.push(`job_executions_total{service="${service}",status="success"} ${data.successful}`);
            lines.push(`job_executions_total{service="${service}",status="failure"} ${data.failed}`);
        }
        lines.push('# HELP job_duration_seconds Job execution duration in seconds');
        lines.push('# TYPE job_duration_seconds histogram');
        for (const [service, data] of Object.entries(metrics.jobDurations.byService)) {
            lines.push(`job_duration_seconds_min{service="${service}"} ${data.min / 1000}`);
            lines.push(`job_duration_seconds_max{service="${service}"} ${data.max / 1000}`);
            lines.push(`job_duration_seconds_avg{service="${service}"} ${data.avg / 1000}`);
            lines.push(`job_duration_seconds_last{service="${service}"} ${data.last / 1000}`);
        }
        lines.push('# HELP teams_processed_total Total teams processed');
        lines.push('# TYPE teams_processed_total counter');
        for (const [service, count] of Object.entries(metrics.teamsProcessed.byService)) {
            lines.push(`teams_processed_total{service="${service}"} ${count}`);
        }
        lines.push('# HELP service_health Service health status (1=healthy, 0.5=degraded, 0=unhealthy)');
        lines.push('# TYPE service_health gauge');
        for (const [service, health] of Object.entries(metrics.serviceHealth)) {
            const healthValue = health.status === 'healthy' ? 1 : health.status === 'degraded' ? 0.5 : 0;
            lines.push(`service_health{service="${service}"} ${healthValue}`);
            lines.push(`service_error_rate{service="${service}"} ${health.errorRate}`);
            lines.push(`service_consecutive_failures{service="${service}"} ${health.consecutiveFailures}`);
        }
        lines.push('# HELP system_uptime_seconds System uptime in seconds');
        lines.push('# TYPE system_uptime_seconds counter');
        lines.push(`system_uptime_seconds ${metrics.systemMetrics.uptime / 1000}`);
        lines.push('# HELP active_services_total Number of active services');
        lines.push('# TYPE active_services_total gauge');
        lines.push(`active_services_total ${metrics.systemMetrics.activeServices}`);
        return lines.join('\n') + '\n';
    }
    reset() {
        this.metrics = this.initializeMetrics();
    }
}
exports.MetricsCollector = MetricsCollector;
exports.metricsCollector = new MetricsCollector();
//# sourceMappingURL=metrics.js.map