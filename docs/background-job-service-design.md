# Background Job Service Architecture Design

## Overview

This document outlines the design for a distributed background job service system that monitors and updates team criteria metrics for the HackLoad organizer platform. The service is designed to integrate with the existing API endpoints and provides automated metrics collection for different evaluation criteria.

## Current System Analysis

### Existing Infrastructure
- **Hub API**: Service API endpoints at `/api/service/team-criteria/*` with authentication via X-API-Key
- **Database**: PostgreSQL with TeamCriteria and TeamCriteriaHistory models via Prisma ORM
- **Authentication**: Service account authentication with permissions-based access control
- **Kubernetes**: Existing infrastructure for container orchestration
- **Logging**: Comprehensive audit logging and API usage tracking

### API Endpoints Structure
```typescript
POST /api/service/team-criteria              // Bulk updates
PUT  /api/service/team-criteria/{slug}/{type} // Single updates  
GET  /api/service/team-criteria              // Query criteria
GET  /api/service/team-criteria/{slug}/{type} // Get specific criteria
```

### Criteria Types (from existing examples)
1. **CODE_REPO** - Repository activity monitoring
2. **DEPLOYED_SOLUTION** - Application deployment status
3. **EVENT_SEARCH** - Search performance metrics (p95 < 2s, >95% success)
4. **ARCHIVE_SEARCH** - Archive search performance 
5. **AUTH_PERFORMANCE** - Authentication load testing results
6. **TICKET_BOOKING** - Booking system performance
7. **BUDGET_TRACKING** - Cost monitoring (informational)

## Service Architecture

### Core Components

#### 1. Job Scheduler Service
```typescript
interface JobScheduler {
  schedule(jobType: CriteriaType, interval: string): void
  reschedule(jobType: CriteriaType, interval: string): void  
  pause(jobType: CriteriaType): void
  resume(jobType: CriteriaType): void
  getStatus(): JobStatus[]
}
```

#### 2. Individual Job Services
Each criteria type gets its own specialized service:

##### Git Repository Monitor (`git-monitor-service`)
- **Purpose**: Monitor repository activity and commit patterns
- **Metrics**: Commit count, last commit time, repository accessibility
- **Data Sources**: GitHub API
- **Schedule**: Every 30 minutes

##### Deployment Monitor (`deployment-monitor-service`)  
- **Purpose**: Check application deployment status and accessibility
- **Metrics**: HTTP response codes, response times, endpoint availability
- **Data Sources**: HTTP health checks, monitoring systems
- **Schedule**: Every 15 minutes

##### Performance Testing Services
Multiple services for different performance criteria:
- `k6-search-testing-service` - Event search performance
- `k6-archive-testing-service` - Archive search performance  
- `k6-auth-testing-service` - Authentication performance
- `k6-booking-testing-service` - Ticket booking performance

##### Cost Tracking Service (`cost-tracking-service`)
- **Purpose**: Monitor resource usage and costs
- **Metrics**: Cloud provider billing, resource utilization
- **Data Sources**: Manual fill out using the dashboard block (the page for criteria must be implementedA)

#### 3. Service Configuration
```yaml
# service-config.yaml
services:
  git-monitor:
    enabled: true
    interval: "*/30 * * * *"  # Every 30 minutes
    timeout: "5m"
    retries: 3
    
  deployment-monitor:
    enabled: true
    interval: "*/15 * * * *"  # Every 15 minutes
    timeout: "30s"
    retries: 2
    
  k6-search-testing:
    enabled: true
    interval: "0 */6 * * *"   # Every 6 hours
    timeout: "20m"
    retries: 1
    
  cost-tracking:
    enabled: true
    interval: "0 */6 * * *"   # Every 6 hours
    timeout: "10m"
    retries: 2
```

### Deployment Architecture

#### Single Container with Internal Scheduling (Recommended)
```yaml
# Advantages:
# - Single deployment to manage
# - Shared resources and configuration
# - Easier extensibility for new job types
# - Centralized logging and monitoring
# - Simplified secret management

apiVersion: apps/v1
kind: Deployment
metadata:
  name: hackload-job-service
  namespace: hub
spec:
  replicas: 1
  selector:
    matchLabels:
      app: hackload-job-service
  template:
    metadata:
      labels:
        app: hackload-job-service
    spec:
      containers:
      - name: job-service
        image: hackload/job-service:latest
        env:
        - name: API_BASE_URL
          value: "https://hub.hackload.kz"
        - name: SERVICE_API_KEY
          valueFrom:
            secretKeyRef:
              name: job-service-secrets
              key: api-key
        envFrom:
        - secretRef:
            name: job-service-secrets
        - configMapRef:
            name: job-service-config
        resources:
          requests:
            cpu: 200m
            memory: 256Mi
          limits:
            cpu: 500m
            memory: 512Mi
```

