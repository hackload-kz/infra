/**
 * Unit tests for GitMonitorService
 */

import { GitMonitorService } from '../../src/services/git-monitor';
import { HubApiClient } from '../../src/lib/api-client';
import { GitHubClient } from '../../src/lib/github-client';
import { CriteriaStatus, Team } from '../../src/types/criteria';

// Mock dependencies
jest.mock('../../src/lib/api-client');
jest.mock('../../src/lib/github-client');

describe('GitMonitorService', () => {
  let service: GitMonitorService;
  let mockApiClient: jest.Mocked<HubApiClient>;
  let mockGitHubClient: jest.Mocked<GitHubClient>;
  
  const githubConfig = {
    apiUrl: 'https://api.github.com',
    token: 'test-token',
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
    service = new GitMonitorService(githubConfig);
    
    // Mock API client
    mockApiClient = {
      getTeams: jest.fn(),
      getTeamEnvironmentData: jest.fn(),
      bulkUpdateCriteria: jest.fn(),
    } as any;
    
    service.setApiClient(mockApiClient);
    
    // Mock GitHub client
    mockGitHubClient = {
      getRepositoryInfo: jest.fn(),
      getCommitsInTimeRange: jest.fn(),
      getRecentCommits: jest.fn(),
      isHealthy: jest.fn(),
    } as any;
    
    // Replace the internal GitHub client with our mock
    (service as any).githubClient = mockGitHubClient;
    
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
      expect(service.criteriaType).toBe('GIT_ACTIVITY');
      expect(service.serviceName).toBe('GitMonitorService');
    });
  });
  
  describe('collectMetrics', () => {
    beforeEach(() => {
      mockApiClient.getTeamEnvironmentData.mockResolvedValue({
        REPOSITORY_URL: 'https://github.com/owner/repo'
      });
    });
    
    it('should collect metrics for team with repository', async () => {
      const mockRepoInfo = {
        name: 'repo',
        fullName: 'owner/repo',
        private: false,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-12-01'),
        size: 1000,
        language: 'TypeScript',
        topics: ['hackathon', 'web'],
        hasReadme: true,
        hasLicense: true,
        openIssues: 5,
        watchers: 10,
        forks: 2,
        stars: 15
      };
      
      const mockCommits = [
        {
          sha: 'abc123',
          message: 'Initial commit',
          author: 'user1',
          date: new Date('2023-12-01'),
          url: 'https://github.com/owner/repo/commit/abc123'
        },
        {
          sha: 'def456',
          message: 'Add feature',
          author: 'user2',
          date: new Date('2023-12-02'),
          url: 'https://github.com/owner/repo/commit/def456'
        }
      ];
      
      mockGitHubClient.getRepositoryInfo.mockResolvedValue(mockRepoInfo);
      mockGitHubClient.getRecentCommits.mockResolvedValue(mockCommits);
      
      const metrics = await service.collectMetrics(mockTeam);
      
      expect(mockApiClient.getTeamEnvironmentData).toHaveBeenCalledWith('1', 'hackathon1');
      expect(mockGitHubClient.getRepositoryInfo).toHaveBeenCalledWith('owner', 'repo');
      expect(mockGitHubClient.getRecentCommits).toHaveBeenCalledWith('owner', 'repo', 100);
      
      expect(metrics).toEqual({
        repositoryUrl: 'https://github.com/owner/repo',
        repositoryExists: true,
        totalCommits: 2,
        recentCommits: 2,
        lastCommitDate: '2023-12-02T00:00:00.000Z',
        uniqueAuthors: 2,
        repositorySize: 1000,
        language: 'TypeScript',
        hasReadme: true,
        hasLicense: true,
        topics: ['hackathon', 'web'],
        stars: 15,
        forks: 2,
        openIssues: 5
      });
    });
    
    it('should handle team without repository URL', async () => {
      mockApiClient.getTeamEnvironmentData.mockResolvedValue({});
      
      const metrics = await service.collectMetrics(mockTeam);
      
      expect(metrics).toEqual({
        repositoryUrl: null,
        repositoryExists: false,
        totalCommits: 0,
        recentCommits: 0,
        lastCommitDate: null,
        uniqueAuthors: 0,
        repositorySize: 0,
        language: null,
        hasReadme: false,
        hasLicense: false,
        topics: [],
        stars: 0,
        forks: 0,
        openIssues: 0
      });
    });
    
    it('should handle invalid repository URL', async () => {
      mockApiClient.getTeamEnvironmentData.mockResolvedValue({
        REPOSITORY_URL: 'invalid-url'
      });
      
      const metrics = await service.collectMetrics(mockTeam);
      
      expect(metrics).toEqual({
        repositoryUrl: 'invalid-url',
        repositoryExists: false,
        totalCommits: 0,
        recentCommits: 0,
        lastCommitDate: null,
        uniqueAuthors: 0,
        repositorySize: 0,
        language: null,
        hasReadme: false,
        hasLicense: false,
        topics: [],
        stars: 0,
        forks: 0,
        openIssues: 0
      });
    });
    
    it('should handle GitHub API errors', async () => {
      mockApiClient.getTeamEnvironmentData.mockResolvedValue({
        REPOSITORY_URL: 'https://github.com/owner/repo'
      });
      
      mockGitHubClient.getRepositoryInfo.mockRejectedValue(new Error('Repository not found'));
      
      const metrics = await service.collectMetrics(mockTeam);
      
      expect(metrics).toEqual({
        repositoryUrl: 'https://github.com/owner/repo',
        repositoryExists: false,
        totalCommits: 0,
        recentCommits: 0,
        lastCommitDate: null,
        uniqueAuthors: 0,
        repositorySize: 0,
        language: null,
        hasReadme: false,
        hasLicense: false,
        topics: [],
        stars: 0,
        forks: 0,
        openIssues: 0
      });
    });
  });
  
  describe('evaluateStatus', () => {
    it('should return PASSED for active repository', () => {
      const metrics = {
        repositoryExists: true,
        totalCommits: 10,
        recentCommits: 5,
        lastCommitDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
        uniqueAuthors: 2
      };
      
      const status = service.evaluateStatus(metrics);
      expect(status).toBe(CriteriaStatus.PASSED);
    });
    
    it('should return FAILED for non-existent repository', () => {
      const metrics = {
        repositoryExists: false,
        totalCommits: 0,
        recentCommits: 0,
        lastCommitDate: null,
        uniqueAuthors: 0
      };
      
      const status = service.evaluateStatus(metrics);
      expect(status).toBe(CriteriaStatus.FAILED);
    });
    
    it('should return FAILED for inactive repository', () => {
      const metrics = {
        repositoryExists: true,
        totalCommits: 1,
        recentCommits: 0,
        lastCommitDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
        uniqueAuthors: 1
      };
      
      const status = service.evaluateStatus(metrics);
      expect(status).toBe(CriteriaStatus.FAILED);
    });
    
    it('should return NO_DATA for repository with no URL', () => {
      const metrics = {
        repositoryUrl: null,
        repositoryExists: false,
        totalCommits: 0,
        recentCommits: 0,
        lastCommitDate: null,
        uniqueAuthors: 0
      };
      
      const status = service.evaluateStatus(metrics);
      expect(status).toBe(CriteriaStatus.NO_DATA);
    });
  });
  
  describe('calculateScore', () => {
    it('should return 100 for PASSED status with high activity', () => {
      const metrics = {
        totalCommits: 50,
        recentCommits: 20,
        uniqueAuthors: 3,
        hasReadme: true,
        hasLicense: true,
        repositorySize: 1000
      };
      
      const score = service.calculateScore(CriteriaStatus.PASSED, metrics);
      expect(score).toBeGreaterThan(80);
      expect(score).toBeLessThanOrEqual(100);
    });
    
    it('should return lower score for PASSED status with minimal activity', () => {
      const metrics = {
        totalCommits: 2,
        recentCommits: 1,
        uniqueAuthors: 1,
        hasReadme: false,
        hasLicense: false,
        repositorySize: 100
      };
      
      const score = service.calculateScore(CriteriaStatus.PASSED, metrics);
      expect(score).toBeGreaterThan(50);
      expect(score).toBeLessThan(80);
    });
    
    it('should return 0 for FAILED status', () => {
      const metrics = { totalCommits: 0 };
      const score = service.calculateScore(CriteriaStatus.FAILED, metrics);
      expect(score).toBe(0);
    });
    
    it('should return 0 for NO_DATA status', () => {
      const metrics = {};
      const score = service.calculateScore(CriteriaStatus.NO_DATA, metrics);
      expect(score).toBe(0);
    });
  });
  
  describe('parseRepositoryUrl', () => {
    it('should parse standard GitHub URL', () => {
      const result = (service as any).parseRepositoryUrl('https://github.com/owner/repo');
      expect(result).toEqual({ owner: 'owner', repo: 'repo' });
    });
    
    it('should parse GitHub URL with .git extension', () => {
      const result = (service as any).parseRepositoryUrl('https://github.com/owner/repo.git');
      expect(result).toEqual({ owner: 'owner', repo: 'repo' });
    });
    
    it('should parse SSH GitHub URL', () => {
      const result = (service as any).parseRepositoryUrl('git@github.com:owner/repo.git');
      expect(result).toEqual({ owner: 'owner', repo: 'repo' });
    });
    
    it('should return null for invalid URL', () => {
      const result = (service as any).parseRepositoryUrl('invalid-url');
      expect(result).toBeNull();
    });
    
    it('should return null for non-GitHub URL', () => {
      const result = (service as any).parseRepositoryUrl('https://gitlab.com/owner/repo');
      expect(result).toBeNull();
    });
  });
});