/**
 * Unit tests for HubApiClient
 */

import { HubApiClient } from '../../src/lib/api-client';
import { CriteriaUpdate } from '../../src/types/criteria';
import fetch from 'node-fetch';

// Mock fetch
jest.mock('node-fetch');
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

// Mock console methods to avoid test output
const mockConsole = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
};

Object.assign(console, mockConsole);

describe('HubApiClient', () => {
  let client: HubApiClient;
  
  const config = {
    baseUrl: 'https://api.example.com',
    apiKey: 'test-api-key',
    timeout: 5000,
    retries: 2
  };
  
  beforeEach(() => {
    client = new HubApiClient(config);
    jest.clearAllMocks();
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
  });
  
  describe('constructor', () => {
    it('should initialize with provided configuration', () => {
      expect(client).toBeInstanceOf(HubApiClient);
    });
    
    it('should throw error for missing base URL', () => {
      expect(() => {
        new HubApiClient({ ...config, baseUrl: '' });
      }).toThrow('Base URL is required');
    });
    
    it('should throw error for missing API key', () => {
      expect(() => {
        new HubApiClient({ ...config, apiKey: '' });
      }).toThrow('API key is required');
    });
  });
  
  describe('getTeams', () => {
    it('should fetch teams successfully', async () => {
      const mockTeams = [
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
      
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: mockTeams
        })
      } as any);
      
      const teams = await client.getTeams();
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/teams',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': 'test-api-key',
            'User-Agent': 'HackLoad-JobService/1.0'
          },
          signal: expect.any(AbortSignal)
        }
      );
      expect(teams).toEqual(mockTeams);
    });
    
    it('should handle API errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: jest.fn().mockResolvedValue({
          success: false,
          error: 'Database connection failed'
        })
      } as any);
      
      await expect(client.getTeams()).rejects.toThrow('HTTP 500: Database connection failed');
    });
    
    it('should handle network errors with retries', async () => {
      const networkError = new Error('ECONNREFUSED');
      mockFetch.mockRejectedValue(networkError);
      
      await expect(client.getTeams()).rejects.toThrow('ECONNREFUSED');
      
      // Should have made 3 attempts (initial + 2 retries)
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
    
    it('should handle timeout errors', async () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'AbortError';
      mockFetch.mockRejectedValue(timeoutError);
      
      await expect(client.getTeams()).rejects.toThrow('Request timeout');
    });
  });
  
  describe('getTeamEnvironmentData', () => {
    it('should fetch team environment data successfully', async () => {
      const mockEnvData = {
        REPOSITORY_URL: 'https://github.com/team/repo',
        APPLICATION_URL: 'https://team.example.com',
        DATABASE_URL: 'postgresql://...'
      };
      
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: mockEnvData
        })
      } as any);
      
      const envData = await client.getTeamEnvironmentData('team1', 'hackathon1');
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/teams/team1/environment?hackathonId=hackathon1',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': 'test-api-key',
            'User-Agent': 'HackLoad-JobService/1.0'
          },
          signal: expect.any(AbortSignal)
        }
      );
      expect(envData).toEqual(mockEnvData);
    });
    
    it('should handle missing team data', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: jest.fn().mockResolvedValue({
          success: false,
          error: 'Team not found'
        })
      } as any);
      
      await expect(client.getTeamEnvironmentData('nonexistent', 'hackathon1'))
        .rejects
        .toThrow('HTTP 404: Team not found');
    });
  });
  
  describe('bulkUpdateCriteria', () => {
    const mockUpdates: CriteriaUpdate[] = [
      {
        teamSlug: 'team1',
        hackathonId: 'hackathon1',
        criteriaType: 'GIT_ACTIVITY',
        status: 'PASSED',
        score: 85,
        metrics: { commits: 10 },
        updatedBy: 'GitMonitorService'
      },
      {
        teamSlug: 'team2',
        hackathonId: 'hackathon1',
        criteriaType: 'DEPLOYMENT_STATUS',
        status: 'FAILED',
        score: 0,
        metrics: { isAccessible: false },
        updatedBy: 'DeploymentMonitorService'
      }
    ];
    
    it('should send bulk updates successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          processed: 2,
          failed: 0,
          errors: []
        }
      };
      
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockResponse)
      } as any);
      
      const response = await client.bulkUpdateCriteria(mockUpdates);
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/criteria/bulk-update',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': 'test-api-key',
            'User-Agent': 'HackLoad-JobService/1.0'
          },
          body: JSON.stringify({ updates: mockUpdates }),
          signal: expect.any(AbortSignal)
        }
      );
      expect(response).toEqual(mockResponse);
    });
    
    it('should handle partial failures', async () => {
      const mockResponse = {
        success: true,
        data: {
          processed: 1,
          failed: 1,
          errors: ['Team team2 not found']
        }
      };
      
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockResponse)
      } as any);
      
      const response = await client.bulkUpdateCriteria(mockUpdates);
      
      expect(response).toEqual(mockResponse);
      expect(response.data?.failed).toBe(1);
      expect(response.data?.errors).toContain('Team team2 not found');
    });
    
    it('should handle empty updates array', async () => {
      const response = await client.bulkUpdateCriteria([]);
      
      expect(response).toEqual({
        success: true,
        data: { processed: 0, failed: 0, errors: [] }
      });
      expect(mockFetch).not.toHaveBeenCalled();
    });
    
    it('should handle validation errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: jest.fn().mockResolvedValue({
          success: false,
          error: 'Invalid criteria type'
        })
      } as any);
      
      await expect(client.bulkUpdateCriteria(mockUpdates))
        .rejects
        .toThrow('HTTP 400: Invalid criteria type');
    });
  });
  
  describe('error handling and retries', () => {
    beforeEach(() => {
      // Mock setTimeout for testing retry delays
      jest.useFakeTimers();
    });
    
    afterEach(() => {
      jest.useRealTimers();
    });
    
    it('should retry on network errors', async () => {
      const networkError = new Error('ECONNREFUSED');
      
      // Fail first two attempts, succeed on third
      mockFetch
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue({
            success: true,
            data: []
          })
        } as any);
      
      const promise = client.getTeams();
      
      // Fast-forward through retry delays
      jest.advanceTimersByTime(1000);
      jest.advanceTimersByTime(2000);
      
      const result = await promise;
      
      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(result).toEqual([]);
    });
    
    it('should not retry on client errors (4xx)', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: jest.fn().mockResolvedValue({
          success: false,
          error: 'Invalid API key'
        })
      } as any);
      
      await expect(client.getTeams()).rejects.toThrow('HTTP 401: Invalid API key');
      
      // Should only make one attempt
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
    
    it('should retry on server errors (5xx)', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        json: jest.fn().mockResolvedValue({
          success: false,
          error: 'Service temporarily unavailable'
        })
      } as any);
      
      const promise = client.getTeams();
      
      // Fast-forward through all retry attempts
      jest.advanceTimersByTime(10000);
      
      await expect(promise).rejects.toThrow('HTTP 503: Service temporarily unavailable');
      
      // Should have made 3 attempts (initial + 2 retries)
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });
  
  describe('request timeout', () => {
    it('should abort requests that exceed timeout', async () => {
      // Mock a request that never resolves
      mockFetch.mockImplementation(() => new Promise(() => {}));
      
      const promise = client.getTeams();
      
      // Fast-forward past the timeout
      jest.advanceTimersByTime(6000);
      
      await expect(promise).rejects.toThrow();
    });
  });
});