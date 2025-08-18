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
const dotenv = __importStar(require("dotenv"));
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });
const config_1 = require("./config");
const scheduler_1 = require("./scheduler");
const api_client_1 = require("./lib/api-client");
const git_monitor_1 = require("./services/git-monitor");
const deployment_monitor_1 = require("./services/deployment-monitor");
const server_1 = require("./health/server");
const logger_1 = require("./lib/logger");
async function main() {
    console.log('HackLoad Job Service starting...');
    try {
        console.log('Loading configuration...');
        const config = (0, config_1.loadConfig)();
        const logger = (0, logger_1.createLogger)(config.logLevel, 'JobService');
        (0, logger_1.setLogger)(logger);
        logger.info('Configuration loaded successfully');
        logger.info(`Node environment: ${config.nodeEnv}`);
        logger.info(`Log level: ${config.logLevel}`);
        logger.info('Initializing Hub API client...');
        const apiClient = new api_client_1.HubApiClient({
            baseUrl: config.api.baseUrl,
            apiKey: config.api.serviceApiKey,
            timeout: config.api.timeout,
            retries: config.api.retries
        });
        logger.info('Creating job scheduler...');
        const scheduler = new scheduler_1.JobScheduler();
        logger.info('Registering job services...');
        if (config.gitMonitor.enabled) {
            logger.info('Registering Git Monitor Service...');
            const gitService = new git_monitor_1.GitMonitorService(config.gitMonitor.github);
            gitService.setApiClient(apiClient);
            scheduler.registerService(gitService, config.gitMonitor);
            logger.info(`Git Monitor Service registered with interval: ${config.gitMonitor.interval}`);
        }
        else {
            logger.info('Git Monitor Service disabled');
        }
        if (config.deploymentMonitor.enabled) {
            logger.info('Registering Deployment Monitor Service...');
            const deploymentService = new deployment_monitor_1.DeploymentMonitorService({
                httpTimeout: config.deploymentMonitor.httpTimeout,
                userAgent: config.deploymentMonitor.userAgent
            });
            deploymentService.setApiClient(apiClient);
            scheduler.registerService(deploymentService, config.deploymentMonitor);
            logger.info(`Deployment Monitor Service registered with interval: ${config.deploymentMonitor.interval}`);
        }
        else {
            logger.info('Deployment Monitor Service disabled');
        }
        if (config.k6Services.enabled) {
            logger.warn('K6 Services implemented but require architectural refactoring to match BaseJobService pattern');
        }
        if (config.costTracking.enabled) {
            logger.warn('Cost Tracking Service implemented but requires architectural refactoring to match BaseJobService pattern');
        }
        logger.info('Starting health and metrics servers...');
        const healthServer = new server_1.HealthServer({
            healthPort: config.monitoring.healthCheckPort,
            metricsPort: config.monitoring.metricsPort
        });
        healthServer.setScheduler(scheduler);
        await healthServer.start();
        logger.info('Starting job scheduler...');
        await scheduler.start();
        logger.info('HackLoad Job Service started successfully');
        logger.info(`Health endpoint: http://localhost:${config.monitoring.healthCheckPort}/health`);
        logger.info(`Metrics endpoint: http://localhost:${config.monitoring.metricsPort}/metrics`);
        const gracefulShutdown = async (signal) => {
            logger.info(`Received ${signal}, starting graceful shutdown...`);
            try {
                logger.info('Stopping job scheduler...');
                await scheduler.stop();
                logger.info('Stopping health server...');
                await healthServer.stop();
                logger.info('HackLoad Job Service stopped gracefully');
                process.exit(0);
            }
            catch (error) {
                logger.error('Error during graceful shutdown:', error);
                process.exit(1);
            }
        };
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        process.on('uncaughtException', (error) => {
            logger.error('Uncaught exception:', error);
            gracefulShutdown('uncaughtException');
        });
        process.on('unhandledRejection', (reason, promise) => {
            logger.error('Unhandled rejection at:', promise, 'reason:', reason);
            gracefulShutdown('unhandledRejection');
        });
    }
    catch (error) {
        console.error('Failed to start HackLoad Job Service:', error);
        process.exit(1);
    }
}
if (require.main === module) {
    main().catch((error) => {
        console.error('Unexpected error in main():', error);
        process.exit(1);
    });
}
//# sourceMappingURL=index.js.map