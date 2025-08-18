/**
 * Unit tests for DeploymentMonitorService
 */

import { DeploymentMonitorService } from '../../src/services/deployment-monitor';
import { HubApiClient } from '../../src/lib/api-client';
import { CriteriaStatus, Team } from '../../src/types/criteria';
import fetch from 'node-fetch';

// Mock fetch
jest.mock('node-fetch');
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

// Mock HubApiClient
jest.mock('../../src/lib/api-client');

describe('DeploymentMonitorService', () => {
  let service: DeploymentMonitorService;
  let mockApiClient: jest.Mocked<HubApiClient>;
  
  const config = {
    httpTimeout: 10000,
    userAgent: 'HackLoad-Monitor/1.0'
  };
  
  const mockTeam: Team = {
    id: '1',
    nickname: 'team1',
    hackathonId: 'hackathon1',
    name: 'Team 1',
    members: []
  };
  
  beforeEach(() => {
    service = new DeploymentMonitorService(config);
    
    // Mock API client
    mockApiClient = {
      getTeams: jest.fn(),
      getTeamEnvironmentData: jest.fn(),
      bulkUpdateCriteria: jest.fn(),
    } as any;
    
    service.setApiClient(mockApiClient);
    
    // Mock console methods
    jest.spyOn(console, 'debug').mockImplementation();
    jest.spyOn(console, 'info').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
  });
  
  describe('constructor', () => {
    it('should initialize with correct criteria type and service name', () => {
      expect(service.criteriaType).toBe('DEPLOYMENT_STATUS');
      expect(service.serviceName).toBe('DeploymentMonitorService');
    });
  });
  
  describe('collectMetrics', () => {
    beforeEach(() => {
      mockApiClient.getTeamEnvironmentData.mockResolvedValue({
        APPLICATION_URL: 'https://team1.example.com'
      });
    });
    
    it('should collect metrics for successful deployment', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: {
          get: jest.fn().mockReturnValue('application/json')
        }
      };
      
      mockFetch.mockResolvedValue(mockResponse as any);
      
      const startTime = Date.now();
      const metrics = await service.collectMetrics(mockTeam);
      const endTime = Date.now();
      
      expect(mockApiClient.getTeamEnvironmentData).toHaveBeenCalledWith('1', 'hackathon1');
      expect(mockFetch).toHaveBeenCalledWith('https://team1.example.com', {
        method: 'GET',
        headers: {
          'User-Agent': 'HackLoad-Monitor/1.0'
        },
        signal: expect.any(AbortSignal)
      });
      
      expect(metrics).toEqual({
        applicationUrl: 'https://team1.example.com',
        isAccessible: true,
        httpStatus: 200,
        responseTime: expect.any(Number),
        lastChecked: expect.any(String),
        contentType: 'application/json',
        hasCustomDomain: false,
        usesHttps: true,
        errorMessage: null
      });
      
      expect(metrics.responseTime).toBeGreaterThanOrEqual(0);
      expect(metrics.responseTime).toBeLessThan(endTime - startTime + 100); // Allow some margin
      expect(new Date(metrics.lastChecked!)).toBeInstanceOf(Date);
    });
    
    it('should handle team without application URL', async () => {
      mockApiClient.getTeamEnvironmentData.mockResolvedValue({});
      
      const metrics = await service.collectMetrics(mockTeam);
      
      expect(metrics).toEqual({
        applicationUrl: null,
        isAccessible: false,
        httpStatus: 0,
        responseTime: 0,
        lastChecked: expect.any(String),
        contentType: null,
        hasCustomDomain: false,
        usesHttps: false,
        errorMessage: 'No application URL configured'
      });
    });
    
    it('should handle HTTP errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: {
          get: jest.fn().mockReturnValue(null)
        }
      } as any);
      
      const metrics = await service.collectMetrics(mockTeam);
      
      expect(metrics).toEqual({
        applicationUrl: 'https://team1.example.com',
        isAccessible: false,
        httpStatus: 404,
        responseTime: expect.any(Number),
        lastChecked: expect.any(String),
        contentType: null,
        hasCustomDomain: false,
        usesHttps: true,
        errorMessage: 'HTTP 404: Not Found'
      });
    });
    
    it('should handle network errors', async () => {
      const networkError = new Error('ECONNREFUSED');
      mockFetch.mockRejectedValue(networkError);
      
      const metrics = await service.collectMetrics(mockTeam);
      
      expect(metrics).toEqual({
        applicationUrl: 'https://team1.example.com',
        isAccessible: false,
        httpStatus: 0,
        responseTime: 0,
        lastChecked: expect.any(String),
        contentType: null,
        hasCustomDomain: false,
        usesHttps: true,
        errorMessage: 'ECONNREFUSED'
      });
    });
    
    it('should handle timeout errors', async () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'AbortError';
      mockFetch.mockRejectedValue(timeoutError);
      
      const metrics = await service.collectMetrics(mockTeam);
      
      expect(metrics.errorMessage).toBe('Request timeout');
      expect(metrics.isAccessible).toBe(false);
    });
    
    it('should detect custom domains', async () => {
      mockApiClient.getTeamEnvironmentData.mockResolvedValue({
        APPLICATION_URL: 'https://team1-app.com'
      });
      
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: {
          get: jest.fn().mockReturnValue('text/html')
        }
      } as any);
      
      const metrics = await service.collectMetrics(mockTeam);
      
      expect(metrics.hasCustomDomain).toBe(true);
    });
    
    it('should detect HTTP vs HTTPS', async () => {
      mockApiClient.getTeamEnvironmentData.mockResolvedValue({
        APPLICATION_URL: 'http://team1.example.com'
      });
      
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: {
          get: jest.fn().mockReturnValue('text/html')
        }
      } as any);
      
      const metrics = await service.collectMetrics(mockTeam);
      
      expect(metrics.usesHttps).toBe(false);
    });
  });
  
  describe('evaluateStatus', () => {
    it('should return PASSED for accessible application', () => {
      const metrics = {
        isAccessible: true,
        httpStatus: 200,
        responseTime: 500
      };
      
      const status = service.evaluateStatus(metrics);
      expect(status).toBe(CriteriaStatus.PASSED);
    });
    
    it('should return FAILED for inaccessible application', () => {
      const metrics = {
        isAccessible: false,
        httpStatus: 404,
        responseTime: 0
      };
      
      const status = service.evaluateStatus(metrics);
      expect(status).toBe(CriteriaStatus.FAILED);
    });
    
    it('should return NO_DATA when no URL configured', () => {
      const metrics = {
        applicationUrl: null,
        isAccessible: false,
        httpStatus: 0,
        responseTime: 0
      };
      
      const status = service.evaluateStatus(metrics);
      expect(status).toBe(CriteriaStatus.NO_DATA);
    });
  });
  
  describe('calculateScore', () => {
    it('should return high score for fast, accessible application with HTTPS', () => {
      const metrics = {
        isAccessible: true,
        httpStatus: 200,
        responseTime: 300,
        usesHttps: true,
        hasCustomDomain: true
      };
      
      const score = service.calculateScore(CriteriaStatus.PASSED, metrics);
      expect(score).toBeGreaterThan(90);
      expect(score).toBeLessThanOrEqual(100);
    });
    
    it('should return lower score for slow application', () => {
      const metrics = {
        isAccessible: true,
        httpStatus: 200,
        responseTime: 8000,
        usesHttps: false,
        hasCustomDomain: false
      };
      
      const score = service.calculateScore(CriteriaStatus.PASSED, metrics);
      expect(score).toBeGreaterThan(50);
      expect(score).toBeLessThan(90);
    });
    
    it('should return medium score for accessible but slow application', () => {
      const metrics = {
        isAccessible: true,
        httpStatus: 200,
        responseTime: 3000,
        usesHttps: true,
        hasCustomDomain: false
      };
      
      const score = service.calculateScore(CriteriaStatus.PASSED, metrics);
      expect(score).toBeGreaterThan(70);
      expect(score).toBeLessThan(90);
    });
    
    it('should return 0 for FAILED status', () => {
      const metrics = { isAccessible: false };
      const score = service.calculateScore(CriteriaStatus.FAILED, metrics);
      expect(score).toBe(0);
    });
    
    it('should return 0 for NO_DATA status', () => {
      const metrics = {};
      const score = service.calculateScore(CriteriaStatus.NO_DATA, metrics);
      expect(score).toBe(0);
    });
  });
  
  describe('isCustomDomain', () => {
    it('should return false for localhost URLs', () => {
      const result = (service as any).isCustomDomain('http://localhost:3000');
      expect(result).toBe(false);
    });
    
    it('should return false for common hosting domains', () => {
      expect((service as any).isCustomDomain('https://app.herokuapp.com')).toBe(false);
      expect((service as any).isCustomDomain('https://app.netlify.app')).toBe(false);
      expect((service as any).isCustomDomain('https://app.vercel.app')).toBe(false);
      expect((service as any).isCustomDomain('https://app.railway.app')).toBe(false);
    });
    
    it('should return true for custom domains', () => {
      expect((service as any).isCustomDomain('https://myapp.com')).toBe(true);
      expect((service as any).isCustomDomain('https://team1.hackload.kz')).toBe(true);
      expect((service as any).isCustomDomain('https://api.mycompany.co')).toBe(true);
    });
    
    it('should handle invalid URLs gracefully', () => {
      const result = (service as any).isCustomDomain('invalid-url');
      expect(result).toBe(false);
    });
  });
});