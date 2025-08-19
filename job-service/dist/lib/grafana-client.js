"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GrafanaClient = void 0;
const logger_1 = require("./logger");
const config_1 = require("../config");
class GrafanaClient {
    dashboardBaseUrl;
    logger;
    constructor() {
        const config = (0, config_1.loadConfig)();
        this.logger = (0, logger_1.createLogger)(config.logLevel, 'GrafanaClient');
        this.dashboardBaseUrl = config.k6Services.dashboardBaseUrl;
        this.logger.debug('GrafanaClient initialized', {
            dashboardBaseUrl: this.dashboardBaseUrl
        });
    }
    isConfigured() {
        return !!this.dashboardBaseUrl;
    }
    generateGrafanaDashboardUrl(testId) {
        const dashboardId = 'a3b2aaa8-bb66-4008-a1d8-16c49afedbf0';
        const now = Date.now();
        const hackathonStart = new Date('2025-08-15T00:00:00Z').getTime();
        return `${this.dashboardBaseUrl}/d/${dashboardId}/k6-prometheus-native-histograms?` +
            `orgId=1&` +
            `var-DS_PROMETHEUS=Prometheus&` +
            `var-testid=${encodeURIComponent(testId)}&` +
            `var-quantile=0.99&` +
            `from=${hackathonStart}&` +
            `to=${now}`;
    }
}
exports.GrafanaClient = GrafanaClient;
//# sourceMappingURL=grafana-client.js.map