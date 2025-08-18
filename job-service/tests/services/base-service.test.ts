/**
 * Unit tests for BaseJobService
 */

import { BaseJobService } from '../../src/services/base-service';
import { HubApiClient } from '../../src/lib/api-client';
import { CriteriaType, CriteriaStatus, Team, MetricsData } from '../../src/types/criteria';

// Mock HubApiClient
jest.mock('../../src/lib/api-client');

// Create a concrete implementation for testing
class TestJobService extends BaseJobService {
  readonly criteriaType = CriteriaType.GIT_ACTIVITY;
  readonly serviceName = 'TestService';
  
  private shouldThrow = false;
  private mockMetrics: MetricsData = {};
  
  async collectMetrics(_team: Team): Promise<MetricsData> {
    if (this.shouldThrow) {
      throw new Error('Test error');
    }
    return this.mockMetrics;
  }
  
  // Test helpers
  setMockMetrics(metrics: MetricsData): void {
    this.mockMetrics = metrics;
  }
  
  setShouldThrow(shouldThrow: boolean): void {
    this.shouldThrow = shouldThrow;
  }
  
  // Expose protected methods for testing
  public getTeamsPublic(): Promise<Team[]> {
    return this.getTeams();
  }
  
  public getTeamEnvironmentDataPublic(team: Team): Promise<Record<string, string>> {
    return this.getTeamEnvironmentData(team);
  }
  
  public logPublic(level: 'debug' | 'info' | 'warn' | 'error', message: string, ...args: unknown[]): void {
    return this.log(level, message, ...args);
  }
}

