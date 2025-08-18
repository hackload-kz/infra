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
  grafana: {
    apiUrl?: string;
    token?: string;
    username?: string;
  };
  resultsRetention: number;
}

export interface CostTrackingConfig extends ServiceConfig {
  aws?: {
    accessKeyId?: string;
    secretAccessKey?: string;
  };
  azure?: {
    clientId?: string;
    clientSecret?: string;
    tenantId?: string;
  };
  gcp?: {
    serviceAccountKey?: string;
  };
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
  costTracking: CostTrackingConfig;
  
  // Database Configuration (optional direct access)
  database: DatabaseConfig;
  
  // Monitoring & Observability
  monitoring: MonitoringConfig;
  
  // Performance & Resource Limits
  performance: PerformanceConfig;
}