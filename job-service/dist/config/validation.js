"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigValidationError = void 0;
exports.validateConfig = validateConfig;
exports.getRequiredEnvVar = getRequiredEnvVar;
exports.getOptionalEnvVar = getOptionalEnvVar;
exports.getBooleanEnvVar = getBooleanEnvVar;
exports.getNumberEnvVar = getNumberEnvVar;
class ConfigValidationError extends Error {
    constructor(message) {
        super(`Configuration validation error: ${message}`);
        this.name = 'ConfigValidationError';
    }
}
exports.ConfigValidationError = ConfigValidationError;
function validateConfig(config) {
    if (!config.api.baseUrl) {
        throw new ConfigValidationError('API_BASE_URL is required');
    }
    if (!config.api.serviceApiKey) {
        throw new ConfigValidationError('SERVICE_API_KEY is required');
    }
    try {
        new URL(config.api.baseUrl);
    }
    catch {
        throw new ConfigValidationError('API_BASE_URL must be a valid URL');
    }
    if (config.monitoring.healthCheckPort < 1 || config.monitoring.healthCheckPort > 65535) {
        throw new ConfigValidationError('HEALTH_CHECK_PORT must be between 1 and 65535');
    }
    if (config.monitoring.metricsPort < 1 || config.monitoring.metricsPort > 65535) {
        throw new ConfigValidationError('METRICS_PORT must be between 1 and 65535');
    }
    validateCronInterval(config.gitMonitor.interval, 'GIT_MONITOR_INTERVAL');
    validateCronInterval(config.deploymentMonitor.interval, 'DEPLOYMENT_MONITOR_INTERVAL');
    validateCronInterval(config.k6Services.interval, 'K6_SERVICES_INTERVAL');
    validateCronInterval(config.costTracking.interval, 'COST_TRACKING_INTERVAL');
    if (config.gitMonitor.enabled) {
        if (!config.gitMonitor.github.token && !config.gitMonitor.github.appId) {
            throw new ConfigValidationError('GITHUB_TOKEN or GITHUB_APP_ID is required when git monitoring is enabled');
        }
        if (config.gitMonitor.github.appId && !config.gitMonitor.github.privateKey) {
            throw new ConfigValidationError('GITHUB_APP_PRIVATE_KEY is required when using GitHub App authentication');
        }
    }
    if (config.k6Services.enabled) {
        if (!config.k6Services.dashboardBaseUrl) {
            throw new ConfigValidationError('GRAFANA_DASHBOARD_BASE_URL is required when K6 services are enabled');
        }
    }
    if (config.performance.maxConcurrentJobs < 1) {
        throw new ConfigValidationError('MAX_CONCURRENT_JOBS must be at least 1');
    }
    if (config.performance.memoryLimitMb < 128) {
        throw new ConfigValidationError('MEMORY_LIMIT_MB must be at least 128');
    }
    if (config.performance.rateLimitPerMinute < 1) {
        throw new ConfigValidationError('RATE_LIMIT_PER_MINUTE must be at least 1');
    }
}
function validateCronInterval(interval, fieldName) {
    const parts = interval.trim().split(/\s+/);
    if (parts.length !== 5 && parts.length !== 6) {
        throw new ConfigValidationError(`${fieldName} must be a valid cron expression (5 or 6 parts)`);
    }
}
function getRequiredEnvVar(name) {
    const value = process.env[name];
    if (!value) {
        throw new ConfigValidationError(`${name} environment variable is required`);
    }
    return value;
}
function getOptionalEnvVar(name, defaultValue) {
    return process.env[name] ?? defaultValue;
}
function getBooleanEnvVar(name, defaultValue = false) {
    const value = process.env[name];
    if (!value)
        return defaultValue;
    const lowerValue = value.toLowerCase();
    if (lowerValue === 'true' || lowerValue === '1' || lowerValue === 'yes') {
        return true;
    }
    if (lowerValue === 'false' || lowerValue === '0' || lowerValue === 'no') {
        return false;
    }
    throw new ConfigValidationError(`${name} must be a boolean value (true/false, 1/0, yes/no)`);
}
function getNumberEnvVar(name, defaultValue) {
    const value = process.env[name];
    if (!value) {
        if (defaultValue !== undefined)
            return defaultValue;
        throw new ConfigValidationError(`${name} environment variable is required`);
    }
    const numValue = Number(value);
    if (isNaN(numValue)) {
        throw new ConfigValidationError(`${name} must be a valid number`);
    }
    return numValue;
}
//# sourceMappingURL=validation.js.map