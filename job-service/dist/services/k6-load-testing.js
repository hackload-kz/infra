"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.K6LoadTestingService = void 0;
const base_service_1 = require("./base-service");
const grafana_client_1 = require("../lib/grafana-client");
const criteria_1 = require("../types/criteria");
class K6LoadTestingService extends base_service_1.BaseJobService {
    criteriaType = criteria_1.CriteriaType.EVENT_SEARCH;
    serviceName = 'K6LoadTestingService';
    grafana;
    metrics;
    taskConfig;
    constructor() {
        super();
        this.grafana = new grafana_client_1.GrafanaClient();
        this.metrics = {
            teamsEvaluated: 0,
            totalTestsFound: 0,
            testsPassedOverall: 0,
            averageScore: 0,
            lastEvaluationDuration: 0,
            topPerformers: []
        };
        this.taskConfig = {
            userSizes: [1000, 5000, 25000, 50000, 100000],
            successRateThreshold: 95.0,
            scoreWeights: {
                1000: 10,
                5000: 20,
                25000: 30,
                50000: 40,
                100000: 50
            }
        };
        this.log('info', 'K6 Load Testing Service initialized', {
            taskConfig: this.taskConfig
        });
    }
    async collectMetrics(team) {
        this.log('info', `[K6LoadTestingService] Starting metrics collection for team: ${team.name} (${team.nickname})`);
        if (!this.grafana.isConfigured()) {
            this.log('error', 'Grafana not configured, skipping K6 load testing evaluation - check dashboardBaseUrl in config');
            return {};
        }
        try {
            const teamSlug = this.generateTeamSlug(team.name, parseInt(team.id));
            const summary = await this.grafana.generateTeamSummary(parseInt(team.id), teamSlug, team.name);
            this.log('info', `Team ${team.name} (${teamSlug}): ${summary.totalScore} points, ${summary.passedTests}/${summary.totalTests} tests passed`);
            return {
                totalScore: summary.totalScore,
                passedTests: summary.passedTests,
                totalTests: summary.totalTests,
                lastTestTime: summary.lastTestTime?.toISOString(),
                testResults: summary.testResults.map(result => ({
                    userSize: result.userSize,
                    testPassed: result.testPassed,
                    score: result.score,
                    successRate: result.successRate,
                    totalRequests: result.totalRequests,
                    errorCount: result.errorCount,
                    peakRps: result.peakRps,
                    grafanaDashboardUrl: result.grafanaDashboardUrl,
                    testId: result.testId
                })),
                maxPossibleScore: Object.values(this.taskConfig.scoreWeights).reduce((sum, score) => sum + score, 0),
                successRateThreshold: this.taskConfig.successRateThreshold,
                teamSlug
            };
        }
        catch (error) {
            this.log('error', `Failed to collect K6 load testing metrics for team ${team.id}:`, error);
            throw error;
        }
    }
    evaluateStatus(metrics) {
        const totalTests = metrics['totalTests'] || 0;
        const passedTests = metrics['passedTests'] || 0;
        const totalScore = metrics['totalScore'] || 0;
        if (totalTests === 0) {
            return criteria_1.CriteriaStatus.NO_DATA;
        }
        else if (passedTests > 0 && totalScore > 0) {
            return criteria_1.CriteriaStatus.PASSED;
        }
        else {
            return criteria_1.CriteriaStatus.FAILED;
        }
    }
    calculateScore(status, metrics) {
        const totalScore = metrics['totalScore'] || 0;
        if (totalScore > 0) {
            return totalScore;
        }
        return super.calculateScore(status, metrics);
    }
    generateTeamSlug(teamName, teamId) {
        const slug = teamName
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
        return slug || `team-${teamId}`;
    }
    generateDashboardUrl(testId) {
        return this.grafana.generateGrafanaDashboardUrl(testId);
    }
    getConfiguration() {
        return { ...this.taskConfig };
    }
    getCurrentMetrics() {
        return { ...this.metrics };
    }
}
exports.K6LoadTestingService = K6LoadTestingService;
//# sourceMappingURL=k6-load-testing.js.map