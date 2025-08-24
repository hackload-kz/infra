export interface ServiceConfig {
  enabled: boolean;
  interval: string;
  timeout: number;
  retries?: number;
}

export interface GitMonitorConfig extends ServiceConfig {
  github: {
    token?: string;
    apiUrl: string;
    appId?: string;
    privateKey?: string;
  };
}

export interface DeploymentMonitorConfig extends ServiceConfig {
  httpTimeout: number;
  userAgent: string;
}

export interface K6ServicesConfig extends ServiceConfig {
  dashboardBaseUrl: string;
}


export interface BudgetTrackingConfig extends ServiceConfig {
  // Configuration for budget tracking service
  // Reads MONEY_SPEND from team environment variables
  // Uses dynamic scoring: min spend = 30 pts, max spend = 5 pts
}

export interface JudgeScoreConfig extends ServiceConfig {
  // Configuration for judge score service
  // Reads JUDJE_SCORE from team environment variables
  // Maximum 10 points, blank when 0 or null
}

export interface DatabaseConfig {
  url?: string;
  poolSize: number;
  timeout: number;
}

export interface MonitoringConfig {
  healthCheckPort: number;
  metricsPort: number;
  prometheusUrl?: string;
  sentryDsn?: string;
  metricsEnabled: boolean;
  tracingEnabled: boolean;
}

export interface PerformanceConfig {
  maxConcurrentJobs: number;
  memoryLimitMb: number;
  cpuLimitCores: number;
  rateLimitPerMinute: number;
}

export interface AppConfig {
  nodeEnv: string;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  
  // API Configuration
  api: {
    baseUrl: string;
    serviceApiKey: string;
    timeout: number;
    retries: number;
  };
  
  // Service Configurations
  gitMonitor: GitMonitorConfig;
  deploymentMonitor: DeploymentMonitorConfig;
  k6Services: K6ServicesConfig;
  budgetTracking: BudgetTrackingConfig;
  judgeScore: JudgeScoreConfig;
  
  // Database Configuration (optional direct access)
  database: DatabaseConfig;
  
  // Monitoring & Observability
  monitoring: MonitoringConfig;
  
  // Performance & Resource Limits
  performance: PerformanceConfig;
}