"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeploymentMonitorService = void 0;
const base_service_1 = require("./base-service");
const criteria_1 = require("../types/criteria");
class DeploymentMonitorService extends base_service_1.BaseJobService {
    criteriaType = criteria_1.CriteriaType.DEPLOYED_SOLUTION;
    serviceName = 'deployment-monitor-service';
    config;
    constructor(config) {
        super();
        this.config = config;
    }
    async collectMetrics(team) {
        try {
            const envData = await this.getTeamEnvironmentData(team);
            const endpointUrl = envData['ENDPOINT_URL'];
            if (!endpointUrl) {
                this.log('debug', `No application URL found for team ${team.nickname}`);
                return {
                    isDeployed: false,
                    confirmationTitle: 'Демо',
                    confirmationDescription: 'Развернутое решение команды'
                };
            }
            this.log('debug', `Checking deployment for team ${team.nickname} at ${endpointUrl}`);
            const startTime = Date.now();
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), this.config.httpTimeout);
                const response = await fetch(endpointUrl, {
                    method: 'GET',
                    headers: {
                        'User-Agent': this.config.userAgent,
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                        'Cache-Control': 'no-cache'
                    },
                    signal: controller.signal,
                    redirect: 'manual'
                });
                clearTimeout(timeoutId);
                const responseTime = Date.now() - startTime;
                let finalResponse = response;
                let redirectCount = 0;
                const maxRedirects = 5;
                while ((finalResponse.status === 301 || finalResponse.status === 302 || finalResponse.status === 307 || finalResponse.status === 308) && redirectCount < maxRedirects) {
                    const location = finalResponse.headers.get('location');
                    if (!location)
                        break;
                    redirectCount++;
                    this.log('debug', `Following redirect ${redirectCount} to: ${location}`);
                    const redirectController = new AbortController();
                    const redirectTimeoutId = setTimeout(() => redirectController.abort(), this.config.httpTimeout);
                    finalResponse = await fetch(location, {
                        method: 'GET',
                        headers: {
                            'User-Agent': this.config.userAgent,
                            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                            'Cache-Control': 'no-cache'
                        },
                        signal: redirectController.signal,
                        redirect: 'manual'
                    });
                    clearTimeout(redirectTimeoutId);
                }
                const isAccessible = finalResponse.ok || (finalResponse.status >= 200 && finalResponse.status < 400);
                const metrics = {
                    isDeployed: true,
                    endpointUrl,
                    responseTime,
                    statusCode: finalResponse.status,
                    lastChecked: new Date().toISOString(),
                    isAccessible,
                    confirmationUrl: endpointUrl,
                    confirmationTitle: 'Демо',
                    confirmationDescription: 'Развернутое решение команды'
                };
                const extendedMetrics = metrics;
                extendedMetrics['statusText'] = finalResponse.statusText;
                extendedMetrics['redirectCount'] = redirectCount;
                if (isAccessible) {
                    try {
                        const contentType = finalResponse.headers.get('content-type');
                        extendedMetrics['contentType'] = contentType;
                        if (contentType?.includes('text/html')) {
                            const text = await finalResponse.text();
                            extendedMetrics['hasTitle'] = text.includes('<title>');
                            extendedMetrics['contentLength'] = text.length;
                            extendedMetrics['hasBody'] = text.includes('<body>') || text.includes('<body ');
                        }
                    }
                    catch (contentError) {
                        this.log('debug', `Could not read response content for team ${team.nickname}:`, contentError);
                    }
                }
                this.log('debug', `Deployment check for team ${team.nickname} completed:`, {
                    statusCode: finalResponse.status,
                    responseTime,
                    isAccessible,
                    redirectCount
                });
                return metrics;
            }
            catch (error) {
                const responseTime = Date.now() - startTime;
                let errorMessage = 'Unknown error';
                let statusCode = 0;
                if (error instanceof Error) {
                    errorMessage = error.message;
                    if (error.name === 'AbortError') {
                        errorMessage = 'Request timeout';
                    }
                    else if (error.message.includes('network') || error.message.includes('fetch')) {
                        errorMessage = 'Network error';
                    }
                }
                this.log('warn', `Deployment check failed for team ${team.nickname} at ${endpointUrl}: ${errorMessage}`);
                return {
                    isDeployed: true,
                    endpointUrl,
                    responseTime,
                    statusCode,
                    lastChecked: new Date().toISOString(),
                    isAccessible: false,
                    error: errorMessage,
                    confirmationUrl: endpointUrl,
                    confirmationTitle: 'Демо',
                    confirmationDescription: 'Развернутое решение команды (недоступно)'
                };
            }
        }
        catch (error) {
            this.log('error', `Failed to collect deployment metrics for team ${team.nickname}:`, error);
            return {
                isDeployed: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                confirmationTitle: 'Демо',
                confirmationDescription: 'Развернутое решение команды (ошибка при проверке)'
            };
        }
    }
    evaluateStatus(metrics) {
        if (!metrics.isDeployed) {
            return criteria_1.CriteriaStatus.NO_DATA;
        }
        const metricsWithError = metrics;
        if (metricsWithError['error'] && !metrics.endpointUrl) {
            return criteria_1.CriteriaStatus.FAILED;
        }
        if (metrics.isAccessible) {
            return criteria_1.CriteriaStatus.PASSED;
        }
        if (metrics.endpointUrl) {
            return criteria_1.CriteriaStatus.FAILED;
        }
        return criteria_1.CriteriaStatus.NO_DATA;
    }
    calculateScore(status, metrics) {
        if (status === criteria_1.CriteriaStatus.NO_DATA) {
            return 0;
        }
        if (status === criteria_1.CriteriaStatus.PASSED) {
            let score = 100;
            if (metrics.responseTime && metrics.responseTime < 2000) {
                score = 100;
            }
            return score;
        }
        if (status === criteria_1.CriteriaStatus.FAILED) {
            let score = 0;
            if (metrics.endpointUrl) {
                score += 30;
            }
            if (metrics.statusCode && metrics.statusCode > 0) {
                score += 20;
            }
            if (metrics.responseTime && metrics.responseTime < 10000) {
                score += 10;
            }
            if (metrics.statusCode && metrics.statusCode >= 400 && metrics.statusCode < 600) {
                score += 20;
            }
            return Math.min(score, 80);
        }
        return 0;
    }
    async getEndpointUrl(team) {
        try {
            const envData = await this.getTeamEnvironmentData(team);
            return envData['ENDPOINT_URL'] || null;
        }
        catch (error) {
            this.log('error', `Failed to get endpoint URL for team ${team.nickname}:`, error);
            return null;
        }
    }
}
exports.DeploymentMonitorService = DeploymentMonitorService;
//# sourceMappingURL=deployment-monitor.js.map