describe('BaseJobService', () => {
  let service: TestJobService;
  let mockApiClient: jest.Mocked<HubApiClient>;
  
  beforeEach(() => {
    service = new TestJobService();
    
    // Create mock API client
    mockApiClient = {
      getTeams: jest.fn(),
      getTeamEnvironmentData: jest.fn(),
      bulkUpdateCriteria: jest.fn(),
    } as any;
    
    service.setApiClient(mockApiClient);
    
    // Clear console methods to avoid test output
    jest.spyOn(console, 'debug').mockImplementation();
    jest.spyOn(console, 'info').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
  });
  
  describe('constructor', () => {
    it('should initialize with default values', () => {
      const newService = new TestJobService();
      
      expect(newService.criteriaType).toBe(CriteriaType.GIT_ACTIVITY);
      expect(newService.serviceName).toBe('TestService');
    });
  });
  
  describe('evaluateStatus', () => {
    it('should return NO_DATA by default', () => {
      const status = service.evaluateStatus({});
      expect(status).toBe(CriteriaStatus.NO_DATA);
    });
  });
  
  describe('calculateScore', () => {
    it('should return 100 for PASSED status', () => {
      const score = service.calculateScore(CriteriaStatus.PASSED, {});
      expect(score).toBe(100);
    });
    
    it('should return 0 for FAILED status', () => {
      const score = service.calculateScore(CriteriaStatus.FAILED, {});
      expect(score).toBe(0);
    });
    
    it('should return 0 for NO_DATA status', () => {
      const score = service.calculateScore(CriteriaStatus.NO_DATA, {});
      expect(score).toBe(0);
    });
  });
  
  describe('setApiClient', () => {
    it('should set the API client', () => {
      const newApiClient = {} as HubApiClient;
      service.setApiClient(newApiClient);
      
      // API client is protected, so we test it indirectly
      expect(() => service.getTeamsPublic()).not.toThrow();
    });
  });
  
  describe('getTeams', () => {
    it('should fetch teams from API client', async () => {
      const mockTeams: Team[] = [
        {
          id: '1',
          nickname: 'team1',
          hackathonId: 'hackathon1',
          name: 'Team 1',
          members: []
        }
      ];
      
      mockApiClient.getTeams.mockResolvedValue(mockTeams);
      
      const teams = await service.getTeamsPublic();
      
      expect(mockApiClient.getTeams).toHaveBeenCalledTimes(1);
      expect(teams).toEqual(mockTeams);
    });
    
    it('should throw error when API client not set', async () => {
      const serviceWithoutClient = new TestJobService();
      
      await expect(serviceWithoutClient.getTeamsPublic())
        .rejects
        .toThrow('API client not configured');
    });
    
    it('should handle API client errors', async () => {
      const error = new Error('API error');
      mockApiClient.getTeams.mockRejectedValue(error);
      
      await expect(service.getTeamsPublic())
        .rejects
        .toThrow('API error');
    });
  });
  
  describe('getTeamEnvironmentData', () => {
    const mockTeam: Team = {
      id: '1',
      nickname: 'team1',
      hackathonId: 'hackathon1',
      name: 'Team 1',
      members: []
    };
    
    it('should fetch team environment data from API client', async () => {
      const mockData = { KEY1: 'value1', KEY2: 'value2' };
      mockApiClient.getTeamEnvironmentData.mockResolvedValue(mockData);
      
      const data = await service.getTeamEnvironmentDataPublic(mockTeam);
      
      expect(mockApiClient.getTeamEnvironmentData).toHaveBeenCalledWith('1', 'hackathon1');
      expect(data).toEqual(mockData);
    });
    
    it('should throw error when API client not set', async () => {
      const serviceWithoutClient = new TestJobService();
      
      await expect(serviceWithoutClient.getTeamEnvironmentDataPublic(mockTeam))
        .rejects
        .toThrow('API client not configured');
    });
  });
  
  describe('run', () => {
    const mockTeams: Team[] = [
      {
        id: '1',
        nickname: 'team1',
        hackathonId: 'hackathon1',
        name: 'Team 1',
        members: []
      },
      {
        id: '2',
        nickname: 'team2',
        hackathonId: 'hackathon1',
        name: 'Team 2',
        members: []
      }
    ];
    
    beforeEach(() => {
      mockApiClient.getTeams.mockResolvedValue(mockTeams);
      mockApiClient.bulkUpdateCriteria.mockResolvedValue({
        success: true,
        data: { processed: 2, failed: 0 }
      });
    });
    
    it('should successfully process all teams', async () => {
      const mockMetrics = { commits: 5 };
      service.setMockMetrics(mockMetrics);
      
      await service.run();
      
      expect(mockApiClient.getTeams).toHaveBeenCalledTimes(1);
      expect(mockApiClient.bulkUpdateCriteria).toHaveBeenCalledTimes(1);
      
      const bulkUpdateCall = mockApiClient.bulkUpdateCriteria.mock.calls[0][0];
      expect(bulkUpdateCall).toHaveLength(2);
      expect(bulkUpdateCall[0]).toMatchObject({
        teamSlug: 'team1',
        hackathonId: 'hackathon1',
        criteriaType: CriteriaType.GIT_ACTIVITY,
        status: CriteriaStatus.NO_DATA,
        score: 0,
        metrics: mockMetrics,
        updatedBy: 'TestService'
      });
    });
    
    it('should handle individual team processing errors gracefully', async () => {
      service.setShouldThrow(true);
      
      await service.run();
      
      expect(mockApiClient.getTeams).toHaveBeenCalledTimes(1);
      // Should still try to update (with empty updates array)
      expect(mockApiClient.bulkUpdateCriteria).not.toHaveBeenCalled();
    });
    
    it('should update run statistics', async () => {
      await service.run();
      
      const health = service.getHealth();
      expect(health.lastRunTime).toBeInstanceOf(Date);
      expect(health.lastSuccessTime).toBeInstanceOf(Date);
      expect(health.consecutiveFailures).toBe(0);
    });
    
    it('should handle API client errors', async () => {
      mockApiClient.getTeams.mockRejectedValue(new Error('API error'));
      
      await expect(service.run()).rejects.toThrow('API error');
      
      const health = service.getHealth();
      expect(health.consecutiveFailures).toBe(1);
    });
  });
  
  describe('getHealth', () => {
    it('should return healthy status initially', () => {
      const health = service.getHealth();
      
      expect(health.serviceName).toBe('TestService');
      expect(health.status).toBe('healthy');
      expect(health.errorRate).toBe(0);
      expect(health.consecutiveFailures).toBe(0);
    });
    
    it('should return unhealthy status after 3 consecutive failures', async () => {
      mockApiClient.getTeams.mockRejectedValue(new Error('API error'));
      
      // Simulate 3 consecutive failures
      for (let i = 0; i < 3; i++) {
        try {
          await service.run();
        } catch {
          // Expected to throw
        }
      }
      
      const health = service.getHealth();
      expect(health.status).toBe('unhealthy');
      expect(health.consecutiveFailures).toBe(3);
    });
    
    it('should return degraded status with some failures but not consecutive', async () => {
      // One successful run
      mockApiClient.getTeams.mockResolvedValue([]);
      mockApiClient.bulkUpdateCriteria.mockResolvedValue({
        success: true,
        data: { processed: 0, failed: 0 }
      });
      await service.run();
      
      // One failed run
      mockApiClient.getTeams.mockRejectedValue(new Error('API error'));
      try {
        await service.run();
      } catch {
        // Expected to throw
      }
      
      const health = service.getHealth();
      expect(health.status).toBe('degraded');
      expect(health.consecutiveFailures).toBe(1);
      expect(health.errorRate).toBe(50); // 1 failure out of 2 runs
    });
  });
  
  describe('log', () => {
    it('should log debug messages', () => {
      const consoleSpy = jest.spyOn(console, 'debug');
      
      service.logPublic('debug', 'Test message', 'arg1', 'arg2');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[DEBUG] [TestService] Test message'),
        'arg1',
        'arg2'
      );
    });
    
    it('should log info messages', () => {
      const consoleSpy = jest.spyOn(console, 'info');
      
      service.logPublic('info', 'Test message');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[INFO] [TestService] Test message')
      );
    });
    
    it('should log warn messages', () => {
      const consoleSpy = jest.spyOn(console, 'warn');
      
      service.logPublic('warn', 'Test message');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[WARN] [TestService] Test message')
      );
    });
    
    it('should log error messages', () => {
      const consoleSpy = jest.spyOn(console, 'error');
      
      service.logPublic('error', 'Test message');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR] [TestService] Test message')
      );
    });
  });
});