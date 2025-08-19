"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GrafanaClient = void 0;
const logger_1 = require("./logger");
const config_1 = require("../config");
class GrafanaClient {
    dashboardBaseUrl;
    prometheusUrl;
    logger;
    timeout;
    constructor() {
        const config = (0, config_1.loadConfig)();
        this.logger = (0, logger_1.createLogger)(config.logLevel, 'GrafanaClient');
        this.dashboardBaseUrl = config.k6Services.dashboardBaseUrl;
        this.prometheusUrl = config.k6Services.dashboardBaseUrl.replace('/grafana', '/prometheus');
        this.timeout = config.api.timeout;
        this.logger.debug('GrafanaClient initialized', {
            dashboardBaseUrl: this.dashboardBaseUrl,
            prometheusUrl: this.prometheusUrl
        });
    }
    isConfigured() {
        return !!this.dashboardBaseUrl;
    }
    async prometheusRangeQuery(query) {
        if (!this.prometheusUrl) {
            throw new Error('Prometheus URL not configured');
        }
        const url = new URL(`${this.prometheusUrl}/api/v1/query_range`);
        url.searchParams.set('query', query);
        const now = Math.floor(Date.now() / 1000);
        const sevenDaysAgo = now - (7 * 24 * 60 * 60);
        url.searchParams.set('start', sevenDaysAgo.toString());
        url.searchParams.set('end', now.toString());
        url.searchParams.set('step', '60');
        this.logger.info(`Prometheus Query URL: ${url.toString()}`);
        this.logger.debug(`Executing Prometheus range query: ${query} from ${sevenDaysAgo} to ${now}`);
        try {
            const response = await this.makeRequest(url.toString());
            const data = await response.json();
            this.logger.info('Prometheus response:', {
                status: data.status,
                resultType: data.data?.resultType,
                resultCount: data.data?.result?.length || 0
            });
            if (data.status === 'error') {
                this.logger.error('Prometheus query error:', data.error, data.errorType);
                throw new Error(`Prometheus range query error: ${data.error}`);
            }
            return data;
        }
        catch (error) {
            this.logger.error('Prometheus range query failed:', error);
            throw error;
        }
    }
    async prometheusQuery(query, time) {
        if (!this.prometheusUrl) {
            throw new Error('Prometheus URL not configured');
        }
        const url = new URL(`${this.prometheusUrl}/api/v1/query`);
        url.searchParams.set('query', query);
        if (time) {
            url.searchParams.set('time', (time.getTime() / 1000).toString());
        }
        this.logger.debug(`Executing Prometheus instant query: ${query}`);
        try {
            const response = await this.makeRequest(url.toString());
            const data = await response.json();
            if (data.status === 'error') {
                throw new Error(`Prometheus query error: ${data.error}`);
            }
            return data;
        }
        catch (error) {
            this.logger.error('Prometheus query failed:', error);
            throw error;
        }
    }
    generateGrafanaDashboardUrl(testId) {
        const dashboardId = 'a3b2aaa8-bb66-4008-a1d8-16c49afedbf0';
        const now = Date.now();
        const weekAgo = now - (7 * 24 * 60 * 60 * 1000);
        return `${this.dashboardBaseUrl}/d/${dashboardId}/k6-prometheus-native-histograms?` +
            `orgId=1&` +
            `var-DS_PROMETHEUS=Prometheus&` +
            `var-testid=${encodeURIComponent(testId)}&` +
            `var-quantile=0.99&` +
            `from=${weekAgo}&` +
            `to=${now}`;
    }
    async evaluateGetEventsTask(teamSlug, teamId) {
        return this.evaluateLoadTestingTask(teamSlug, teamId, 'events');
    }
    async evaluateArchiveTask(teamSlug, teamId) {
        return this.evaluateLoadTestingTask(teamSlug, teamId, 'archive');
    }
    async evaluateLoadTestingTask(teamSlug, teamId, taskType) {
        const userSizes = [1000, 5000, 25000, 50000, 100000];
        const results = [];
        this.logger.info(`Evaluating ${taskType} load testing task for team: ${teamSlug}`);
        for (const userSize of userSizes) {
            try {
                const testIdPattern = taskType === 'events'
                    ? `${teamSlug}-events-${userSize}-events-.*`
                    : `${teamSlug}-archive-${userSize}-.*`;
                const testResult = await this.getLatestTestResult(testIdPattern, teamId, taskType, userSize);
                if (testResult) {
                    results.push(testResult);
                }
            }
            catch (error) {
                this.logger.error(`Failed to evaluate ${userSize} user ${taskType} test for team ${teamSlug}:`, error);
            }
        }
        return results;
    }
    async getLatestTestResult(testIdPattern, _teamId, _taskType = 'events', userSize) {
        this.logger.info(`Getting test result for pattern: ${testIdPattern}, userSize: ${userSize}`);
        try {
            const match = testIdPattern.match(/(\w+)-(events)-(\d+)-events-.*/) ||
                testIdPattern.match(/(\w+)-(archive)-(\d+)-.*/);
            if (!match) {
                throw new Error(`Invalid test ID pattern: ${testIdPattern}`);
            }
            const [, teamSlug] = match;
            const totalRequestsQuery = `sum(k6_http_reqs_total{testid=~"${testIdPattern}"})`;
            const totalResponse = await this.prometheusRangeQuery(totalRequestsQuery);
            if (!totalResponse || totalResponse.status !== 'success') {
                this.logger.debug(`Failed to get total requests for pattern: ${testIdPattern}`);
                return null;
            }
            const totalRequests = this.extractMaxValue(totalResponse) || 0;
            if (totalRequests === 0) {
                this.logger.debug(`No test data found for pattern: ${testIdPattern}`);
                return null;
            }
            const failedRequestsQuery = `sum(k6_http_reqs_total{testid=~"${testIdPattern}", expected_response="false"})`;
            const failedResponse = await this.prometheusRangeQuery(failedRequestsQuery);
            const failedRequests = this.extractMaxValue(failedResponse) || 0;
            const peakRpsQuery = `max(sum(irate(k6_http_reqs_total{testid=~"${testIdPattern}"}[1m])))`;
            const peakRpsResponse = await this.prometheusRangeQuery(peakRpsQuery);
            const peakRps = this.extractMaxValue(peakRpsResponse) || 0;
            const successfulRequests = totalRequests - failedRequests;
            const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;
            const errorCount = failedRequests;
            const testPassed = successRate >= 95;
            let score = 0;
            if (testPassed) {
                const baseScores = {
                    1000: 10,
                    5000: 20,
                    25000: 30,
                    50000: 40,
                    100000: 50
                };
                score = baseScores[userSize] || 0;
            }
            const testIdFromMetrics = await this.extractTestIdFromRange(testIdPattern);
            if (!testIdFromMetrics) {
                throw new Error(`Could not extract test ID from pattern: ${testIdPattern}`);
            }
            const result = {
                teamSlug: teamSlug || 'unknown',
                userSize,
                testNumber: this.extractTestNumber(testIdFromMetrics),
                totalRequests,
                successRate,
                errorCount,
                peakRps: Math.round(peakRps * 100) / 100,
                testPassed,
                score,
                grafanaDashboardUrl: this.generateGrafanaDashboardUrl(testIdFromMetrics),
                testId: testIdFromMetrics,
                timestamp: new Date()
            };
            this.logger.info(`Test result for ${testIdPattern}:`, {
                totalRequests,
                successRate: successRate.toFixed(2),
                peakRps: peakRps.toFixed(2),
                testPassed,
                score
            });
            return result;
        }
        catch (error) {
            this.logger.error(`Failed to get test result for pattern ${testIdPattern}:`, error);
            return null;
        }
    }
    async generateTeamSummary(teamId, teamSlug, teamName) {
        this.logger.info(`Starting team summary generation for: ${teamName} (${teamSlug})`);
        const testResults = await this.evaluateGetEventsTask(teamSlug, teamId);
        const totalScore = testResults.reduce((sum, result) => sum + result.score, 0);
        const passedTests = testResults.filter(result => result.testPassed).length;
        const lastTestTime = testResults.length > 0
            ? new Date(Math.max(...testResults.map(r => r.timestamp.getTime())))
            : undefined;
        return {
            teamId,
            teamSlug,
            teamName,
            totalScore,
            testResults,
            passedTests,
            totalTests: testResults.length,
            lastTestTime
        };
    }
    async generateArchiveTeamSummary(teamId, teamSlug, teamName) {
        const testResults = await this.evaluateArchiveTask(teamSlug, teamId);
        const totalScore = testResults.reduce((sum, result) => sum + result.score, 0);
        const passedTests = testResults.filter(result => result.testPassed).length;
        const lastTestTime = testResults.length > 0
            ? new Date(Math.max(...testResults.map(r => r.timestamp.getTime())))
            : undefined;
        return {
            teamId,
            teamSlug,
            teamName,
            totalScore,
            testResults,
            passedTests,
            totalTests: testResults.length,
            lastTestTime
        };
    }
    async extractTestIdFromRange(pattern) {
        try {
            const query = `k6_http_reqs_total{testid=~"${pattern}"}`;
            const response = await this.prometheusRangeQuery(query);
            if (response.data.result.length > 0) {
                const firstResult = response.data.result[0];
                if (firstResult?.metric && 'testid' in firstResult.metric) {
                    const testid = firstResult.metric['testid'];
                    if (testid) {
                        return testid;
                    }
                }
            }
            return pattern.replace('.*', '1');
        }
        catch (error) {
            this.logger.error('Failed to extract test ID from range:', error);
            return pattern.replace('.*', '1');
        }
    }
    extractTestNumber(testId) {
        if (!testId)
            return 1;
        const match = testId.match(/-(\\d+)(?:-\\d+)?$/);
        return match ? parseInt(match[1] || '1', 10) : 1;
    }
    extractMaxValue(response) {
        if (!response || response.data.result.length === 0) {
            return null;
        }
        const firstSeries = response.data.result[0];
        if (!firstSeries?.values || firstSeries.values.length === 0) {
            return null;
        }
        let maxValue = 0;
        for (const [, valueStr] of firstSeries.values) {
            const value = parseFloat(valueStr || '0');
            if (!isNaN(value) && value > maxValue) {
                maxValue = value;
            }
        }
        return maxValue;
    }
    async makeRequest(url) {
        const headers = {
            'Content-Type': 'application/json',
            'User-Agent': 'HackLoad-Job-Service/1.0'
        };
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers,
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response;
        }
        catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }
}
exports.GrafanaClient = GrafanaClient;
//# sourceMappingURL=grafana-client.js.map