import { AppConfig } from '../types/config';
import { 
  validateConfig, 
  getRequiredEnvVar, 
  getOptionalEnvVar, 
  getBooleanEnvVar, 
  getNumberEnvVar 
} from './validation';

export function loadConfig(): AppConfig {
  const config: AppConfig = {
    nodeEnv: getOptionalEnvVar('NODE_ENV', 'production') as string,
    logLevel: (getOptionalEnvVar('LOG_LEVEL', 'info') as 'error' | 'warn' | 'info' | 'debug'),
    
    api: {
      baseUrl: getRequiredEnvVar('API_BASE_URL'),
      serviceApiKey: getRequiredEnvVar('SERVICE_API_KEY'),
      timeout: getNumberEnvVar('API_TIMEOUT', 30000),
      retries: getNumberEnvVar('API_RETRIES', 3),
    },
    
    gitMonitor: {
      enabled: getBooleanEnvVar('GIT_MONITOR_ENABLED', true),
      interval: getOptionalEnvVar('GIT_MONITOR_INTERVAL', '*/30 * * * *') as string,
      timeout: getNumberEnvVar('GIT_MONITOR_TIMEOUT', 300000),
      retries: getNumberEnvVar('GIT_MONITOR_RETRIES', 3),
      github: {
        token: getOptionalEnvVar('GITHUB_TOKEN'),
        apiUrl: getOptionalEnvVar('GITHUB_API_URL', 'https://api.github.com') as string,
        appId: getOptionalEnvVar('GITHUB_APP_ID'),
        privateKey: getOptionalEnvVar('GITHUB_APP_PRIVATE_KEY'),
      },
    },
    
    deploymentMonitor: {
      enabled: getBooleanEnvVar('DEPLOYMENT_MONITOR_ENABLED', true),
      interval: getOptionalEnvVar('DEPLOYMENT_MONITOR_INTERVAL', '*/15 * * * *') as string,
      timeout: getNumberEnvVar('DEPLOYMENT_MONITOR_TIMEOUT', 30000),
      retries: getNumberEnvVar('DEPLOYMENT_MONITOR_RETRIES', 2),
      httpTimeout: getNumberEnvVar('HTTP_TIMEOUT', 10000),
      userAgent: getOptionalEnvVar('USER_AGENT', 'HackLoad-Monitor/1.0') as string,
    },
    
    k6Services: {
      enabled: getBooleanEnvVar('K6_SERVICES_ENABLED', true),
      interval: getOptionalEnvVar('K6_SERVICES_INTERVAL', '0 */6 * * *') as string,
      timeout: getNumberEnvVar('K6_SERVICES_TIMEOUT', 1200000),
      retries: getNumberEnvVar('K6_SERVICES_RETRIES', 1),
      dashboardBaseUrl: getOptionalEnvVar('GRAFANA_DASHBOARD_BASE_URL', 'https://hub.hackload.kz/grafana') as string,
    },
    
    
    budgetTracking: {
      enabled: getBooleanEnvVar('BUDGET_TRACKING_ENABLED', true),
      interval: getOptionalEnvVar('BUDGET_TRACKING_INTERVAL', '*/15 * * * *') as string,
      timeout: getNumberEnvVar('BUDGET_TRACKING_TIMEOUT', 120000),
      retries: getNumberEnvVar('BUDGET_TRACKING_RETRIES', 3),
    },
    
    judgeScore: {
      enabled: getBooleanEnvVar('JUDGE_SCORE_ENABLED', true),
      interval: getOptionalEnvVar('JUDGE_SCORE_INTERVAL', '*/10 * * * *') as string,
      timeout: getNumberEnvVar('JUDGE_SCORE_TIMEOUT', 60000),
      retries: getNumberEnvVar('JUDGE_SCORE_RETRIES', 3),
    },
    
    database: {
      url: getOptionalEnvVar('DATABASE_URL'),
      poolSize: getNumberEnvVar('DB_POOL_SIZE', 5),
      timeout: getNumberEnvVar('DB_TIMEOUT', 30000),
    },
    
    monitoring: {
      healthCheckPort: getNumberEnvVar('HEALTH_CHECK_PORT', 8080),
      metricsPort: getNumberEnvVar('METRICS_PORT', 9090),
      prometheusUrl: getOptionalEnvVar('PROMETHEUS_PUSHGATEWAY_URL'),
      sentryDsn: getOptionalEnvVar('SENTRY_DSN'),
      metricsEnabled: getBooleanEnvVar('METRICS_ENABLED', true),
      tracingEnabled: getBooleanEnvVar('TRACING_ENABLED', false),
    },
    
    performance: {
      maxConcurrentJobs: getNumberEnvVar('MAX_CONCURRENT_JOBS', 5),
      memoryLimitMb: getNumberEnvVar('MEMORY_LIMIT_MB', 512),
      cpuLimitCores: getNumberEnvVar('CPU_LIMIT_CORES', 0.5),
      rateLimitPerMinute: getNumberEnvVar('RATE_LIMIT_PER_MINUTE', 60),
    },
  };
  
  // Validate the loaded configuration
  validateConfig(config);
  
  return config;
}

export * from './validation';
export * from '../types/config';