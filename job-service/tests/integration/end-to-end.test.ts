/**
 * End-to-end integration tests for the Job Service
 * Tests the complete application flow from configuration to execution
 */

import { spawn, ChildProcess } from 'child_process';
import { promises as fs } from 'fs';
import { join } from 'path';
import fetch from 'node-fetch';

// Mock fetch for external API calls
jest.mock('node-fetch');
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('Job Service End-to-End Tests', () => {
  let serviceProcess: ChildProcess | null = null;
  let originalEnv: NodeJS.ProcessEnv;
  
  const testEnv = {
    NODE_ENV: 'test',
    LOG_LEVEL: 'error', // Minimize test output
    API_BASE_URL: 'https://test-api.example.com',
    SERVICE_API_KEY: 'test-service-key',
    HEALTH_CHECK_PORT: '8081',
    METRICS_PORT: '9091',
    GIT_MONITOR_ENABLED: 'false', // Disable external services for E2E
    DEPLOYMENT_MONITOR_ENABLED: 'false',
    K6_SERVICES_ENABLED: 'false',
    COST_TRACKING_ENABLED: 'false'
  };
  
  beforeAll(() => {
    originalEnv = process.env;
    
    // Mock fetch to prevent actual API calls
    mockFetch.mockImplementation(() => 
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, data: [] })
      } as any)
    );
  });
  
  afterAll(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });
  
  beforeEach(() => {
    jest.setTimeout(30000); // 30 second timeout for E2E tests
  });
  
  afterEach(async () => {
    if (serviceProcess) {
      // Graceful shutdown
      serviceProcess.kill('SIGTERM');
      
      // Wait for process to exit or force kill after 5 seconds
      await new Promise((resolve) => {
        const timeout = setTimeout(() => {
          if (serviceProcess && !serviceProcess.killed) {
            serviceProcess.kill('SIGKILL');
          }
          resolve(void 0);
        }, 5000);
        
        if (serviceProcess) {
          serviceProcess.on('exit', () => {
            clearTimeout(timeout);
            resolve(void 0);
          });
        } else {
          clearTimeout(timeout);
          resolve(void 0);
        }
      });
      
      serviceProcess = null;
    }
  });
  
  describe('Application Startup', () => {
    it('should start successfully with valid configuration', async () => {
      const { success, output } = await startService(testEnv);
      
      expect(success).toBe(true);
      expect(output).toContain('HackLoad Job Service started successfully');
      expect(output).toContain('Health endpoint: http://localhost:8081/health');
      expect(output).toContain('Metrics endpoint: http://localhost:9091/metrics');
    });
    
    it('should fail to start with missing required configuration', async () => {
      const invalidEnv = { ...testEnv };
      delete invalidEnv.API_BASE_URL;
      
      const { success, output } = await startService(invalidEnv, 5000);
      
      expect(success).toBe(false);
      expect(output).toContain('API_BASE_URL is required');
    });
    
    it('should fail to start with invalid configuration', async () => {
      const invalidEnv = {
        ...testEnv,
        HEALTH_CHECK_PORT: '999999' // Invalid port
      };
      
      const { success, output } = await startService(invalidEnv, 5000);
      
      expect(success).toBe(false);
      expect(output).toContain('must be between 1 and 65535');
    });
  });
  
  describe('Health Endpoints', () => {
    it('should provide health check endpoint', async () => {
      const { success } = await startService(testEnv);
      expect(success).toBe(true);
      
      // Wait for server to be ready
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Test health endpoint
      const response = await fetch('http://localhost:8081/health');
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        status: 'healthy',
        timestamp: expect.any(String),
        services: expect.any(Array)
      });
    });
    
    it('should provide liveness probe endpoint', async () => {
      const { success } = await startService(testEnv);
      expect(success).toBe(true);
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const response = await fetch('http://localhost:8081/health/live');
      
      expect(response.status).toBe(200);
    });
    
    it('should provide readiness probe endpoint', async () => {
      const { success } = await startService(testEnv);
      expect(success).toBe(true);
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const response = await fetch('http://localhost:8081/health/ready');
      
      expect(response.status).toBe(200);
    });
    
    it('should provide metrics endpoint', async () => {
      const { success } = await startService(testEnv);
      expect(success).toBe(true);
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const response = await fetch('http://localhost:9091/metrics');
      
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('text/plain');
      
      const metrics = await response.text();
      expect(metrics).toContain('# HELP');
      expect(metrics).toContain('# TYPE');
    });
  });
  
  describe('Service Configuration', () => {
    it('should respect service enablement configuration', async () => {
      const envWithServices = {
        ...testEnv,
        GIT_MONITOR_ENABLED: 'true',
        DEPLOYMENT_MONITOR_ENABLED: 'true'
      };
      
      const { success, output } = await startService(envWithServices);
      
      expect(success).toBe(true);
      expect(output).toContain('Git Monitor Service registered');
      expect(output).toContain('Deployment Monitor Service registered');
    });
    
    it('should show disabled services correctly', async () => {
      const { success, output } = await startService(testEnv);
      
      expect(success).toBe(true);
      expect(output).toContain('Git Monitor Service disabled');
      expect(output).toContain('Deployment Monitor Service disabled');
    });
  });
  
  describe('Graceful Shutdown', () => {
    it('should shutdown gracefully on SIGTERM', async () => {
      const { success } = await startService(testEnv);
      expect(success).toBe(true);
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Send SIGTERM and capture shutdown process
      const shutdownPromise = new Promise<string>((resolve) => {
        let output = '';
        if (serviceProcess) {
          serviceProcess.stdout?.on('data', (data) => {
            output += data.toString();
          });
          serviceProcess.stderr?.on('data', (data) => {
            output += data.toString();
          });
          serviceProcess.on('exit', () => {
            resolve(output);
          });
          serviceProcess.kill('SIGTERM');
        }
      });
      
      const shutdownOutput = await shutdownPromise;
      
      expect(shutdownOutput).toContain('Received SIGTERM, starting graceful shutdown');
      expect(shutdownOutput).toContain('HackLoad Job Service stopped gracefully');
    });
    
    it('should shutdown gracefully on SIGINT', async () => {
      const { success } = await startService(testEnv);
      expect(success).toBe(true);
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const shutdownPromise = new Promise<string>((resolve) => {
        let output = '';
        if (serviceProcess) {
          serviceProcess.stdout?.on('data', (data) => {
            output += data.toString();
          });
          serviceProcess.stderr?.on('data', (data) => {
            output += data.toString();
          });
          serviceProcess.on('exit', () => {
            resolve(output);
          });
          serviceProcess.kill('SIGINT');
        }
      });
      
      const shutdownOutput = await shutdownPromise;
      
      expect(shutdownOutput).toContain('Received SIGINT, starting graceful shutdown');
      expect(shutdownOutput).toContain('HackLoad Job Service stopped gracefully');
    });
  });
  
  describe('Configuration Loading', () => {
    it('should load configuration from environment variables', async () => {
      const customEnv = {
        ...testEnv,
        LOG_LEVEL: 'debug',
        API_TIMEOUT: '45000',
        HEALTH_CHECK_PORT: '8082',
        METRICS_PORT: '9092'
      };
      
      const { success, output } = await startService(customEnv);
      
      expect(success).toBe(true);
      expect(output).toContain('Log level: debug');
      expect(output).toContain('Health endpoint: http://localhost:8082/health');
      expect(output).toContain('Metrics endpoint: http://localhost:9092/metrics');
    });
    
    it('should load configuration from .env file', async () => {
      // Create temporary .env file
      const envContent = `
        NODE_ENV=test
        LOG_LEVEL=error
        API_BASE_URL=https://env-file-api.example.com
        SERVICE_API_KEY=env-file-key
        HEALTH_CHECK_PORT=8083
        METRICS_PORT=9093
        GIT_MONITOR_ENABLED=false
        DEPLOYMENT_MONITOR_ENABLED=false
        K6_SERVICES_ENABLED=false
        COST_TRACKING_ENABLED=false
      `;
      
      const envFilePath = join(process.cwd(), '.env.test');
      await fs.writeFile(envFilePath, envContent);
      
      try {
        const { success, output } = await startService({}, 10000, '.env.test');
        
        expect(success).toBe(true);
        expect(output).toContain('Health endpoint: http://localhost:8083/health');
        expect(output).toContain('Metrics endpoint: http://localhost:9093/metrics');
      } finally {
        // Clean up
        try {
          await fs.unlink(envFilePath);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });
  });
  
  /**
   * Helper function to start the service with given environment
   */
  async function startService(
    env: Record<string, string>, 
    timeoutMs: number = 15000,
    envFile?: string
  ): Promise<{ success: boolean; output: string }> {
    return new Promise((resolve) => {
      let output = '';
      let resolved = false;
      
      const resolveOnce = (result: { success: boolean; output: string }) => {
        if (!resolved) {
          resolved = true;
          resolve(result);
        }
      };
      
      // Set timeout
      const timeout = setTimeout(() => {
        resolveOnce({ success: false, output: output + '\\n[TIMEOUT]' });
        if (serviceProcess) {
          serviceProcess.kill('SIGKILL');
        }
      }, timeoutMs);
      
      // Prepare environment
      const processEnv = { ...process.env, ...env };
      
      // Start the service
      const args = ['dist/index.js'];
      if (envFile) {
        processEnv.NODE_ENV_FILE = envFile;
      }
      
      serviceProcess = spawn('node', args, {
        env: processEnv,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      serviceProcess.stdout?.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;
        
        // Check for successful startup
        if (chunk.includes('HackLoad Job Service started successfully')) {
          clearTimeout(timeout);
          resolveOnce({ success: true, output });
        }
      });
      
      serviceProcess.stderr?.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;
        
        // Check for configuration errors
        if (chunk.includes('Failed to start HackLoad Job Service') || 
            chunk.includes('is required') ||
            chunk.includes('must be')) {
          clearTimeout(timeout);
          resolveOnce({ success: false, output });
        }
      });
      
      serviceProcess.on('error', (error) => {
        clearTimeout(timeout);
        resolveOnce({ 
          success: false, 
          output: output + `\\n[PROCESS ERROR] ${error.message}` 
        });
      });
      
      serviceProcess.on('exit', (code, signal) => {
        clearTimeout(timeout);
        if (code === 0) {
          resolveOnce({ success: true, output });
        } else {
          resolveOnce({ 
            success: false, 
            output: output + `\\n[EXIT] Code: ${code}, Signal: ${signal}` 
          });
        }
      });
    });
  }
});