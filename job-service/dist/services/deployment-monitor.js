"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
            const urlObject = new URL(endpointUrl);
            const baseUrl = `${urlObject.hostname}${urlObject.port ? ':' + urlObject.port : ''}${urlObject.pathname}`;
            const httpEndpoint = `http://${baseUrl}/api/events?page=1&pageSize=20`.replace(/\/+/g, '/').replace(':/', '://');
            const httpsEndpoint = `https://${baseUrl}/api/events?page=1&pageSize=20`.replace(/\/+/g, '/').replace(':/', '://');
            this.log('debug', `Testing both HTTP and HTTPS for team ${team.nickname}`);
            this.log('debug', `HTTP endpoint: ${httpEndpoint}`);
            this.log('debug', `HTTPS endpoint: ${httpsEndpoint}`);
            const dnsResolution = await this.checkDnsResolution(endpointUrl);
            if (!dnsResolution.resolved) {
                this.log('warn', `DNS resolution failed for team ${team.nickname} at ${endpointUrl}: ${dnsResolution.error}`);
                return {
                    isDeployed: true,
                    endpointUrl: httpEndpoint,
                    responseTime: 0,
                    statusCode: 0,
                    lastChecked: new Date().toISOString(),
                    isAccessible: false,
                    error: dnsResolution.error,
                    isDnsResolved: false,
                    confirmationUrl: httpEndpoint,
                    confirmationTitle: 'API Endpoints',
                    confirmationDescription: 'DNS не найден (домен не разрешается)'
                };
            }
            const httpResult = await this.testEndpoint(httpEndpoint, team.nickname, false);
            const httpsResult = await this.testEndpoint(httpsEndpoint, team.nickname, true);
            let finalResult;
            let protocolStatus = '';
            if (httpResult.isAccessible && httpsResult.isAccessible) {
                finalResult = httpsResult;
                protocolStatus = 'Оба HTTP и HTTPS работают (предпочтение HTTPS)';
            }
            else if (httpResult.isAccessible && !httpsResult.isAccessible) {
                finalResult = httpResult;
                protocolStatus = 'Только HTTP работает (нет HTTPS)';
                const extendedMetrics = finalResult;
                extendedMetrics['httpsAvailable'] = false;
                extendedMetrics['httpsError'] = httpsResult.error || 'HTTPS недоступен';
                extendedMetrics['httpsStatusCode'] = httpsResult.statusCode;
            }
            else if (!httpResult.isAccessible && httpsResult.isAccessible) {
                finalResult = httpsResult;
                protocolStatus = 'Только HTTPS работает';
            }
            else {
                finalResult = (httpResult.statusCode || 0) > 0 ? httpResult : httpsResult;
                protocolStatus = 'Ни HTTP, ни HTTPS не работают';
                const extendedMetrics = finalResult;
                extendedMetrics['httpStatusCode'] = httpResult.statusCode;
                extendedMetrics['httpsStatusCode'] = httpsResult.statusCode;
                extendedMetrics['httpError'] = httpResult.error;
                extendedMetrics['httpsError'] = httpsResult.error;
            }
            finalResult.confirmationDescription = finalResult.isAccessible
                ? `API работает: ${protocolStatus}`
                : `API не работает: ${protocolStatus}`;
            this.log('info', `Deployment check for team ${team.nickname} completed:`, {
                httpAccessible: httpResult.isAccessible,
                httpsAccessible: httpsResult.isAccessible,
                finalStatus: protocolStatus,
                selectedProtocol: finalResult.endpointUrl?.startsWith('https') ? 'HTTPS' : 'HTTP'
            });
            return finalResult;
        }
        catch (error) {
            this.log('error', `Failed to collect deployment metrics for team ${team.nickname}:`, error);
            return {
                isDeployed: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                confirmationTitle: 'API Endpoints',
                confirmationDescription: 'API недоступен (ошибка при проверке)'
            };
        }
    }
    evaluateStatus(metrics) {
        if (!metrics.isDeployed) {
            return criteria_1.CriteriaStatus.NO_DATA;
        }
        const metricsWithDns = metrics;
        if (metricsWithDns['isDnsResolved'] === false) {
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
            const extendedMetrics = metrics;
            const isHttps = metrics.endpointUrl?.startsWith('https://') || false;
            const httpsAvailable = extendedMetrics['httpsAvailable'] !== false;
            if (isHttps && httpsAvailable) {
                score += 10;
            }
            else if (!isHttps && httpsAvailable !== false) {
                score = 100;
            }
            else if (!isHttps && extendedMetrics['httpsAvailable'] === false) {
                score = 90;
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
    async testEndpoint(endpoint, teamNickname, isHttps) {
        const startTime = Date.now();
        const protocol = isHttps ? 'HTTPS' : 'HTTP';
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.config.httpTimeout);
            this.log('debug', `Testing ${protocol} endpoint for team ${teamNickname}: ${endpoint}`);
            const response = await fetch(endpoint, {
                method: 'GET',
                headers: {
                    'User-Agent': this.config.userAgent,
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache'
                },
                signal: controller.signal,
                redirect: 'manual'
            });
            clearTimeout(timeoutId);
            const responseTime = Date.now() - startTime;
            const isAccessible = response.status === 200;
            const metrics = {
                isDeployed: true,
                endpointUrl: endpoint,
                responseTime,
                statusCode: response.status,
                lastChecked: new Date().toISOString(),
                isAccessible,
                isDnsResolved: true,
                confirmationUrl: endpoint,
                confirmationTitle: 'API Endpoints',
                confirmationDescription: isAccessible
                    ? `${protocol} API работает и отвечает на запросы`
                    : `${protocol} API не отвечает со статусом 200 (статус: ${response.status})`
            };
            const extendedMetrics = metrics;
            extendedMetrics['statusText'] = response.statusText;
            extendedMetrics['isHttps'] = isHttps;
            extendedMetrics['protocol'] = protocol;
            if (isAccessible) {
                try {
                    const contentType = response.headers.get('content-type');
                    extendedMetrics['contentType'] = contentType;
                    if (contentType?.includes('application/json')) {
                        const responseText = await response.text();
                        extendedMetrics['contentLength'] = responseText.length;
                        try {
                            const jsonData = JSON.parse(responseText);
                            extendedMetrics['hasValidJson'] = true;
                            extendedMetrics['responseStructure'] = typeof jsonData === 'object' ? Object.keys(jsonData) : 'primitive';
                        }
                        catch (jsonError) {
                            extendedMetrics['hasValidJson'] = false;
                            extendedMetrics['jsonError'] = 'Invalid JSON response';
                        }
                    }
                    else {
                        extendedMetrics['hasValidJson'] = false;
                        extendedMetrics['unexpectedContentType'] = true;
                    }
                }
                catch (contentError) {
                    this.log('debug', `Could not read ${protocol} response content for team ${teamNickname}:`, contentError);
                }
            }
            this.log('debug', `${protocol} endpoint check for team ${teamNickname} completed:`, {
                statusCode: response.status,
                responseTime,
                isAccessible,
                endpoint
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
                else if (error.message.includes('ECONNREFUSED')) {
                    errorMessage = 'Connection refused';
                }
                else if (error.message.includes('ENOTFOUND')) {
                    errorMessage = 'Host not found';
                }
                else if (isHttps && (error.message.includes('certificate') || error.message.includes('SSL') || error.message.includes('TLS'))) {
                    errorMessage = 'SSL/TLS certificate error';
                }
            }
            this.log('debug', `${protocol} endpoint check failed for team ${teamNickname} at ${endpoint}: ${errorMessage}`);
            return {
                isDeployed: true,
                endpointUrl: endpoint,
                responseTime,
                statusCode,
                lastChecked: new Date().toISOString(),
                isAccessible: false,
                isDnsResolved: true,
                error: errorMessage,
                confirmationUrl: endpoint,
                confirmationTitle: 'API Endpoints',
                confirmationDescription: `${protocol} API недоступен: ${errorMessage}`
            };
        }
    }
    async checkDnsResolution(url) {
        try {
            const hostname = new URL(url).hostname;
            const dns = await Promise.resolve().then(() => __importStar(require('dns')));
            const { promisify } = await Promise.resolve().then(() => __importStar(require('util')));
            const lookup = promisify(dns.lookup);
            try {
                await lookup(hostname);
                return { resolved: true };
            }
            catch (dnsError) {
                const errorMessage = dnsError instanceof Error ? dnsError.message : 'DNS resolution failed';
                if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('NXDOMAIN')) {
                    return { resolved: false, error: 'DNS_PROBE_FINISHED_NXDOMAIN' };
                }
                else if (errorMessage.includes('ECONNREFUSED')) {
                    return { resolved: true };
                }
                else if (errorMessage.includes('ETIMEDOUT')) {
                    return { resolved: false, error: 'DNS_TIMEOUT' };
                }
                return { resolved: false, error: errorMessage };
            }
        }
        catch (error) {
            this.log('warn', `DNS resolution check failed: ${error}`);
            return { resolved: false, error: 'DNS_CHECK_ERROR' };
        }
    }
}
exports.DeploymentMonitorService = DeploymentMonitorService;
//# sourceMappingURL=deployment-monitor.js.map