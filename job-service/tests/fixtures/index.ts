/**
 * Test fixtures for consistent test data
 */

import { Team, CriteriaType, CriteriaStatus } from '../../src/types/criteria';

// Mock teams for testing
export const mockTeams: Team[] = [
  {
    id: 'team-1',
    nickname: 'awesome-team',
    hackathonId: 'hackathon-2024',
    name: 'Awesome Team'
  },
  {
    id: 'team-2',
    nickname: 'innovators',
    hackathonId: 'hackathon-2024',
    name: 'The Innovators'
  },
  {
    id: 'team-3',
    nickname: 'code-wizards',
    hackathonId: 'hackathon-2024',
    name: 'Code Wizards'
  }
];

// Mock environment data
export const mockEnvironmentData: Record<string, Record<string, string>> = {
  'team-1': {
    REPOSITORY_URL: 'https://github.com/awesome-team/hackathon-project',
    APPLICATION_URL: 'https://awesome-team.hackload.kz',
    DATABASE_URL: 'postgresql://user:pass@db:5432/awesome_team'
  },
  'team-2': {
    REPOSITORY_URL: 'https://github.com/innovators/innovation-app',
    APPLICATION_URL: 'https://innovators-app.com',
    DATABASE_URL: 'postgresql://user:pass@db:5432/innovators'
  },
  'team-3': {
    REPOSITORY_URL: 'https://github.com/wizards/magic-app',
    APPLICATION_URL: 'http://wizards.local:3000',
    DATABASE_URL: 'postgresql://user:pass@db:5432/wizards'
  }
};

// Mock GitHub repository data
export const mockGitHubRepository = {
  name: 'hackathon-project',
  fullName: 'awesome-team/hackathon-project',
  private: false,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-15T12:00:00Z'),
  size: 2048,
  language: 'TypeScript',
  topics: ['hackathon', 'nextjs', 'web'],
  hasReadme: true,
  hasLicense: true,
  openIssues: 3,
  watchers: 12,
  forks: 2,
  stars: 25,
  id: 123456,
  htmlUrl: 'https://github.com/awesome-team/hackathon-project',
  defaultBranch: 'main'
};

// Mock GitHub commits
export const mockGitHubCommits = [
  {
    sha: 'abc123def456',
    message: 'Initial project setup',
    author: 'john-doe',
    date: new Date('2024-01-10T10:00:00Z'),
    url: 'https://github.com/awesome-team/hackathon-project/commit/abc123def456'
  },
  {
    sha: 'def456ghi789',
    message: 'Add user authentication',
    author: 'jane-smith',
    date: new Date('2024-01-12T14:30:00Z'),
    url: 'https://github.com/awesome-team/hackathon-project/commit/def456ghi789'
  },
  {
    sha: 'ghi789jkl012',
    message: 'Implement dashboard UI',
    author: 'bob-wilson',
    date: new Date('2024-01-14T09:15:00Z'),
    url: 'https://github.com/awesome-team/hackathon-project/commit/ghi789jkl012'
  },
  {
    sha: 'jkl012mno345',
    message: 'Add API integration',
    author: 'alice-brown',
    date: new Date('2024-01-15T16:45:00Z'),
    url: 'https://github.com/awesome-team/hackathon-project/commit/jkl012mno345'
  }
];

// Mock API responses
export const mockApiResponses = {
  getTeams: {
    success: true,
    data: mockTeams
  },
  getTeamEnvironmentData: (teamId: string) => ({
    success: true,
    data: mockEnvironmentData[teamId] || {}
  }),
  bulkUpdateCriteria: {
    success: true,
    data: {
      processed: 3,
      failed: 0,
      errors: []
    }
  }
};

