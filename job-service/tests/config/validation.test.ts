/**
 * Unit tests for configuration validation
 */

import { validateConfig } from '../../src/config/validation';
import { ConfigurationError } from '../../src/config/validation';

describe('Configuration Validation', () => {
  // Save original environment
  const originalEnv = process.env;
  
  beforeEach(() => {
    // Reset modules to ensure fresh import
    jest.resetModules();
    // Clear environment
    process.env = {};
  });
  
  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });
  
  describe('validateConfig', () => {
    it('should validate minimal required configuration', () => {
      process.env = {
        API_BASE_URL: 'https://api.example.com',
        SERVICE_API_KEY: 'test-key',
        NODE_ENV: 'test'
      };
      
      const config = validateConfig();
      
      expect(config).toEqual({
        nodeEnv: 'test',
        logLevel: 'info',
        api: {
          baseUrl: 'https://api.example.com',
          serviceApiKey: 'test-key',
          timeout: 30000,
          retries: 3
        },
        services: {
          gitMonitorEnabled: true,
          deploymentMonitorEnabled: true,
          k6ServicesEnabled: false,
          costTrackingEnabled: false
        },
        scheduling: {
          gitMonitor: {
            interval: '*/30 * * * *',
            timeout: 300000,
            retries: 3
          },
          deploymentMonitor: {
            interval: '*/15 * * * *',
            timeout: 30000,
            retries: 2
          },
          k6Services: {
            interval: '0 */6 * * *',
            timeout: 1200000,
            retries: 1
          },
          costTracking: {
            interval: '0 */6 * * *',
            timeout: 600000,
            retries: 2
          }
        },
        github: {
          apiUrl: 'https://api.github.com',
          userAgent: 'HackLoad-Monitor/1.0'
        },
        http: {
          timeout: 10000,
          userAgent: 'HackLoad-Monitor/1.0'
        },
        monitoring: {
          healthCheckPort: 8080,
          metricsPort: 9090,
          metricsEnabled: true,
          tracingEnabled: false
        },
        performance: {
          maxConcurrentJobs: 5,
          memoryLimitMb: 512,
          cpuLimitCores: 0.5,
          rateLimitPerMinute: 60
        },
        database: {
          poolSize: 5,
          timeout: 30000
        },
        gitMonitor: {
          enabled: true,
          interval: '*/30 * * * *',
          timeout: 300000,
          retries: 3,
          github: {
            apiUrl: 'https://api.github.com',
            userAgent: 'HackLoad-Monitor/1.0'
          }
        },
        deploymentMonitor: {
          enabled: true,
          interval: '*/15 * * * *',
          timeout: 30000,
          retries: 2,
          httpTimeout: 10000,
          userAgent: 'HackLoad-Monitor/1.0'
        },
        k6Services: {
          enabled: false,
          interval: '0 */6 * * *',
          timeout: 1200000,
          retries: 1
        },
        costTracking: {
          enabled: false,
          interval: '0 */6 * * *',
          timeout: 600000,
          retries: 2
        }
      });
    });
    
    it('should throw error for missing API base URL', () => {
      process.env = {
        SERVICE_API_KEY: 'test-key'
      };
      
      expect(() => validateConfig()).toThrow(ConfigurationError);
      expect(() => validateConfig()).toThrow('API_BASE_URL is required');
    });
    
    it('should throw error for missing service API key', () => {
      process.env = {
        API_BASE_URL: 'https://api.example.com'
      };
      
      expect(() => validateConfig()).toThrow(ConfigurationError);
      expect(() => validateConfig()).toThrow('SERVICE_API_KEY is required');
    });
    
    it('should validate with all optional environment variables', () => {
      process.env = {
        // Required
        API_BASE_URL: 'https://api.example.com',
        SERVICE_API_KEY: 'test-key',
        
        // Optional
        NODE_ENV: 'production',
        LOG_LEVEL: 'debug',
        API_TIMEOUT: '45000',
        API_RETRIES: '5',
        
        // Services
        GIT_MONITOR_ENABLED: 'true',
        DEPLOYMENT_MONITOR_ENABLED: 'false',
        K6_SERVICES_ENABLED: 'true',
        COST_TRACKING_ENABLED: 'true',
        
        // Scheduling
        GIT_MONITOR_INTERVAL: '*/15 * * * *',
        GIT_MONITOR_TIMEOUT: '180000',
        GIT_MONITOR_RETRIES: '2',
        
        // GitHub
        GITHUB_API_URL: 'https://api.github.com',
        GITHUB_TOKEN: 'github-token',
        
        // HTTP
        HTTP_TIMEOUT: '15000',
        USER_AGENT: 'Custom-Agent/2.0',
        
        // Monitoring
        HEALTH_CHECK_PORT: '8081',
        METRICS_PORT: '9091',
        METRICS_ENABLED: 'false',
        TRACING_ENABLED: 'true',
        
        // Performance
        MAX_CONCURRENT_JOBS: '10',
        MEMORY_LIMIT_MB: '1024',
        CPU_LIMIT_CORES: '1.0',
        RATE_LIMIT_PER_MINUTE: '120',
        
        // Database
        DB_POOL_SIZE: '10',
        DB_TIMEOUT: '60000'
      };
      
      const config = validateConfig();
      
      expect(config.nodeEnv).toBe('production');
      expect(config.logLevel).toBe('debug');
      expect(config.api.timeout).toBe(45000);
      expect(config.api.retries).toBe(5);
      expect(config.services.gitMonitorEnabled).toBe(true);
      expect(config.services.deploymentMonitorEnabled).toBe(false);
      expect(config.services.k6ServicesEnabled).toBe(true);
      expect(config.services.costTrackingEnabled).toBe(true);
      expect(config.scheduling.gitMonitor.interval).toBe('*/15 * * * *');
      expect(config.scheduling.gitMonitor.timeout).toBe(180000);
      expect(config.scheduling.gitMonitor.retries).toBe(2);
      expect(config.github?.token).toBe('github-token');
      expect(config.http.timeout).toBe(15000);
      expect(config.http.userAgent).toBe('Custom-Agent/2.0');
      expect(config.monitoring.healthCheckPort).toBe(8081);
      expect(config.monitoring.metricsPort).toBe(9091);
      expect(config.monitoring.metricsEnabled).toBe(false);
      expect(config.monitoring.tracingEnabled).toBe(true);
      expect(config.performance.maxConcurrentJobs).toBe(10);
      expect(config.performance.memoryLimitMb).toBe(1024);
      expect(config.performance.cpuLimitCores).toBe(1.0);
      expect(config.performance.rateLimitPerMinute).toBe(120);
      expect(config.database.poolSize).toBe(10);
      expect(config.database.timeout).toBe(60000);
    });
    
    it('should validate invalid log level', () => {
      process.env = {
        API_BASE_URL: 'https://api.example.com',
        SERVICE_API_KEY: 'test-key',
        LOG_LEVEL: 'invalid'
      };
      
      expect(() => validateConfig()).toThrow(ConfigurationError);
      expect(() => validateConfig()).toThrow('LOG_LEVEL must be one of: error, warn, info, debug');
    });
    
    it('should validate invalid boolean values', () => {
      process.env = {
        API_BASE_URL: 'https://api.example.com',
        SERVICE_API_KEY: 'test-key',
        GIT_MONITOR_ENABLED: 'maybe'
      };
      
      expect(() => validateConfig()).toThrow(ConfigurationError);
      expect(() => validateConfig()).toThrow('GIT_MONITOR_ENABLED must be a boolean value');
    });
    
    it('should validate invalid numeric values', () => {
      process.env = {
        API_BASE_URL: 'https://api.example.com',
        SERVICE_API_KEY: 'test-key',
        API_TIMEOUT: 'not-a-number'
      };
      
      expect(() => validateConfig()).toThrow(ConfigurationError);
      expect(() => validateConfig()).toThrow('API_TIMEOUT must be a valid number');
    });
    
    it('should validate port ranges', () => {
      process.env = {
        API_BASE_URL: 'https://api.example.com',
        SERVICE_API_KEY: 'test-key',
        HEALTH_CHECK_PORT: '99999'
      };
      
      expect(() => validateConfig()).toThrow(ConfigurationError);
      expect(() => validateConfig()).toThrow('HEALTH_CHECK_PORT must be between 1 and 65535');
    });
    
    it('should validate negative numbers', () => {
      process.env = {
        API_BASE_URL: 'https://api.example.com',
        SERVICE_API_KEY: 'test-key',
        API_RETRIES: '-1'
      };
      
      expect(() => validateConfig()).toThrow(ConfigurationError);
      expect(() => validateConfig()).toThrow('API_RETRIES must be a positive number');
    });
    
    it('should validate cron expressions', () => {
      process.env = {
        API_BASE_URL: 'https://api.example.com',
        SERVICE_API_KEY: 'test-key',
        GIT_MONITOR_INTERVAL: 'invalid-cron'
      };
      
      expect(() => validateConfig()).toThrow(ConfigurationError);
      expect(() => validateConfig()).toThrow('GIT_MONITOR_INTERVAL must be a valid cron expression');
    });
    
    it('should validate URL format', () => {
      process.env = {
        API_BASE_URL: 'not-a-url',
        SERVICE_API_KEY: 'test-key'
      };
      
      expect(() => validateConfig()).toThrow(ConfigurationError);
      expect(() => validateConfig()).toThrow('API_BASE_URL must be a valid URL');
    });
    
    it('should handle Grafana configuration validation', () => {
      process.env = {
        API_BASE_URL: 'https://api.example.com',
        SERVICE_API_KEY: 'test-key',
        K6_SERVICES_ENABLED: 'true',
        GRAFANA_API_URL: 'https://grafana.example.com',
        GRAFANA_TOKEN: 'grafana-token'
      };
      
      const config = validateConfig();
      
      expect(config.grafana).toEqual({
        apiUrl: 'https://grafana.example.com',
        token: 'grafana-token'
      });
    });
    
    it('should require Grafana configuration when K6 services are enabled', () => {
      process.env = {
        API_BASE_URL: 'https://api.example.com',
        SERVICE_API_KEY: 'test-key',
        K6_SERVICES_ENABLED: 'true'
      };
      
      expect(() => validateConfig()).toThrow(ConfigurationError);
      expect(() => validateConfig()).toThrow('GRAFANA_API_URL is required when K6 services are enabled');
    });
    
    it('should validate cloud provider configuration', () => {
      process.env = {
        API_BASE_URL: 'https://api.example.com',
        SERVICE_API_KEY: 'test-key',
        COST_TRACKING_ENABLED: 'true',
        AWS_ACCESS_KEY_ID: 'aws-key',
        AWS_SECRET_ACCESS_KEY: 'aws-secret',
        AWS_REGION: 'us-west-2'
      };
      
      const config = validateConfig();
      
      expect(config.aws).toEqual({
        accessKeyId: 'aws-key',
        secretAccessKey: 'aws-secret',
        region: 'us-west-2'
      });
    });
    
    it('should validate environment defaults', () => {
      process.env = {
        API_BASE_URL: 'https://api.example.com',
        SERVICE_API_KEY: 'test-key'
      };
      
      const config = validateConfig();
      
      // Should default to development when NODE_ENV not set
      expect(config.nodeEnv).toBe('development');
    });
  });
  
  describe('ConfigurationError', () => {
    it('should be instance of Error', () => {
      const error = new ConfigurationError('Test error');
      
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('ConfigurationError');
      expect(error.message).toBe('Test error');
    });
    
    it('should maintain stack trace', () => {
      const error = new ConfigurationError('Test error');
      
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('ConfigurationError');
    });
  });
});