### Data Flow Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Data Sources  │───▶│  Job Services    │───▶│   Hub API       │
│                 │    │                  │    │                 │
│ • GitHub API    │    │ • Git Monitor    │    │ POST /api/      │
│ • HTTP Checks   │    │ • Deploy Monitor │    │ service/team-   │
│ • K6 Results    │    │ • K6 Services    │    │ criteria        │
│ • Cloud Billing │    │ • Cost Tracker   │    │                 │
│ • Grafana API   │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌──────────────────┐    ┌─────────────────┐
                       │    Logging &     │    │   PostgreSQL    │
                       │   Monitoring     │    │   Database      │
                       └──────────────────┘    └─────────────────┘
```

## Service Implementation Details

#### Application Structure
```typescript
// src/index.ts - Main application entry point
import { JobScheduler } from './scheduler'
import { GitMonitorService } from './services/git-monitor'
import { DeploymentMonitorService } from './services/deployment-monitor'
// ... other services

async function main() {
  const scheduler = new JobScheduler()
  
  // Register all job services
  scheduler.registerService(new GitMonitorService())
  scheduler.registerService(new DeploymentMonitorService())
  // ... register other services
  
  // Start scheduler
  await scheduler.start()
  
  // Setup graceful shutdown
  process.on('SIGTERM', () => scheduler.stop())
}

main().catch(console.error)
```

#### Job Scheduler with Internal Cron
```typescript
// src/scheduler.ts
import * as cron from 'node-cron'

export class JobScheduler {
  private services: Map<string, BaseJobService> = new Map()
  private tasks: Map<string, cron.ScheduledTask> = new Map()
  
  registerService(service: BaseJobService): void {
    this.services.set(service.serviceName, service)
  }
  
  async start(): void {
    for (const [name, service] of this.services) {
      const config = SERVICE_CONFIG[name]
      if (!config?.enabled) continue
      
      const task = cron.schedule(config.interval, async () => {
        try {
          console.log(`[${new Date().toISOString()}] Starting job: ${name}`)
          await service.run()
          console.log(`[${new Date().toISOString()}] Completed job: ${name}`)
        } catch (error) {
          console.error(`[${new Date().toISOString()}] Job failed: ${name}`, error)
        }
      }, { scheduled: false })
      
      this.tasks.set(name, task)
      task.start()
      
      console.log(`Scheduled ${name}: ${config.interval}`)
    }
  }
  
  async stop(): Promise<void> {
    for (const task of this.tasks.values()) {
      task.stop()
    }
  }
}
```

### Base Service Interface
```typescript
abstract class BaseJobService {
  abstract criteriaType: CriteriaType
  abstract serviceName: string
  
  abstract collectMetrics(): Promise<MetricsData>
  
  async run(): Promise<void> {
    try {
      const teams = await this.getTeams()
      const updates: CriteriaUpdate[] = []
      
      for (const team of teams) {
        const metrics = await this.collectMetrics(team)
        const status = this.evaluateStatus(metrics)
        const score = this.calculateScore(status, metrics)
        
        updates.push({
          teamSlug: team.nickname,
          hackathonId: team.hackathonId,
          criteriaType: this.criteriaType,
          status,
          score,
          metrics,
          updatedBy: this.serviceName
        })
      }
      
      await this.bulkUpdateCriteria(updates)
    } catch (error) {
      await this.handleError(error)
    }
  }
}
```

### Example: Git Monitor Service
```typescript
class GitMonitorService extends BaseJobService {
  criteriaType = CriteriaType.CODE_REPO
  serviceName = 'git-monitor-service'
  
  async collectMetrics(team: Team): Promise<GitMetrics> {
    const repoUrl = await this.getRepositoryUrl(team)
    
    if (!repoUrl) {
      return { hasRepository: false }
    }
    
    const commits = await this.github.getCommits(repoUrl)
    const lastCommit = commits[0]
    
    return {
      commitsCount: commits.length,
      lastCommitTime: lastCommit?.date,
      repositoryUrl: repoUrl,
      hasRecentActivity: this.isRecentActivity(lastCommit?.date),
      confirmationUrl: repoUrl,
      confirmationTitle: 'Репозиторий',
      confirmationDescription: 'Исходный код решения команды'
    }
  }
  