// Mock metrics data
export const mockMetricsData = {
  git: {
    hasRepository: true,
    commitsCount: 4,
    lastCommitTime: '2024-01-15T16:45:00Z',
    repositoryUrl: 'https://github.com/awesome-team/hackathon-project',
    hasRecentActivity: true,
    confirmationUrl: 'https://github.com/awesome-team/hackathon-project',
    confirmationTitle: 'Repository: awesome-team/hackathon-project',
    confirmationDescription: '4 commits, last activity on 2024-01-15'
  },
  deployment: {
    isDeployed: true,
    endpointUrl: 'https://awesome-team.hackload.kz',
    responseTime: 250,
    statusCode: 200,
    lastChecked: '2024-01-15T18:00:00Z',
    isAccessible: true,
    confirmationUrl: 'https://awesome-team.hackload.kz',
    confirmationTitle: 'Deployed Application',
    confirmationDescription: 'Application is accessible with 250ms response time'
  },
  performance: {
    p95Latency: 450,
    successRate: 98.5,
    testName: 'Load Test - Jan 15',
    lastTestTime: '2024-01-15T17:30:00Z',
    thresholdMet: true,
    confirmationUrl: 'https://grafana.example.com/dashboard/perf-test-123',
    confirmationTitle: 'Performance Test Results',
    confirmationDescription: 'P95 latency: 450ms, Success rate: 98.5%'
  },
  cost: {
    totalCost: 45.67,
    currency: 'USD',
    period: '2024-01',
    breakdown: {
      compute: 25.30,
      storage: 8.20,
      networking: 5.17,
      database: 7.00
    },
    lastUpdated: '2024-01-15T20:00:00Z',
    confirmationUrl: 'https://cloud-console.example.com/billing/team-1',
    confirmationTitle: 'Cost Breakdown - January 2024',
    confirmationDescription: 'Total: $45.67 (Compute: $25.30, Storage: $8.20, Network: $5.17, DB: $7.00)'
  }
};

// Service configurations for testing
export const testServiceConfigs = {
  gitMonitor: {
    enabled: true,
    interval: '*/30 * * * *',
    timeout: 300000,
    retries: 3
  },
  deploymentMonitor: {
    enabled: true,
    interval: '*/15 * * * *',
    timeout: 30000,
    retries: 2
  },
  k6Services: {
    enabled: false,
    interval: '0 */6 * * *',
    timeout: 1200000,
    retries: 1
  },
};

// Test environment configurations
export const testEnvironments = {
  minimal: {
    NODE_ENV: 'test',
    LOG_LEVEL: 'error',
    API_BASE_URL: 'https://test-api.example.com',
    SERVICE_API_KEY: 'test-service-key',
    GIT_MONITOR_ENABLED: 'false',
    DEPLOYMENT_MONITOR_ENABLED: 'false',
    K6_SERVICES_ENABLED: 'false',
  },
  withServices: {
    NODE_ENV: 'test',
    LOG_LEVEL: 'info',
    API_BASE_URL: 'https://test-api.example.com',
    SERVICE_API_KEY: 'test-service-key',
    GIT_MONITOR_ENABLED: 'true',
    DEPLOYMENT_MONITOR_ENABLED: 'true',
    K6_SERVICES_ENABLED: 'false',
    GITHUB_TOKEN: 'test-github-token',
    HTTP_TIMEOUT: '15000'
  },
  fullServices: {
    NODE_ENV: 'production',
    LOG_LEVEL: 'info',
    API_BASE_URL: 'https://api.hackload.kz',
    SERVICE_API_KEY: 'production-service-key',
    GIT_MONITOR_ENABLED: 'true',
    DEPLOYMENT_MONITOR_ENABLED: 'true',
    K6_SERVICES_ENABLED: 'true',
    GITHUB_TOKEN: 'github-token',
    GRAFANA_API_URL: 'https://grafana.hackload.kz/api',
    GRAFANA_TOKEN: 'grafana-token',
    HTTP_TIMEOUT: '10000',
    HEALTH_CHECK_PORT: '8080',
    METRICS_PORT: '9090'
  }
};

// Helper functions for test data generation
export const generateMockTeam = (id: string, nickname: string): Team => ({
  id,
  nickname,
  hackathonId: 'hackathon-2024',
  name: `Team ${nickname}`
});

export const generateMockCommit = (sha: string, author: string, message: string, date: Date) => ({
  sha,
  message,
  author,
  date,
  url: `https://github.com/test-org/test-repo/commit/${sha}`
});

export const generateMockEnvironmentData = (repositoryUrl?: string, applicationUrl?: string) => ({
  ...(repositoryUrl && { REPOSITORY_URL: repositoryUrl }),
  ...(applicationUrl && { APPLICATION_URL: applicationUrl }),
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/test_db'
});

// Error scenarios for testing
export const errorScenarios = {
  networkError: new Error('ECONNREFUSED'),
  timeoutError: Object.assign(new Error('Request timeout'), { name: 'AbortError' }),
  apiError: {
    status: 500,
    message: 'Internal Server Error'
  },
  rateLimitError: {
    status: 429,
    message: 'Too Many Requests',
    retryAfter: 60
  },
  unauthorizedError: {
    status: 401,
    message: 'Unauthorized'
  },
  notFoundError: {
    status: 404,
    message: 'Not Found'
  }
};