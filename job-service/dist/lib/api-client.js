"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HubApiClient = void 0;
class HubApiClient {
    config;
    constructor(config) {
        this.config = config;
    }
    async getTeams() {
        try {
            let response;
            try {
                response = await this.request('/api/service/teams');
            }
            catch (serviceError) {
                this.log('warn', 'Service teams endpoint not found, falling back to regular teams endpoint');
                response = await this.request('/api/teams');
            }
            if (!response || !response.teams) {
                throw new Error(`Failed to fetch teams: Invalid response format`);
            }
            return response.teams
                .filter((team) => team.status === 'APPROVED')
                .map((team) => ({
                id: team.id,
                nickname: team.nickname,
                hackathonId: team.hackathonId,
                name: team.name
            }));
        }
        catch (error) {
            this.log('error', 'Failed to fetch teams:', error);
            throw error;
        }
    }
    async getCriteria(params) {
        const searchParams = new URLSearchParams();
        if (params?.teamSlug) {
            searchParams.append('teamSlug', params.teamSlug);
        }
        if (params?.criteriaType) {
            searchParams.append('criteriaType', params.criteriaType);
        }
        const url = `/api/service/team-criteria${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
        try {
            const response = await this.request(url);
            return response;
        }
        catch (error) {
            this.log('error', 'Failed to fetch criteria:', error);
            throw error;
        }
    }
    async updateIndividualCriteria(update) {
        const requestBody = {
            status: update.status,
            score: update.score,
            metrics: update.metrics,
            updatedBy: update.updatedBy
        };
        try {
            const response = await this.request(`/api/service/team-criteria/${update.teamSlug}/${update.criteriaType}`, {
                method: 'PUT',
                body: JSON.stringify(requestBody)
            });
            this.log('debug', `Updated criteria for ${update.teamSlug}/${update.criteriaType}:`, response);
            return response;
        }
        catch (error) {
            this.log('error', `Failed to update criteria for ${update.teamSlug}/${update.criteriaType}:`, error);
            throw error;
        }
    }
    async bulkUpdateCriteria(updates) {
        this.log('debug', `Sending ${updates.length} individual criteria updates...`);
        let updatedEntries = 0;
        let createdEntries = 0;
        const errors = [];
        const processedTeams = [];
        for (const update of updates) {
            try {
                const response = await this.updateIndividualCriteria(update);
                if (response.action === 'created') {
                    createdEntries++;
                }
                else {
                    updatedEntries++;
                }
                if (!processedTeams.includes(update.teamSlug)) {
                    processedTeams.push(update.teamSlug);
                }
                this.log('debug', `Successfully processed ${update.teamSlug}/${update.criteriaType}`);
            }
            catch (error) {
                errors.push({
                    teamSlug: update.teamSlug,
                    criteriaType: update.criteriaType,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
                this.log('warn', `Failed to process ${update.teamSlug}/${update.criteriaType}:`, error);
            }
        }
        const result = {
            success: errors.length === 0,
            data: {
                processed: updatedEntries + createdEntries,
                failed: errors.length,
                ...(errors.length > 0 && { errors: errors.map(e => `${e.teamSlug}/${e.criteriaType}: ${e.error}`) })
            },
            ...(errors.length > 0 && { message: `Completed with ${errors.length} errors` })
        };
        this.log('info', `Individual updates completed: ${updatedEntries} updated, ${createdEntries} created, ${errors.length} errors`);
        return result;
    }
    async updateSingleCriteria(teamSlug, criteriaType, update) {
        const url = `/api/service/team-criteria/${teamSlug}/${criteriaType}`;
        try {
            const response = await this.request(url, {
                method: 'PUT',
                body: JSON.stringify(update)
            });
            this.log('info', `Updated criteria ${criteriaType} for team ${teamSlug}:`, response);
            return response;
        }
        catch (error) {
            this.log('error', `Failed to update criteria for team ${teamSlug}:`, error);
            throw error;
        }
    }
    async getTeamEnvironmentData() {
        throw new Error('getTeamEnvironmentData is deprecated. Use getTeamEnvironmentDataByNickname with team nickname.');
    }
    async getTeamEnvironmentDataByNickname(teamNickname) {
        const searchParams = new URLSearchParams({
            team: teamNickname
        });
        const url = `/api/service/teams/environment?${searchParams.toString()}`;
        try {
            const response = await this.request(url);
            const teamData = response.team || (response.teams && response.teams[0]);
            if (!teamData || !teamData.environment || teamData.environment.length === 0) {
                this.log('warn', `No environment data found for team ${teamNickname}`);
                return {};
            }
            const envData = {};
            teamData.environment.forEach(item => {
                envData[item.key] = item.value;
            });
            this.log('debug', `Found ${teamData.environment.length} environment variables for team ${teamNickname}:`, Object.keys(envData));
            return envData;
        }
        catch (error) {
            this.log('error', `Failed to fetch environment data for team ${teamNickname}:`, error);
            throw error;
        }
    }
    async request(path, options = {}) {
        const url = `${this.config.baseUrl}${path}`;
        const defaultHeaders = {
            'X-API-Key': this.config.apiKey,
            'User-Agent': 'HackLoad-JobService/1.0'
        };
        if (options.body) {
            defaultHeaders['Content-Type'] = 'application/json';
        }
        const requestOptions = {
            method: 'GET',
            headers: {
                ...defaultHeaders,
                ...options.headers
            },
            timeout: options.timeout || this.config.timeout,
            ...options
        };
        this.log('debug', `Request details: ${requestOptions.method} ${url}`);
        this.log('debug', `Headers:`, requestOptions.headers);
        if (requestOptions.body) {
            this.log('debug', `Body:`, requestOptions.body);
        }
        let lastError = null;
        for (let attempt = 0; attempt <= this.config.retries; attempt++) {
            try {
                this.log('debug', `Making request (attempt ${attempt + 1}/${this.config.retries + 1}): ${requestOptions.method} ${url}`);
                const response = await this.fetchWithTimeout(url, requestOptions);
                if (!response.ok) {
                    const error = await this.createHttpError(response, url);
                    if (response.status >= 400 && response.status < 500) {
                        throw error;
                    }
                    lastError = error;
                    if (attempt < this.config.retries) {
                        const backoffMs = Math.min(1000 * Math.pow(2, attempt), 10000);
                        this.log('warn', `Request failed (attempt ${attempt + 1}), retrying in ${backoffMs}ms:`, error.message);
                        await new Promise(resolve => setTimeout(resolve, backoffMs));
                        continue;
                    }
                    throw error;
                }
                const data = await response.json();
                this.log('debug', `Request successful: ${requestOptions.method} ${url}`);
                return data;
            }
            catch (error) {
                lastError = error;
                if (attempt < this.config.retries && this.isRetryableError(error)) {
                    const backoffMs = Math.min(1000 * Math.pow(2, attempt), 10000);
                    this.log('warn', `Request failed (attempt ${attempt + 1}), retrying in ${backoffMs}ms:`, error);
                    await new Promise(resolve => setTimeout(resolve, backoffMs));
                    continue;
                }
                throw error;
            }
        }
        throw lastError || new Error('Unknown error occurred');
    }
    async fetchWithTimeout(url, options) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), options.timeout);
        try {
            const response = await fetch(url, {
                method: options.method,
                headers: options.headers,
                body: options.body,
                signal: controller.signal
            });
            return response;
        }
        finally {
            clearTimeout(timeoutId);
        }
    }
    async createHttpError(response, url) {
        let responseBody = null;
        try {
            const contentType = response.headers.get('content-type');
            if (contentType?.includes('application/json')) {
                responseBody = await response.json();
            }
            else {
                responseBody = await response.text();
            }
        }
        catch {
        }
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
        error.status = response.status;
        error.statusText = response.statusText;
        error.url = url;
        error.response = responseBody;
        return error;
    }
    isRetryableError(error) {
        if (error instanceof Error) {
            return error.name === 'AbortError' ||
                error.message.includes('network') ||
                error.message.includes('timeout');
        }
        return false;
    }
    log(level, message, ...args) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [${level.toUpperCase()}] [HubApiClient] ${message}`;
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
exports.HubApiClient = HubApiClient;
//# sourceMappingURL=api-client.js.map