  evaluateStatus(metrics: GitMetrics): CriteriaStatus {
    if (!metrics.hasRepository) return 'NO_DATA'
    if (metrics.commitsCount >= 10 && metrics.hasRecentActivity) return 'PASSED'
    return 'FAILED'
  }
}
```

### Example: Deployment Monitor Service
```typescript
class DeploymentMonitorService extends BaseJobService {
  criteriaType = CriteriaType.DEPLOYED_SOLUTION
  serviceName = 'deployment-monitor-service'
  
  async collectMetrics(team: Team): Promise<DeploymentMetrics> {
    const endpointUrl = await this.getEndpointUrl(team)
    
    if (!endpointUrl) {
      return { isDeployed: false }
    }
    
    const startTime = Date.now()
    
    try {
      const response = await fetch(endpointUrl, { 
        timeout: 10000,
        headers: { 'User-Agent': 'HackLoad-Monitor/1.0' }
      })
      
      const responseTime = Date.now() - startTime
      
      return {
        endpointUrl,
        responseTime,
        statusCode: response.status,
        lastChecked: new Date().toISOString(),
        isAccessible: response.ok,
        confirmationUrl: endpointUrl,
        confirmationTitle: 'Демо',
        confirmationDescription: 'Развернутое решение команды'
      }
    } catch (error) {
      return {
        endpointUrl,
        responseTime: Date.now() - startTime,
        statusCode: 0,
        lastChecked: new Date().toISOString(),
        isAccessible: false,
        error: error.message
      }
    }
  }
}
```

## Configuration Management

### Service Configuration
```typescript
// config/services.ts
export const SERVICE_CONFIG = {
  gitMonitor: {
    enabled: process.env.GIT_MONITOR_ENABLED === 'true',
    interval: process.env.GIT_MONITOR_INTERVAL || '*/30 * * * *',
    timeout: process.env.GIT_MONITOR_TIMEOUT || '5m',
    github: {
      token: process.env.GITHUB_TOKEN,
      apiUrl: 'https://api.github.com'
    }
  },
  
  deploymentMonitor: {
    enabled: process.env.DEPLOYMENT_MONITOR_ENABLED === 'true',
    interval: process.env.DEPLOYMENT_MONITOR_INTERVAL || '*/15 * * * *',
    timeout: process.env.DEPLOYMENT_MONITOR_TIMEOUT || '30s'
  },
  
  k6Services: {
    enabled: process.env.K6_SERVICES_ENABLED === 'true',
    interval: process.env.K6_SERVICES_INTERVAL || '0 */6 * * *',
    grafanaUrl: process.env.GRAFANA_URL,
    grafanaToken: process.env.GRAFANA_TOKEN
  }
}
```

### Team Data Sources
```typescript
interface TeamDataSource {
  getRepositoryUrl(team: Team): Promise<string | null>
  getEndpointUrl(team: Team): Promise<string | null>
  getGrafanaUrl(team: Team, dashboard: string): Promise<string>
}

class DatabaseTeamDataSource implements TeamDataSource {
  async getRepositoryUrl(team: Team): Promise<string | null> {
    // Get from TeamEnvironmentData where key = 'GITHUB_REPOSITORY_URL'
    const envData = await db.teamEnvironmentData.findFirst({
      where: { 
        teamId: team.id, 
        hackathonId: team.hackathonId,
        key: 'GITHUB_REPOSITORY_URL'
      }
    })
    return envData?.value || null
  }
  
