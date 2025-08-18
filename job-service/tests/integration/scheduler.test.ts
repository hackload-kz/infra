/**
 * Integration tests for JobScheduler
 * Tests the job scheduling system with real service instances
 */

import { JobScheduler } from '../../src/scheduler';
import { BaseJobService } from '../../src/services/base-service';
import { CriteriaType, CriteriaStatus, Team, MetricsData } from '../../src/types/criteria';
import { HubApiClient } from '../../src/lib/api-client';

// Mock HubApiClient
jest.mock('../../src/lib/api-client');

// Test service implementation
class TestIntegrationService extends BaseJobService {
  readonly criteriaType = CriteriaType.CODE_REPO;
  readonly serviceName = 'TestIntegrationService';
  
  private collectMetricsImpl: (team: Team) => Promise<MetricsData> = async () => ({});
  private evaluateStatusImpl: (metrics: MetricsData) => CriteriaStatus = () => CriteriaStatus.PASSED;
  
  async collectMetrics(team: Team): Promise<MetricsData> {
    return this.collectMetricsImpl(team);
  }
  
  evaluateStatus(metrics: MetricsData): CriteriaStatus {
    return this.evaluateStatusImpl(metrics);
  }
  
  // Test helpers
  setCollectMetrics(fn: (team: Team) => Promise<MetricsData>): void {
    this.collectMetricsImpl = fn;
  }
  
  setEvaluateStatus(fn: (metrics: MetricsData) => CriteriaStatus): void {
    this.evaluateStatusImpl = fn;
  }
}

