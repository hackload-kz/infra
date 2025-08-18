/**
 * Unit tests for GitHubClient
 */

import { GitHubClient } from '../../src/lib/github-client';
import fetch from 'node-fetch';

// Mock fetch
jest.mock('node-fetch');
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('GitHubClient', () => {
  let client: GitHubClient;
  
  const config = {
    apiUrl: 'https://api.github.com',
    token: 'test-token',
    userAgent: 'HackLoad-Monitor/1.0'
  };
  
  beforeEach(() => {
    client = new GitHubClient(config);
    jest.clearAllMocks();
    
    // Mock console methods
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'info').mockImplementation();
    jest.spyOn(console, 'debug').mockImplementation();
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
  });
  
  describe('constructor', () => {
    it('should initialize with provided configuration', () => {
      expect(client).toBeInstanceOf(GitHubClient);
    });
    
    it('should work without token for public repositories', () => {
      const clientWithoutToken = new GitHubClient({
        apiUrl: 'https://api.github.com',
        userAgent: 'Test/1.0'
      });
      
      expect(clientWithoutToken).toBeInstanceOf(GitHubClient);
    });
  });
  
  describe('getRepositoryInfo', () => {
    const mockRepoData = {
      name: 'test-repo',
      full_name: 'owner/test-repo',
      private: false,
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-12-01T00:00:00Z',
      size: 1000,
      language: 'TypeScript',
      topics: ['hackathon', 'web'],
      has_wiki: true,
      open_issues_count: 5,
      watchers_count: 10,
      forks_count: 2,
      stargazers_count: 15,
      license: {
        key: 'mit',
        name: 'MIT License'
      }
    };
    
    it('should fetch repository information successfully', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockRepoData)
      } as any);
      
      const repoInfo = await client.getRepositoryInfo('owner', 'test-repo');
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/owner/test-repo',
        {
          method: 'GET',
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'Authorization': 'token test-token',
            'User-Agent': 'HackLoad-Monitor/1.0'
          }
        }
      );
      
      expect(repoInfo).toEqual({
        name: 'test-repo',
        fullName: 'owner/test-repo',
        private: false,
        createdAt: new Date('2023-01-01T00:00:00Z'),
        updatedAt: new Date('2023-12-01T00:00:00Z'),
        size: 1000,
        language: 'TypeScript',
        topics: ['hackathon', 'web'],
        hasReadme: true,
        hasLicense: true,
        openIssues: 5,
        watchers: 10,
        forks: 2,
        stars: 15
      });
    });
    
    it('should handle repository not found', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      } as any);
      
      await expect(client.getRepositoryInfo('owner', 'nonexistent'))
        .rejects
        .toThrow('GitHub API error: 404 Not Found');
    });
    
    it('should handle rate limiting', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        headers: {
          get: jest.fn((header) => {
            if (header === 'x-ratelimit-remaining') return '0';
            if (header === 'x-ratelimit-reset') return String(Math.floor(Date.now() / 1000) + 3600);
            return null;
          })
        }
      } as any);
      
      await expect(client.getRepositoryInfo('owner', 'test-repo'))
        .rejects
        .toThrow('GitHub API rate limit exceeded');
    });
    
    it('should handle network errors', async () => {
      const networkError = new Error('ECONNREFUSED');
      mockFetch.mockRejectedValue(networkError);
      
      await expect(client.getRepositoryInfo('owner', 'test-repo'))
        .rejects
        .toThrow('ECONNREFUSED');
    });
    
    it('should work without authentication token', async () => {
      const clientWithoutToken = new GitHubClient({
        apiUrl: 'https://api.github.com',
        userAgent: 'Test/1.0'
      });
      
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockRepoData)
      } as any);
      
      await clientWithoutToken.getRepositoryInfo('owner', 'test-repo');
      
      const call = mockFetch.mock.calls[0];
      const headers = call[1]?.headers as Record<string, string>;
      expect(headers['Authorization']).toBeUndefined();
    });
  });
  
  describe('getRecentCommits', () => {
    const mockCommitsData = [
      {
        sha: 'abc123',
        commit: {
          message: 'Initial commit',
          author: {
            name: 'User 1',
            date: '2023-12-01T10:00:00Z'
          }
        },
        html_url: 'https://github.com/owner/repo/commit/abc123'
      },
      {
        sha: 'def456',
        commit: {
          message: 'Add feature',
          author: {
            name: 'User 2',
            date: '2023-12-02T15:00:00Z'
          }
        },
        html_url: 'https://github.com/owner/repo/commit/def456'
      }
    ];
    
    it('should fetch recent commits successfully', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockCommitsData)
      } as any);
      
      const commits = await client.getRecentCommits('owner', 'test-repo', 50);
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/owner/test-repo/commits?per_page=50',
        {
          method: 'GET',
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'Authorization': 'token test-token',
            'User-Agent': 'HackLoad-Monitor/1.0'
          }
        }
      );
      
      expect(commits).toEqual([
        {
          sha: 'abc123',
          message: 'Initial commit',
          author: 'User 1',
          date: new Date('2023-12-01T10:00:00Z'),
          url: 'https://github.com/owner/repo/commit/abc123'
        },
        {
          sha: 'def456',
          message: 'Add feature',
          author: 'User 2',
          date: new Date('2023-12-02T15:00:00Z'),
          url: 'https://github.com/owner/repo/commit/def456'
        }
      ]);
    });
    
    it('should handle empty repository', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 409,
        statusText: 'Conflict'
      } as any);
      
      const commits = await client.getRecentCommits('owner', 'empty-repo');
      expect(commits).toEqual([]);
    });
    
    it('should use default limit when not specified', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue([])
      } as any);
      
      await client.getRecentCommits('owner', 'test-repo');
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/owner/test-repo/commits?per_page=100',
        expect.any(Object)
      );
    });
  });
  
  describe('getCommitsInTimeRange', () => {
    const mockCommitsData = [
      {
        sha: 'abc123',
        commit: {
          message: 'Recent commit',
          author: {
            name: 'User 1',
            date: '2023-12-15T10:00:00Z'
          }
        },
        html_url: 'https://github.com/owner/repo/commit/abc123'
      }
    ];
    
    it('should fetch commits in time range successfully', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockCommitsData)
      } as any);
      
      const since = new Date('2023-12-01T00:00:00Z');
      const until = new Date('2023-12-31T23:59:59Z');
      
      const commits = await client.getCommitsInTimeRange('owner', 'test-repo', since, until);
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/owner/test-repo/commits?since=2023-12-01T00%3A00%3A00.000Z&until=2023-12-31T23%3A59%3A59.000Z&per_page=100',
        expect.any(Object)
      );
      
      expect(commits).toHaveLength(1);
      expect(commits[0].message).toBe('Recent commit');
    });
    
    it('should handle date filtering on client side for incomplete API support', async () => {
      const allCommits = [
        {
          sha: 'old123',
          commit: {
            message: 'Old commit',
            author: {
              name: 'User 1',
              date: '2023-11-01T10:00:00Z'
            }
          },
          html_url: 'https://github.com/owner/repo/commit/old123'
        },
        {
          sha: 'new456',
          commit: {
            message: 'New commit',
            author: {
              name: 'User 2',
              date: '2023-12-15T15:00:00Z'
            }
          },
          html_url: 'https://github.com/owner/repo/commit/new456'
        }
      ];
      
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(allCommits)
      } as any);
      
      const since = new Date('2023-12-01T00:00:00Z');
      const until = new Date('2023-12-31T23:59:59Z');
      
      const commits = await client.getCommitsInTimeRange('owner', 'test-repo', since, until);
      
      // Should filter out the old commit
      expect(commits).toHaveLength(1);
      expect(commits[0].sha).toBe('new456');
    });
  });
  
  describe('isHealthy', () => {
    it('should return true for successful API call', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ current_user_url: 'https://api.github.com/user' })
      } as any);
      
      const isHealthy = await client.isHealthy();
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.github.com',
        expect.any(Object)
      );
      expect(isHealthy).toBe(true);
    });
    
    it('should return false for API errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      } as any);
      
      const isHealthy = await client.isHealthy();
      expect(isHealthy).toBe(false);
    });
    
    it('should return false for network errors', async () => {
      mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));
      
      const isHealthy = await client.isHealthy();
      expect(isHealthy).toBe(false);
    });
  });
  
  describe('error handling', () => {
    it('should provide detailed error messages for API errors', async () => {
      const errorResponse = {
        message: 'Not Found',
        documentation_url: 'https://docs.github.com/rest'
      };
      
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: jest.fn().mockResolvedValue(errorResponse)
      } as any);
      
      await expect(client.getRepositoryInfo('owner', 'nonexistent'))
        .rejects
        .toThrow('GitHub API error: 404 Not Found - Not Found');
    });
    
    it('should handle malformed JSON responses', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON'))
      } as any);
      
      await expect(client.getRepositoryInfo('owner', 'test-repo'))
        .rejects
        .toThrow('GitHub API error: 500 Internal Server Error');
    });
    
    it('should detect and report rate limiting', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        headers: {
          get: jest.fn((header) => {
            if (header === 'x-ratelimit-remaining') return '0';
            if (header === 'x-ratelimit-reset') return String(Math.floor(Date.now() / 1000) + 1800);
            return null;
          })
        },
        json: jest.fn().mockResolvedValue({
          message: 'API rate limit exceeded'
        })
      } as any);
      
      await expect(client.getRepositoryInfo('owner', 'test-repo'))
        .rejects
        .toThrow('GitHub API rate limit exceeded');
    });
  });
});