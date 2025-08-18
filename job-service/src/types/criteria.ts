export enum CriteriaType {
  CODE_REPO = 'CODE_REPO',
  DEPLOYED_SOLUTION = 'DEPLOYED_SOLUTION',
  EVENT_SEARCH = 'EVENT_SEARCH',
  ARCHIVE_SEARCH = 'ARCHIVE_SEARCH',
  AUTH_PERFORMANCE = 'AUTH_PERFORMANCE',
  TICKET_BOOKING = 'TICKET_BOOKING',
  BUDGET_TRACKING = 'BUDGET_TRACKING',
}

export enum CriteriaStatus {
  PASSED = 'PASSED',
  FAILED = 'FAILED',
  NO_DATA = 'NO_DATA',
}

export interface Team {
  id: string;
  nickname: string;
  hackathonId: string;
  name: string;
}

export interface CriteriaUpdate {
  teamSlug: string;
  hackathonId: string;
  criteriaType: CriteriaType;
  status: CriteriaStatus;
  score?: number;
  metrics?: Record<string, unknown>;
  updatedBy: string;
}

export interface MetricsData {
  [key: string]: unknown;
}

export interface GitMetrics extends MetricsData {
  hasRepository?: boolean;
  commitsCount?: number;
  lastCommitTime?: string;
  repositoryUrl?: string;
  hasRecentActivity?: boolean;
  confirmationUrl?: string;
  confirmationTitle?: string;
  confirmationDescription?: string;
}

export interface DeploymentMetrics extends MetricsData {
  isDeployed?: boolean;
  endpointUrl?: string;
  responseTime?: number;
  statusCode?: number;
  lastChecked?: string;
  isAccessible?: boolean;
  error?: string;
  confirmationUrl?: string;
  confirmationTitle?: string;
  confirmationDescription?: string;
}

export interface PerformanceMetrics extends MetricsData {
  p95Latency?: number;
  successRate?: number;
  testName?: string;
  lastTestTime?: string;
  thresholdMet?: boolean;
  confirmationUrl?: string;
  confirmationTitle?: string;
  confirmationDescription?: string;
}

export interface CostMetrics extends MetricsData {
  totalCost?: number;
  currency?: string;
  period?: string;
  breakdown?: Record<string, number>;
  lastUpdated?: string;
  confirmationUrl?: string;
  confirmationTitle?: string;
  confirmationDescription?: string;
}