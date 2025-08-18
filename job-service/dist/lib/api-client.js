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
            const response = await this.request('/api/service/teams?status=APPROVED');
            if (!response.success || !response.data) {
                throw new Error(`Failed to fetch teams: ${response.error || response.message}`);
            }
            return response.data.teams.map(team => ({
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
    async bulkUpdateCriteria(updates) {
        const requestBody = { updates };
        try {
            const response = await this.request('/api/service/team-criteria', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });
            this.log('info', `Bulk updated ${updates.length} criteria. Response:`, response);
            return response;
        }
        catch (error) {
            this.log('error', 'Failed to bulk update criteria:', error);
            throw error;
        }
    }
    async updateSingleCriteria(teamSlug, criteriaType, update) {
        const url = `/api/service/team-criteria/${teamSlug}/${criteriaType}`;
        try {
            const response = await this.request(url, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
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
    async getTeamEnvironmentData(teamId, hackathonId) {
        const searchParams = new URLSearchParams({
            teamId,
            hackathonId
        });
        const url = `/api/service/team-environment?${searchParams.toString()}`;
        try {
            const response = await this.request(url);
            if (!response.success || !response.data) {
                this.log('warn', `No environment data found for team ${teamId}`);
                return {};
            }
            const envData = {};
            response.data.forEach(item => {
                envData[item.key] = item.value;
            });
            return envData;
        }
        catch (error) {
            this.log('error', `Failed to fetch environment data for team ${teamId}:`, error);
            throw error;
        }
    }
    async request(path, options = {}) {
        const url = `${this.config.baseUrl}${path}`;
        const requestOptions = {
            method: 'GET',
            headers: {
                'X-API-Key': this.config.apiKey,
                'User-Agent': 'HackLoad-JobService/1.0',
                ...options.headers
            },
            timeout: options.timeout || this.config.timeout,
            ...options
        };
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