  async getEndpointUrl(team: Team): Promise<string | null> {
    // Get from TeamEnvironmentData where key = 'APPLICATION_URL'  
    const envData = await db.teamEnvironmentData.findFirst({
      where: { 
        teamId: team.id, 
        hackathonId: team.hackathonId,
        key: 'APPLICATION_URL'
      }
    })
    return envData?.value || null
  }
}
```

## Security and Authentication

### Service API Key Management
```typescript
// Service keys should be created with specific permissions
const serviceKeyConfig = {
  'git-monitor-service': {
    permissions: ['environment:read', 'environment:write'],
    description: 'Git repository monitoring service'
  },
  'deployment-monitor-service': {
    permissions: ['environment:read', 'environment:write'], 
    description: 'Application deployment monitoring service'
  },
  'k6-testing-services': {
    permissions: ['environment:read', 'environment:write'],
    description: 'Load testing services for performance metrics'
  }
}
```

### Environment Variables and Secrets

#### Kubernetes ConfigMap
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: job-service-config
  namespace: hub
data:
  # Service Configuration
  NODE_ENV: "production"
  LOG_LEVEL: "info"
  
  # Hub API Configuration
  API_BASE_URL: "https://hub.hackload.kz"
  API_TIMEOUT: "30000"
  API_RETRIES: "3"
  
  # Job Scheduling Configuration
  GIT_MONITOR_ENABLED: "true"
  GIT_MONITOR_INTERVAL: "*/30 * * * *"
  GIT_MONITOR_TIMEOUT: "300000"
  
  DEPLOYMENT_MONITOR_ENABLED: "true"
  DEPLOYMENT_MONITOR_INTERVAL: "*/15 * * * *"
  DEPLOYMENT_MONITOR_TIMEOUT: "30000"
  
  K6_SERVICES_ENABLED: "true"
  K6_SERVICES_INTERVAL: "0 */6 * * *"
  K6_SERVICES_TIMEOUT: "1200000"
  
  COST_TRACKING_ENABLED: "true"
  COST_TRACKING_INTERVAL: "0 */6 * * *"
  COST_TRACKING_TIMEOUT: "600000"
  
  # External API URLs
  GITHUB_API_URL: "https://api.github.com"
  GRAFANA_API_URL: "https://grafana.hackload.kz/api"
  
  # Health Check Configuration
  HEALTH_CHECK_PORT: "8080"
  METRICS_PORT: "9090"
```

#### Kubernetes Secret
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: job-service-secrets
  namespace: hub
type: Opaque
stringData:
  # Hub API Authentication
  SERVICE_API_KEY: "hackload-service-key-xxxxx"
  
  # External API Tokens
  GITHUB_TOKEN: "ghp_xxxxx"
  GITHUB_APP_ID: "123456"
  GITHUB_APP_PRIVATE_KEY: |
    -----BEGIN RSA PRIVATE KEY-----
    MIIEpAIBAAKCAQEA...
    -----END RSA PRIVATE KEY-----
  
  # Grafana API Access
  GRAFANA_TOKEN: "glsa_xxxxx"
  GRAFANA_USERNAME: "hackload-job-service"
  
  # Cloud Provider API Keys (if needed)
  AWS_ACCESS_KEY_ID: "AKIAXXXXX"
  AWS_SECRET_ACCESS_KEY: "xxxxx"
  AZURE_CLIENT_ID: "xxxxx"
  AZURE_CLIENT_SECRET: "xxxxx"
  AZURE_TENANT_ID: "xxxxx"
  GCP_SERVICE_ACCOUNT_KEY: |
    {
      "type": "service_account",
      "project_id": "hackload-project",
      ...
    }
  
  # Database Connection (if direct access needed)
  DATABASE_URL: "postgresql://user:pass@postgres:5432/hackload"
  
  # Monitoring and Observability
  PROMETHEUS_PUSHGATEWAY_URL: "http://prometheus-pushgateway:9091"
  SENTRY_DSN: "https://xxxxx@sentry.io/xxxxx"
```

#### Complete Environment Variable List

##### Core Application
| Variable | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `NODE_ENV` | Config | Yes | `production` | Runtime environment |
| `LOG_LEVEL` | Config | No | `info` | Logging level (error, warn, info, debug) |
| `API_BASE_URL` | Config | Yes | - | Hub API base URL |
| `SERVICE_API_KEY` | Secret | Yes | - | Hub service authentication key |
| `API_TIMEOUT` | Config | No | `30000` | API request timeout (ms) |
| `API_RETRIES` | Config | No | `3` | Number of API retry attempts |

##### Git Monitor Service
| Variable | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `GIT_MONITOR_ENABLED` | Config | No | `true` | Enable git monitoring |
| `GIT_MONITOR_INTERVAL` | Config | No | `*/30 * * * *` | Cron schedule |
| `GIT_MONITOR_TIMEOUT` | Config | No | `300000` | Service timeout (ms) |
| `GITHUB_TOKEN` | Secret | Yes* | - | GitHub API token |
| `GITHUB_API_URL` | Config | No | `https://api.github.com` | GitHub API base URL |
| `GITHUB_APP_ID` | Secret | No | - | GitHub App ID (alternative auth) |
| `GITHUB_APP_PRIVATE_KEY` | Secret | No | - | GitHub App private key |

##### Deployment Monitor Service
| Variable | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `DEPLOYMENT_MONITOR_ENABLED` | Config | No | `true` | Enable deployment monitoring |
| `DEPLOYMENT_MONITOR_INTERVAL` | Config | No | `*/15 * * * *` | Cron schedule |
| `DEPLOYMENT_MONITOR_TIMEOUT` | Config | No | `30000` | Service timeout (ms) |
| `HTTP_TIMEOUT` | Config | No | `10000` | HTTP health check timeout |
| `USER_AGENT` | Config | No | `HackLoad-Monitor/1.0` | HTTP User-Agent header |

