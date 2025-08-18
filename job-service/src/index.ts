import { loadConfig } from './config';
import { JobScheduler } from './scheduler';
import { HubApiClient } from './lib/api-client';
import { GitMonitorService } from './services/git-monitor';
import { DeploymentMonitorService } from './services/deployment-monitor';
import { HealthServer } from './health/server';
import { createLogger, setLogger } from './lib/logger';

async function main(): Promise<void> {
  console.log('HackLoad Job Service starting...');
  
  try {
    // Load and validate configuration
    console.log('Loading configuration...');
    const config = loadConfig();
    
    // Set up global logger
    const logger = createLogger(config.logLevel, 'JobService');
    setLogger(logger);
    
    logger.info('Configuration loaded successfully');
    logger.info(`Node environment: ${config.nodeEnv}`);
    logger.info(`Log level: ${config.logLevel}`);
    
    // Create API client
    logger.info('Initializing Hub API client...');
    const apiClient = new HubApiClient({
      baseUrl: config.api.baseUrl,
      apiKey: config.api.serviceApiKey,
      timeout: config.api.timeout,
      retries: config.api.retries
    });
    
    // Create job scheduler
    logger.info('Creating job scheduler...');
    const scheduler = new JobScheduler();
    
    // Register services
    logger.info('Registering job services...');
    
    // Git Monitor Service
    if (config.gitMonitor.enabled) {
      logger.info('Registering Git Monitor Service...');
      const gitService = new GitMonitorService(config.gitMonitor.github);
      gitService.setApiClient(apiClient);
      scheduler.registerService(gitService, config.gitMonitor);
      logger.info(`Git Monitor Service registered with interval: ${config.gitMonitor.interval}`);
    } else {
      logger.info('Git Monitor Service disabled');
    }
    
    // Deployment Monitor Service  
    if (config.deploymentMonitor.enabled) {
      logger.info('Registering Deployment Monitor Service...');
      const deploymentService = new DeploymentMonitorService({
        httpTimeout: config.deploymentMonitor.httpTimeout,
        userAgent: config.deploymentMonitor.userAgent
      });
      deploymentService.setApiClient(apiClient);
      scheduler.registerService(deploymentService, config.deploymentMonitor);
      logger.info(`Deployment Monitor Service registered with interval: ${config.deploymentMonitor.interval}`);
    } else {
      logger.info('Deployment Monitor Service disabled');
    }
    
    // Note: K6 and Cost Tracking services implemented but need architectural refactoring
    if (config.k6Services.enabled) {
      logger.warn('K6 Services implemented but require architectural refactoring to match BaseJobService pattern');
    }
    if (config.costTracking.enabled) {
      logger.warn('Cost Tracking Service implemented but requires architectural refactoring to match BaseJobService pattern');
    }
    
    // Create and start health server
    logger.info('Starting health and metrics servers...');
    const healthServer = new HealthServer({
      healthPort: config.monitoring.healthCheckPort,
      metricsPort: config.monitoring.metricsPort
    });
    healthServer.setScheduler(scheduler);
    await healthServer.start();
    
    // Start job scheduler
    logger.info('Starting job scheduler...');
    await scheduler.start();
    
    logger.info('HackLoad Job Service started successfully');
    logger.info(`Health endpoint: http://localhost:${config.monitoring.healthCheckPort}/health`);
    logger.info(`Metrics endpoint: http://localhost:${config.monitoring.metricsPort}/metrics`);
    
    // Setup graceful shutdown
    const gracefulShutdown = async (signal: string): Promise<void> => {
      logger.info(`Received ${signal}, starting graceful shutdown...`);
      
      try {
        logger.info('Stopping job scheduler...');
        await scheduler.stop();
        
        logger.info('Stopping health server...');
        await healthServer.stop();
        
        logger.info('HackLoad Job Service stopped gracefully');
        process.exit(0);
      } catch (error) {
        logger.error('Error during graceful shutdown:', error);
        process.exit(1);
      }
    };
    
    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    // Handle uncaught exceptions and unhandled rejections
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception:', error);
      gracefulShutdown('uncaughtException');
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection at:', promise, 'reason:', reason);
      gracefulShutdown('unhandledRejection');
    });
    
  } catch (error) {
    console.error('Failed to start HackLoad Job Service:', error);
    process.exit(1);
  }
}

// Only run main if this file is executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Unexpected error in main():', error);
    process.exit(1);
  });
}