describe('JobScheduler Integration Tests', () => {
  let scheduler: JobScheduler;
  let testService: TestIntegrationService;
  let mockApiClient: jest.Mocked<HubApiClient>;
  
  const mockTeams: Team[] = [
    {
      id: '1',
      nickname: 'team1',
      hackathonId: 'hackathon1',
      name: 'Team 1'
    },
    {
      id: '2', 
      nickname: 'team2',
      hackathonId: 'hackathon1',
      name: 'Team 2'
    }
  ];
  
  beforeEach(() => {
    scheduler = new JobScheduler();
    testService = new TestIntegrationService();
    
    // Mock API client
    mockApiClient = {
      getTeams: jest.fn(),
      getTeamEnvironmentData: jest.fn(),
      bulkUpdateCriteria: jest.fn(),
    } as any;
    
    testService.setApiClient(mockApiClient);
    
    // Default mocks
    mockApiClient.getTeams.mockResolvedValue(mockTeams);
    mockApiClient.bulkUpdateCriteria.mockResolvedValue({
      success: true,
      data: { processed: 2, failed: 0 }
    });
    
    // Mock console methods
    jest.spyOn(console, 'debug').mockImplementation();
    jest.spyOn(console, 'info').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
    
    // Mock timers for faster testing
    jest.useFakeTimers();
  });
  
  afterEach(async () => {
    if (scheduler) {
      await scheduler.stop();
    }
    jest.useRealTimers();
    jest.restoreAllMocks();
  });
  
  describe('Service Registration and Execution', () => {
    it('should register service and execute on schedule', async () => {
      const metrics = { testData: 'success' };
      testService.setCollectMetrics(async () => metrics);
      
      const config = {
        enabled: true,
        interval: '* * * * * *', // Every second for testing
        timeout: 5000,
        retries: 1
      };
      
      scheduler.registerService(testService, config);
      await scheduler.start();
      
      // Fast-forward 1 second to trigger the job
      jest.advanceTimersByTime(1000);
      
      // Allow promises to resolve
      await new Promise(resolve => setImmediate(resolve));
      
      expect(mockApiClient.getTeams).toHaveBeenCalled();
      expect(mockApiClient.bulkUpdateCriteria).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            teamSlug: 'team1',
            criteriaType: CriteriaType.CODE_REPO,
            status: CriteriaStatus.PASSED,
            metrics,
            updatedBy: 'TestIntegrationService'
          }),
          expect.objectContaining({
            teamSlug: 'team2',
            criteriaType: CriteriaType.CODE_REPO,
            status: CriteriaStatus.PASSED,
            metrics,
            updatedBy: 'TestIntegrationService'
          })
        ])
      );
    });
    
    it('should handle service execution failures with retries', async () => {
      let attemptCount = 0;
      testService.setCollectMetrics(async () => {
        attemptCount++;
        if (attemptCount <= 2) {
          throw new Error('Service temporarily unavailable');
        }
        return { success: true };
      });
      
      const config = {
        enabled: true,
        interval: '* * * * * *',
        timeout: 5000,
        retries: 3
      };
      
      scheduler.registerService(testService, config);
      await scheduler.start();
      
      // Trigger job execution
      jest.advanceTimersByTime(1000);
      
      // Wait for retries to complete
      await new Promise(resolve => setImmediate(resolve));
      jest.advanceTimersByTime(2000); // First retry after 1s
      await new Promise(resolve => setImmediate(resolve));
      jest.advanceTimersByTime(4000); // Second retry after 2s
      await new Promise(resolve => setImmediate(resolve));
      
      // Should have succeeded on third attempt
      expect(mockApiClient.bulkUpdateCriteria).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            metrics: { success: true }
          })
        ])
      );
    });
    
    it('should handle individual team processing failures gracefully', async () => {
      testService.setCollectMetrics(async (team) => {
        if (team.id === '1') {
          throw new Error('Team 1 processing failed');
        }
        return { processed: true };
      });
      
      const config = {
        enabled: true,
        interval: '* * * * * *',
        timeout: 5000,
        retries: 1
      };
      
      scheduler.registerService(testService, config);
      await scheduler.start();
      
      jest.advanceTimersByTime(1000);
      await new Promise(resolve => setImmediate(resolve));
      
      // Should still process team2 successfully
      expect(mockApiClient.bulkUpdateCriteria).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            teamSlug: 'team2',
            metrics: { processed: true }
          })
        ])
      );
      
      // Should only have one update (team2)
      const call = mockApiClient.bulkUpdateCriteria.mock.calls[0];
      expect(call[0]).toHaveLength(1);
    });
  });
  
  describe('Multiple Services', () => {
    it('should handle multiple services with different schedules', async () => {
      const service1 = new TestIntegrationService();
      const service2 = new TestIntegrationService();
      
      // Override service names for differentiation
      (service1 as any).serviceName = 'Service1';
      (service2 as any).serviceName = 'Service2';
      
      service1.setApiClient(mockApiClient);
      service2.setApiClient(mockApiClient);
      
      service1.setCollectMetrics(async () => ({ service: 'service1' }));
      service2.setCollectMetrics(async () => ({ service: 'service2' }));
      
      const config1 = {
        enabled: true,
        interval: '* * * * * *', // Every second
        timeout: 5000,
        retries: 1
      };
      
      const config2 = {
        enabled: true,
        interval: '*/2 * * * * *', // Every 2 seconds
        timeout: 5000,
        retries: 1
      };
      
      scheduler.registerService(service1, config1);
      scheduler.registerService(service2, config2);
      await scheduler.start();
      
      // After 1 second, only service1 should have run
      jest.advanceTimersByTime(1000);
      await new Promise(resolve => setImmediate(resolve));
      
      expect(mockApiClient.bulkUpdateCriteria).toHaveBeenCalledTimes(1);
      expect(mockApiClient.bulkUpdateCriteria).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            updatedBy: 'Service1',
            metrics: { service: 'service1' }
          })
        ])
      );
      
      // After another second (2 total), service2 should also run
      mockApiClient.bulkUpdateCriteria.mockClear();
      jest.advanceTimersByTime(1000);
      await new Promise(resolve => setImmediate(resolve));
      
      expect(mockApiClient.bulkUpdateCriteria).toHaveBeenCalledTimes(2); // Both services
    });
  });
  
  describe('Service Health Monitoring', () => {
    it('should track service health correctly', async () => {
      let shouldFail = false;
      testService.setCollectMetrics(async () => {
        if (shouldFail) {
          throw new Error('Service failure');
        }
        return { status: 'healthy' };
      });
      
      const config = {
        enabled: true,
        interval: '* * * * * *',
        timeout: 5000,
        retries: 1
      };
      
      scheduler.registerService(testService, config);
      await scheduler.start();
      
      // Initial healthy run
      jest.advanceTimersByTime(1000);
      await new Promise(resolve => setImmediate(resolve));
      
      let health = testService.getHealth();
      expect(health.status).toBe('healthy');
      expect(health.errorRate).toBe(0);
      
      // Cause a failure
      shouldFail = true;
      jest.advanceTimersByTime(1000);
      await new Promise(resolve => setImmediate(resolve));
      
      health = testService.getHealth();
      expect(health.status).toBe('degraded');
      expect(health.errorRate).toBe(50); // 1 failure out of 2 runs
      
      // Multiple consecutive failures should mark as unhealthy
      jest.advanceTimersByTime(1000);
      await new Promise(resolve => setImmediate(resolve));
      jest.advanceTimersByTime(1000);
      await new Promise(resolve => setImmediate(resolve));
      
      health = testService.getHealth();
      expect(health.status).toBe('unhealthy');
      expect(health.consecutiveFailures).toBe(3);
    });
    
    it('should provide service health status through scheduler', async () => {
      const config = {
        enabled: true,
        interval: '* * * * * *',
        timeout: 5000,
        retries: 1
      };
      
      scheduler.registerService(testService, config);
      await scheduler.start();
      
      // Run once to initialize health data
      jest.advanceTimersByTime(1000);
      await new Promise(resolve => setImmediate(resolve));
      
      const serviceHealths = scheduler.getServiceHealths();
      expect(serviceHealths).toHaveLength(1);
      expect(serviceHealths[0]).toMatchObject({
        serviceName: 'TestIntegrationService',
        status: 'healthy',
        errorRate: 0
      });
    });
  });
  
  describe('Scheduler Lifecycle', () => {
    it('should start and stop gracefully', async () => {
      const config = {
        enabled: true,
        interval: '* * * * * *',
        timeout: 5000,
        retries: 1
      };
      
      scheduler.registerService(testService, config);
      
      // Should be able to start
      await scheduler.start();
      expect(scheduler.isRunning()).toBe(true);
      
      // Should be able to stop
      await scheduler.stop();
      expect(scheduler.isRunning()).toBe(false);
      
      // Jobs should not execute after stop
      mockApiClient.bulkUpdateCriteria.mockClear();
      jest.advanceTimersByTime(5000);
      await new Promise(resolve => setImmediate(resolve));
      
      expect(mockApiClient.bulkUpdateCriteria).not.toHaveBeenCalled();
    });
    
    it('should handle starting already started scheduler', async () => {
      const config = {
        enabled: true,
        interval: '* * * * * *',
        timeout: 5000,
        retries: 1
      };
      
      scheduler.registerService(testService, config);
      await scheduler.start();
      
      // Starting again should not cause issues
      await expect(scheduler.start()).resolves.not.toThrow();
      expect(scheduler.isRunning()).toBe(true);
    });
    
    it('should handle stopping already stopped scheduler', async () => {
      // Stopping without starting should not cause issues
      await expect(scheduler.stop()).resolves.not.toThrow();
      expect(scheduler.isRunning()).toBe(false);
    });
  });
  
  describe('Service Configuration', () => {
    it('should not execute disabled services', async () => {
      testService.setCollectMetrics(async () => ({ executed: true }));
      
      const config = {
        enabled: false, // Disabled
        interval: '* * * * * *',
        timeout: 5000,
        retries: 1
      };
      
      scheduler.registerService(testService, config);
      await scheduler.start();
      
      jest.advanceTimersByTime(5000);
      await new Promise(resolve => setImmediate(resolve));
      
      // Should not have executed
      expect(mockApiClient.bulkUpdateCriteria).not.toHaveBeenCalled();
    });
    
    it('should handle service timeouts', async () => {
      testService.setCollectMetrics(async () => {
        // Simulate slow service
        return new Promise(resolve => {
          setTimeout(() => resolve({ slow: true }), 10000);
        });
      });
      
      const config = {
        enabled: true,
        interval: '* * * * * *',
        timeout: 1000, // 1 second timeout
        retries: 1
      };
      
      scheduler.registerService(testService, config);
      await scheduler.start();
      
      jest.advanceTimersByTime(1000);
      await new Promise(resolve => setImmediate(resolve));
      
      // Fast-forward past timeout
      jest.advanceTimersByTime(2000);
      await new Promise(resolve => setImmediate(resolve));
      
      // Service should have been considered failed due to timeout
      const health = testService.getHealth();
      expect(health.consecutiveFailures).toBeGreaterThan(0);
    });
  });
});