##### K6 Performance Services
| Variable | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `K6_SERVICES_ENABLED` | Config | No | `true` | Enable K6 performance monitoring |
| `K6_SERVICES_INTERVAL` | Config | No | `0 */6 * * *` | Cron schedule |
| `K6_SERVICES_TIMEOUT` | Config | No | `1200000` | Service timeout (ms) |
| `GRAFANA_API_URL` | Config | Yes* | - | Grafana API base URL |
| `GRAFANA_TOKEN` | Secret | Yes* | - | Grafana API token |
| `GRAFANA_USERNAME` | Secret | No | - | Grafana username (alternative auth) |
| `K6_RESULTS_RETENTION` | Config | No | `30` | Days to retain K6 results |

##### Cost Tracking Service
| Variable | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `COST_TRACKING_ENABLED` | Config | No | `true` | Enable cost tracking |
| `COST_TRACKING_INTERVAL` | Config | No | `0 */6 * * *` | Cron schedule |
| `COST_TRACKING_TIMEOUT` | Config | No | `600000` | Service timeout (ms) |
| `AWS_ACCESS_KEY_ID` | Secret | No | - | AWS API access key |
| `AWS_SECRET_ACCESS_KEY` | Secret | No | - | AWS API secret key |
| `AZURE_CLIENT_ID` | Secret | No | - | Azure API client ID |
| `AZURE_CLIENT_SECRET` | Secret | No | - | Azure API client secret |
| `AZURE_TENANT_ID` | Secret | No | - | Azure API tenant ID |
| `GCP_SERVICE_ACCOUNT_KEY` | Secret | No | - | GCP service account JSON |

##### Database Access (Optional)
| Variable | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `DATABASE_URL` | Secret | No | - | Direct database connection (fallback) |
| `DB_POOL_SIZE` | Config | No | `5` | Database connection pool size |
| `DB_TIMEOUT` | Config | No | `30000` | Database query timeout (ms) |

##### Monitoring & Observability
| Variable | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `HEALTH_CHECK_PORT` | Config | No | `8080` | Health check endpoint port |
| `METRICS_PORT` | Config | No | `9090` | Prometheus metrics port |
| `PROMETHEUS_PUSHGATEWAY_URL` | Secret | No | - | Prometheus push gateway URL |
| `SENTRY_DSN` | Secret | No | - | Sentry error tracking DSN |
| `METRICS_ENABLED` | Config | No | `true` | Enable Prometheus metrics |
| `TRACING_ENABLED` | Config | No | `false` | Enable distributed tracing |

##### Performance & Resource Limits
| Variable | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `MAX_CONCURRENT_JOBS` | Config | No | `5` | Maximum concurrent job execution |
| `MEMORY_LIMIT_MB` | Config | No | `512` | Memory limit for the service |
| `CPU_LIMIT_CORES` | Config | No | `0.5` | CPU limit for the service |
| `RATE_LIMIT_PER_MINUTE` | Config | No | `60` | API rate limit per service |

*Required only if the corresponding service is enabled

## Monitoring and Observability

### Service Health Monitoring
```typescript
interface ServiceHealth {
  serviceName: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  lastRunTime: Date
  lastSuccessTime: Date
  errorRate: number
  consecutiveFailures: number
}

// Health check endpoint for each service
app.get('/health', async (req, res) => {
  const health: ServiceHealth = {
    serviceName: this.serviceName,
    status: this.getHealthStatus(),
    lastRunTime: this.lastRunTime,
    lastSuccessTime: this.lastSuccessTime,
    errorRate: this.calculateErrorRate(),
    consecutiveFailures: this.consecutiveFailures
  }
  
  res.json(health)
})
```

### Metrics and Alerting
```typescript
// Prometheus metrics
const metrics = {
  jobExecutions: new prometheus.Counter({
    name: 'job_executions_total',
    help: 'Total number of job executions',
    labelNames: ['service', 'status']
  }),
  
  jobDuration: new prometheus.Histogram({
    name: 'job_duration_seconds',
    help: 'Job execution duration',
    labelNames: ['service']
  }),
  
  teamsProcessed: new prometheus.Counter({
    name: 'teams_processed_total', 
    help: 'Total teams processed',
    labelNames: ['service']
  })
}
```

## Error Handling and Recovery

