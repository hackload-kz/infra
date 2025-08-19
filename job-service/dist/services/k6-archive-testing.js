"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.K6ArchiveTestingService = void 0;
const base_service_1 = require("./base-service");
const grafana_client_1 = require("../lib/grafana-client");
const criteria_1 = require("../types/criteria");
class K6ArchiveTestingService extends base_service_1.BaseJobService {
    criteriaType = criteria_1.CriteriaType.ARCHIVE_SEARCH;
    serviceName = 'K6ArchiveTestingService';
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
        this.log('info', 'K6 Archive Testing Service initialized', {
            taskConfig: this.taskConfig
        });
    }
    async collectMetrics(team) {
        this.log('info', `Generating K6 archive testing dashboard links for team ${team.nickname}`);
        try {
            const teamSlug = this.generateTeamSlug(team.name, parseInt(team.id));
            const dashboardLinks = this.taskConfig.userSizes.map(userSize => {
                const testIdPattern = `${teamSlug}-archive-${userSize}`;
                return {
                    userSize,
                    testPattern: testIdPattern,
                    dashboardUrl: this.grafana.generateGrafanaDashboardUrl(testIdPattern),
                    maxScore: this.taskConfig.scoreWeights[userSize] || 0
                };
            });
            this.log('info', `Generated ${dashboardLinks.length} archive dashboard links for team ${team.name} (${teamSlug})`);
            return {
                teamSlug,
                dashboardLinks,
                maxPossibleScore: Object.values(this.taskConfig.scoreWeights).reduce((sum, score) => sum + score, 0),
                successRateThreshold: this.taskConfig.successRateThreshold,
                testDescription: 'K6 Load Testing - Archive Search API',
                taskType: 'archive',
                instructions: 'Teams can view their archive test results using the provided Grafana dashboard links. Tests must achieve ≥95% success rate to earn points.'
            };
        }
        catch (error) {
            this.log('error', `Failed to generate K6 archive dashboard links for team ${team.id}:`, error);
            throw error;
        }
    }
    evaluateStatus(metrics) {
        const dashboardLinks = metrics['dashboardLinks'];
        if (dashboardLinks && dashboardLinks.length > 0) {
            return criteria_1.CriteriaStatus.NO_DATA;
        }
        return criteria_1.CriteriaStatus.NO_DATA;
    }
    calculateScore(_status, _metrics) {
        return 0;
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
exports.K6ArchiveTestingService = K6ArchiveTestingService;
//# sourceMappingURL=k6-archive-testing.js.map