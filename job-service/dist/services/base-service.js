"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseJobService = void 0;
const criteria_1 = require("../types/criteria");
class BaseJobService {
    lastRunTime;
    lastSuccessTime;
    errorCount = 0;
    consecutiveFailures = 0;
    totalRuns = 0;
    apiClient;
    evaluateStatus(_metrics) {
        return criteria_1.CriteriaStatus.NO_DATA;
    }
    calculateScore(status, _metrics) {
        switch (status) {
            case criteria_1.CriteriaStatus.PASSED:
                return 100;
            case criteria_1.CriteriaStatus.FAILED:
                return 0;
            case criteria_1.CriteriaStatus.NO_DATA:
                return 0;
            default:
                return 0;
        }
    }
    async run() {
        this.lastRunTime = new Date();
        this.totalRuns++;
        try {
            const teams = await this.getTeams();
            const updates = [];
            for (const team of teams) {
                try {
                    const metrics = await this.collectMetrics(team);
                    const status = this.evaluateStatus(metrics);
                    const score = this.calculateScore(status, metrics);
                    updates.push({
                        teamSlug: team.nickname,
                        hackathonId: team.hackathonId,
                        criteriaType: this.criteriaType,
                        status,
                        score,
                        metrics,
                        updatedBy: this.serviceName
                    });
                    this.log('info', `Processed team ${team.nickname}: ${status} (score: ${score})`);
                }
                catch (error) {
                    this.log('error', `Failed to process team ${team.nickname}:`, error);
                }
            }
            if (updates.length > 0) {
                await this.bulkUpdateCriteria(updates);
                this.log('info', `Successfully updated ${updates.length} team criteria`);
            }
            this.lastSuccessTime = new Date();
            this.consecutiveFailures = 0;
        }
        catch (error) {
            this.errorCount++;
            this.consecutiveFailures++;
            await this.handleError(error);
            throw error;
        }
    }
    getHealth() {
        const errorRate = this.totalRuns > 0 ? (this.errorCount / this.totalRuns) * 100 : 0;
        let status = 'healthy';
        if (this.consecutiveFailures >= 3) {
            status = 'unhealthy';
        }
        else if (this.consecutiveFailures > 0 || errorRate > 10) {
            status = 'degraded';
        }
        return {
            serviceName: this.serviceName,
            status,
            lastRunTime: this.lastRunTime,
            lastSuccessTime: this.lastSuccessTime,
            errorRate,
            consecutiveFailures: this.consecutiveFailures
        };
    }
    setApiClient(apiClient) {
        this.apiClient = apiClient;
    }
    async getTeams() {
        if (!this.apiClient) {
            throw new Error('API client not configured');
        }
        try {
            return await this.apiClient.getTeams();
        }
        catch (error) {
            this.log('error', 'Failed to fetch teams from Hub API:', error);
            throw error;
        }
    }
    async getTeamEnvironmentData(team) {
        if (!this.apiClient) {
            throw new Error('API client not configured');
        }
        try {
            return await this.apiClient.getTeamEnvironmentDataByNickname(team.nickname);
        }
        catch (error) {
            this.log('error', `Failed to fetch environment data for team ${team.nickname}:`, error);
            throw error;
        }
    }
    async bulkUpdateCriteria(updates) {
        if (!this.apiClient) {
            throw new Error('API client not configured');
        }
        if (updates.length === 0) {
            this.log('debug', 'No updates to send');
            return;
        }
        try {
            const response = await this.apiClient.bulkUpdateCriteria(updates);
            if (!response.success) {
                throw new Error(`Bulk update failed: ${response.error || response.message}`);
            }
            this.log('info', `Successfully updated ${response.data?.processed || updates.length} criteria`);
            if (response.data?.failed && response.data.failed > 0) {
                this.log('warn', `${response.data.failed} updates failed:`, response.data.errors);
            }
        }
        catch (error) {
            this.log('error', 'Failed to send criteria updates to Hub API:', error);
            throw error;
        }
    }
    async handleError(error) {
        this.log('error', `Service ${this.serviceName} encountered an error:`, error);
    }
    log(level, message, ...args) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [${level.toUpperCase()}] [${this.serviceName}] ${message}`;
        switch (level) {
            case 'debug':
                console.debug(logMessage, ...args);
                break;
            case 'info':
                console.info(logMessage, ...args);
                break;
            case 'warn':
                console.warn(logMessage, ...args);
                break;
            case 'error':
                console.error(logMessage, ...args);
                break;
        }
    }
}
exports.BaseJobService = BaseJobService;
//# sourceMappingURL=base-service.js.map