### Retry Strategy
```typescript
class RetryableJobService extends BaseJobService {
  async runWithRetry(): Promise<void> {
    const maxRetries = this.config.retries || 3
    let attempt = 0
    
    while (attempt < maxRetries) {
      try {
        await this.run()
        return // Success
      } catch (error) {
        attempt++
        
        if (attempt >= maxRetries) {
          await this.handleFinalFailure(error)
          throw error
        }
        
        const backoffMs = Math.pow(2, attempt) * 1000 // Exponential backoff
        await this.sleep(backoffMs)
      }
    }
  }
}
```

### Dead Letter Queue
```typescript
interface FailedJobRecord {
  serviceName: string
  teamId: string
  error: string
  timestamp: Date
  retryCount: number
  nextRetryAt: Date
}

// Store failed jobs for manual inspection/retry
class DeadLetterQueue {
  async addFailedJob(record: FailedJobRecord): Promise<void>
  async getFailedJobs(serviceName?: string): Promise<FailedJobRecord[]>
  async retryJob(jobId: string): Promise<void>
}
```

---

## Docker Build Pipeline

### Dockerfile
```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/

# Build TypeScript
RUN npm run build

# Production stage  
FROM node:18-alpine AS production

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S jobservice -u 1001

# Copy production files
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Set ownership
RUN chown -R jobservice:nodejs /app
USER jobservice

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://localhost:8080/health').then(r=>r.ok?process.exit(0):process.exit(1)).catch(()=>process.exit(1))"

# Expose ports
EXPOSE 8080 9090

CMD ["node", "dist/index.js"]
```

