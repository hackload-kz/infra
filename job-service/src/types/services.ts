import { CriteriaType, CriteriaStatus, Team, MetricsData } from './criteria';

export interface JobStatus {
  serviceName: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastRunTime?: Date;
  lastSuccessTime?: Date;
  errorRate: number;
  consecutiveFailures: number;
}

export interface ServiceHealth {
  serviceName: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastRunTime?: Date;
  lastSuccessTime?: Date;
  errorRate: number;
  consecutiveFailures: number;
}

export interface FailedJobRecord {
  serviceName: string;
  teamId: string;
  error: string;
  timestamp: Date;
  retryCount: number;
  nextRetryAt: Date;
}

export interface BaseJobServiceInterface {
  readonly criteriaType: CriteriaType;
  readonly serviceName: string;
  
  collectMetrics(team: Team): Promise<MetricsData>;
  evaluateStatus(metrics: MetricsData): CriteriaStatus;
  calculateScore(status: CriteriaStatus, metrics: MetricsData): number;
  run(): Promise<void>;
}

export interface JobSchedulerInterface {
  registerService(service: BaseJobServiceInterface, config?: unknown): void;
  start(): Promise<void>;
  stop(): Promise<void>;
  pause(serviceName: string): void;
  resume(serviceName: string): void;
  getStatus(): JobStatus[];
}