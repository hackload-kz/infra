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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadConfig = loadConfig;
const validation_1 = require("./validation");
function loadConfig() {
    const config = {
        nodeEnv: (0, validation_1.getOptionalEnvVar)('NODE_ENV', 'production'),
        logLevel: (0, validation_1.getOptionalEnvVar)('LOG_LEVEL', 'info'),
        api: {
            baseUrl: (0, validation_1.getRequiredEnvVar)('API_BASE_URL'),
            serviceApiKey: (0, validation_1.getRequiredEnvVar)('SERVICE_API_KEY'),
            timeout: (0, validation_1.getNumberEnvVar)('API_TIMEOUT', 30000),
            retries: (0, validation_1.getNumberEnvVar)('API_RETRIES', 3),
        },
        gitMonitor: {
            enabled: (0, validation_1.getBooleanEnvVar)('GIT_MONITOR_ENABLED', true),
            interval: (0, validation_1.getOptionalEnvVar)('GIT_MONITOR_INTERVAL', '*/30 * * * *'),
            timeout: (0, validation_1.getNumberEnvVar)('GIT_MONITOR_TIMEOUT', 300000),
            retries: (0, validation_1.getNumberEnvVar)('GIT_MONITOR_RETRIES', 3),
            github: {
                token: (0, validation_1.getOptionalEnvVar)('GITHUB_TOKEN'),
                apiUrl: (0, validation_1.getOptionalEnvVar)('GITHUB_API_URL', 'https://api.github.com'),
                appId: (0, validation_1.getOptionalEnvVar)('GITHUB_APP_ID'),
                privateKey: (0, validation_1.getOptionalEnvVar)('GITHUB_APP_PRIVATE_KEY'),
            },
        },
        deploymentMonitor: {
            enabled: (0, validation_1.getBooleanEnvVar)('DEPLOYMENT_MONITOR_ENABLED', true),
            interval: (0, validation_1.getOptionalEnvVar)('DEPLOYMENT_MONITOR_INTERVAL', '*/15 * * * *'),
            timeout: (0, validation_1.getNumberEnvVar)('DEPLOYMENT_MONITOR_TIMEOUT', 30000),
            retries: (0, validation_1.getNumberEnvVar)('DEPLOYMENT_MONITOR_RETRIES', 2),
            httpTimeout: (0, validation_1.getNumberEnvVar)('HTTP_TIMEOUT', 10000),
            userAgent: (0, validation_1.getOptionalEnvVar)('USER_AGENT', 'HackLoad-Monitor/1.0'),
        },
        k6Services: {
            enabled: (0, validation_1.getBooleanEnvVar)('K6_SERVICES_ENABLED', true),
            interval: (0, validation_1.getOptionalEnvVar)('K6_SERVICES_INTERVAL', '0 */6 * * *'),
            timeout: (0, validation_1.getNumberEnvVar)('K6_SERVICES_TIMEOUT', 1200000),
            retries: (0, validation_1.getNumberEnvVar)('K6_SERVICES_RETRIES', 1),
            grafana: {
                apiUrl: (0, validation_1.getOptionalEnvVar)('GRAFANA_API_URL'),
                token: (0, validation_1.getOptionalEnvVar)('GRAFANA_TOKEN'),
                username: (0, validation_1.getOptionalEnvVar)('GRAFANA_USERNAME'),
            },
            resultsRetention: (0, validation_1.getNumberEnvVar)('K6_RESULTS_RETENTION', 30),
        },
        costTracking: {
            enabled: (0, validation_1.getBooleanEnvVar)('COST_TRACKING_ENABLED', true),
            interval: (0, validation_1.getOptionalEnvVar)('COST_TRACKING_INTERVAL', '0 */6 * * *'),
            timeout: (0, validation_1.getNumberEnvVar)('COST_TRACKING_TIMEOUT', 600000),
            retries: (0, validation_1.getNumberEnvVar)('COST_TRACKING_RETRIES', 2),
            aws: {
                accessKeyId: (0, validation_1.getOptionalEnvVar)('AWS_ACCESS_KEY_ID'),
                secretAccessKey: (0, validation_1.getOptionalEnvVar)('AWS_SECRET_ACCESS_KEY'),
            },
            azure: {
                clientId: (0, validation_1.getOptionalEnvVar)('AZURE_CLIENT_ID'),
                clientSecret: (0, validation_1.getOptionalEnvVar)('AZURE_CLIENT_SECRET'),
                tenantId: (0, validation_1.getOptionalEnvVar)('AZURE_TENANT_ID'),
            },
            gcp: {
                serviceAccountKey: (0, validation_1.getOptionalEnvVar)('GCP_SERVICE_ACCOUNT_KEY'),
            },
        },
        database: {
            url: (0, validation_1.getOptionalEnvVar)('DATABASE_URL'),
            poolSize: (0, validation_1.getNumberEnvVar)('DB_POOL_SIZE', 5),
            timeout: (0, validation_1.getNumberEnvVar)('DB_TIMEOUT', 30000),
        },
        monitoring: {
            healthCheckPort: (0, validation_1.getNumberEnvVar)('HEALTH_CHECK_PORT', 8080),
            metricsPort: (0, validation_1.getNumberEnvVar)('METRICS_PORT', 9090),
            prometheusUrl: (0, validation_1.getOptionalEnvVar)('PROMETHEUS_PUSHGATEWAY_URL'),
            sentryDsn: (0, validation_1.getOptionalEnvVar)('SENTRY_DSN'),
            metricsEnabled: (0, validation_1.getBooleanEnvVar)('METRICS_ENABLED', true),
            tracingEnabled: (0, validation_1.getBooleanEnvVar)('TRACING_ENABLED', false),
        },
        performance: {
            maxConcurrentJobs: (0, validation_1.getNumberEnvVar)('MAX_CONCURRENT_JOBS', 5),
            memoryLimitMb: (0, validation_1.getNumberEnvVar)('MEMORY_LIMIT_MB', 512),
            cpuLimitCores: (0, validation_1.getNumberEnvVar)('CPU_LIMIT_CORES', 0.5),
            rateLimitPerMinute: (0, validation_1.getNumberEnvVar)('RATE_LIMIT_PER_MINUTE', 60),
        },
    };
    (0, validation_1.validateConfig)(config);
    return config;
}
__exportStar(require("./validation"), exports);
__exportStar(require("../types/config"), exports);
//# sourceMappingURL=index.js.map