### GitHub Actions Workflow
```yaml
name: Build and Deploy Job Service

on:
  push:
    branches: [ main ]
    paths:
      - 'job-service/**'
      - '.github/workflows/job-service.yml'
  pull_request:
    branches: [ main ]
    paths:
      - 'job-service/**'
      - '.github/workflows/job-service.yml'
  workflow_dispatch:
    inputs:
      image_tag:
        description: 'Docker image tag to deploy'
        required: false
        default: ''

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}/job-service

jobs:
  build-and-push:
    runs-on: [self-hosted]
    permissions:
      contents: read
      packages: write
      actions: write

    steps:
    - name: Checkout repository
      uses: actions/checkout@v4

    - name: Log in to Container Registry
      uses: docker/login-action@v3
      with:
        registry: ${{ env.REGISTRY }}
        username: ${{ github.repository_owner }}
        password: ${{ secrets.GITHUB_TOKEN }}

    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v3
      with:
        # Optimization for faster builds
        driver-opts: |
          network=host
          env.BUILDKIT_STEP_LOG_MAX_SIZE=50000000
          env.BUILDKIT_STEP_LOG_MAX_SPEED=10000000
        config-inline: |
          [worker.oci]
            max-parallelism = 4
          [worker.containerd]
            max-parallelism = 4

    - name: Extract metadata
      id: meta
      uses: docker/metadata-action@v5
      with:
        images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
        tags: |
          type=ref,event=branch
          type=ref,event=pr
          type=sha,prefix=sha-
          type=raw,value=latest,enable={{is_default_branch}}

    - name: Build and push Docker image
      uses: docker/build-push-action@v5
      with:
        context: job-service
        file: job-service/Dockerfile
        # Build AMD64 only for faster builds (can add ARM64 later)
        platforms: linux/amd64
        push: true
        tags: ${{ steps.meta.outputs.tags }}
        labels: ${{ steps.meta.outputs.labels }}
        # Increase parallelism
        build-contexts: |
          alpine=docker-image://alpine:latest

    - name: Generate deployment artifact
      env:
        GITHUB_SHA: ${{ github.sha }}
      run: |
        echo "IMAGE_TAG=sha-${GITHUB_SHA::7}" >> deployment.env
        echo "IMAGE_URL=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:sha-${GITHUB_SHA::7}" >> deployment.env

    - name: Upload deployment artifact
      uses: actions/upload-artifact@v4
      with:
        name: job-service-deployment-info
        path: deployment.env

    - name: Build Summary
      run: |
        echo "### 🚀 Job Service Build Summary" >> $GITHUB_STEP_SUMMARY
        echo "- **Image**: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest" >> $GITHUB_STEP_SUMMARY
        echo "- **Context**: job-service/" >> $GITHUB_STEP_SUMMARY
        echo "- **Platform**: linux/amd64" >> $GITHUB_STEP_SUMMARY

  deploy:
    runs-on: [self-hosted]
    needs: [build-and-push]
    if: github.ref == 'refs/heads/main'
    
    permissions:
      contents: read
      packages: read

    steps:
    - name: Checkout repository
      uses: actions/checkout@v4

    - name: Download deployment artifact
      uses: actions/download-artifact@v4
      with:
        name: job-service-deployment-info

    - name: Load deployment info
      run: |
        source deployment.env
        echo "IMAGE_TAG_FROM_BUILD=$IMAGE_TAG" >> $GITHUB_ENV

    - name: Determine image tag
      id: image_tag
      run: |
        if [[ "${{ github.event_name }}" == "workflow_dispatch" && -n "${{ github.event.inputs.image_tag }}" ]]; then
          echo "tag=${{ github.event.inputs.image_tag }}" >> $GITHUB_OUTPUT
        else
          echo "tag=$IMAGE_TAG_FROM_BUILD" >> $GITHUB_OUTPUT
        fi

    - name: Setup kubectl
      uses: azure/setup-kubectl@v3
      with:
        version: 'v1.28.0'

    - name: Configure kubectl
      run: |
        mkdir -p ~/.kube
        echo "${{ secrets.KUBE_CONFIG }}" | base64 -d > ~/.kube/config
        chmod 600 ~/.kube/config

    - name: Verify kubectl connection
      run: |
        kubectl cluster-info
        kubectl get nodes

    - name: Update deployment image
      run: |
        kubectl set image deployment/hackload-job-service \
          job-service=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ steps.image_tag.outputs.tag }} \
          -n hub
        
        echo "Updated deployment with image: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ steps.image_tag.outputs.tag }}"

    - name: Wait for rollout
      run: |
        kubectl rollout status deployment/hackload-job-service -n hub --timeout=300s

    - name: Verify deployment
      run: |
        kubectl get pods -n hub -l app=hackload-job-service
        kubectl get deployment hackload-job-service -n hub -o wide
        echo "Job Service deployment successful!"

    - name: Get deployment info
      run: |
        echo "### Job Service Deployment Summary" >> $GITHUB_STEP_SUMMARY
        echo "- **Image**: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ steps.image_tag.outputs.tag }}" >> $GITHUB_STEP_SUMMARY
        echo "- **Namespace**: hub" >> $GITHUB_STEP_SUMMARY
        echo "- **Deployment**: hackload-job-service" >> $GITHUB_STEP_SUMMARY
        echo "- **Status**: $(kubectl get deployment hackload-job-service -n hub -o jsonpath='{.status.conditions[?(@.type=="Available")].status}')" >> $GITHUB_STEP_SUMMARY
        echo "- **Ready Replicas**: $(kubectl get deployment hackload-job-service -n hub -o jsonpath='{.status.readyReplicas}')/$(kubectl get deployment hackload-job-service -n hub -o jsonpath='{.spec.replicas}')" >> $GITHUB_STEP_SUMMARY

  notify-failure:
    runs-on: [self-hosted]
    if: failure()
    needs: [build-and-push, deploy]
    steps:
    - name: Notify on failure
      run: |
        echo "### ❌ Job Service Build and Deploy Workflow Failed" >> $GITHUB_STEP_SUMMARY
        echo "- **Workflow**: ${{ github.workflow }}" >> $GITHUB_STEP_SUMMARY
        echo "- **Run ID**: ${{ github.run_id }}" >> $GITHUB_STEP_SUMMARY
        echo "- **Commit**: ${{ github.sha }}" >> $GITHUB_STEP_SUMMARY
        echo "- **Branch**: ${{ github.ref_name }}" >> $GITHUB_STEP_SUMMARY
```

### Package.json Scripts
```json
{
  "name": "hackload-job-service",
  "version": "1.0.0",
  "description": "Background job service for HackLoad team criteria monitoring",
  "main": "dist/index.js",
  "scripts": {
    "start": "node dist/index.js",
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "build:docker": "docker build -t hackload/job-service .",
    "test": "jest",
    "test:watch": "jest --watch",
    "lint": "eslint src --ext .ts",
    "lint:fix": "eslint src --ext .ts --fix",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "node-cron": "^3.0.2",
    "typescript": "^5.3.0",
    "tsx": "^4.6.0",
    "@types/node": "^20.10.0",
    "@types/node-cron": "^3.0.8"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "@types/jest": "^29.5.0",
    "ts-jest": "^29.1.0",
    "eslint": "^8.55.0",
    "@typescript-eslint/eslint-plugin": "^6.14.0",
    "@typescript-eslint/parser": "^6.14.0"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/hackload-kz/infra"
  },
  "author": "HackLoad Team",
  "license": "MIT"
}
```

## Repository Structure

### Monorepo Layout
```
hackload-infra/                      # Root repository
├── organizer-app/                   # Existing Next.js hackathon management app
│   ├── src/
│   ├── prisma/
│   ├── Dockerfile
│   └── package.json
├── terraform/                       # Existing infrastructure as code
│   ├── src/
│   │   ├── environments/
│   │   ├── modules/
│   │   └── apps/
│   └── docs/
├── job-service/                     # New background job service
│   ├── src/
│   │   ├── index.ts                 # Main application entry
│   │   ├── scheduler.ts             # Job scheduler with cron
│   │   ├── config/
│   │   │   ├── index.ts            # Configuration management
│   │   │   └── validation.ts       # Config validation
│   │   ├── services/
│   │   │   ├── base-service.ts     # Abstract base service
│   │   │   ├── git-monitor.ts      # Git repository monitoring
│   │   │   ├── deployment-monitor.ts # Deployment health checks
│   │   │   ├── k6-services.ts      # Performance monitoring
│   │   │   └── cost-tracking.ts    # Cost analysis service
│   │   ├── lib/
│   │   │   ├── api-client.ts       # Hub API client
│   │   │   ├── github-client.ts    # GitHub API client
│   │   │   ├── grafana-client.ts   # Grafana API client
│   │   │   ├── metrics.ts          # Prometheus metrics
│   │   │   └── logger.ts           # Structured logging
│   │   ├── types/
│   │   │   ├── config.ts           # Configuration types
│   │   │   ├── criteria.ts         # Criteria types
│   │   │   └── services.ts         # Service interfaces
│   │   └── health/
│   │       └── server.ts           # Health check server
│   ├── tests/
│   │   ├── services/
│   │   ├── lib/
│   │   └── fixtures/
│   ├── k8s/
│   │   ├── deployment.yaml         # Kubernetes deployment
│   │   ├── configmap.yaml          # Configuration
│   │   ├── secret.yaml.example     # Secret template
│   │   └── service.yaml            # Service definition
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── jest.config.js
│   ├── eslint.config.js
│   └── README.md
├── docs/                           # Shared documentation
│   ├── background-job-service-design.md
│   └── ...
├── .github/
│   └── workflows/
│       ├── docker-build-deploy.yml # Existing organizer-app CI/CD
│       └── job-service.yml         # New job service CI/CD
├── load-testing/                   # Existing load testing resources
├── CLAUDE.md                       # Project-wide instructions
├── README.md
└── LICENSE
```

### Development Commands

#### Job Service Development (from `/job-service` directory)
```bash
# Navigate to job service
cd job-service

# Install dependencies
npm install

# Local development with hot reload
npm run dev

# Build for production
npm run build

# Build Docker image locally
npm run build:docker

# Run tests
npm test
npm run test:watch

# Lint and type check
npm run lint
npm run type-check
```

#### Monorepo Commands (from root directory)
```bash
# Work on organizer app
cd organizer-app
npm run dev

# Work on infrastructure
cd terraform/src/environments/production
terraform plan

# Work on job service
cd job-service
npm run dev

# Build all Docker images
docker build -t hackload/organizer-app ./organizer-app
docker build -t hackload/job-service ./job-service
```

### Deployment Steps

#### 1. Setup GitHub Repository Secrets
```bash
# Required secrets in GitHub repository settings:
KUBE_CONFIG          # Base64-encoded kubeconfig file
GITHUB_TOKEN         # Automatically provided by GitHub Actions
```

#### 2. Create Kubernetes Resources
```bash
# Apply configuration and secrets first
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml

# Apply deployment and service
kubectl apply -f k8s/deployment.yaml  
kubectl apply -f k8s/service.yaml
```

#### 3. Verify Deployment
```bash
# Check deployment status
kubectl get deployments -n hub
kubectl get pods -n hub -l app=hackload-job-service

# Check logs
kubectl logs -n hub -l app=hackload-job-service -f

# Test health endpoint
kubectl port-forward -n hub deployment/hackload-job-service 8080:8080
curl http://localhost:8080/health
```

### CI/CD Pipeline Features

- **Multi-architecture builds**: Supports both AMD64 and ARM64
- **Layer caching**: Uses GitHub Actions cache for faster builds
- **Security scanning**: Can integrate with security scanning tools
- **Automatic deployment**: Deploys to production on main branch pushes
- **Rollback support**: Kubernetes deployment history for rollbacks
- **Health verification**: Waits for successful deployment before completing

This pipeline ensures reliable, automated delivery of the job service with proper monitoring and deployment verification.

---

This architecture provides a robust, scalable foundation for automated team criteria monitoring while integrating seamlessly with the existing HackLoad infrastructure.