# HackLoad Job Service

A production-ready background job service for monitoring hackathon team progress across multiple criteria including Git repository activity, deployment status, performance metrics, and cost tracking.

## 🚀 Features

- **Git Repository Monitoring**: Track team commits, repository activity, and code quality metrics via GitHub API
- **Deployment Monitoring**: Monitor application accessibility, response times, and deployment health  
- **Performance Testing**: Integrate with K6/Grafana for P95 latency and success rate tracking
- **Cost Tracking**: Monitor cloud infrastructure costs across multiple providers (AWS, Azure, GCP)
- **Health & Metrics**: Comprehensive health checks and Prometheus metrics endpoints
- **Production Ready**: Docker containers, Kubernetes manifests, and CI/CD pipeline included

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Services](#services)
- [Development](#development)
- [Deployment](#deployment)
- [API Reference](#api-reference)
- [Monitoring](#monitoring)
- [Contributing](#contributing)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Docker (for containerized deployment)
- Kubernetes cluster (for production deployment)

### Local Development

1. **Clone and install dependencies**:
   ```bash
   cd job-service
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Build and run**:
   ```bash
   npm run build
   npm start
   ```

4. **Verify installation**:
   ```bash
   curl http://localhost:8080/health
   curl http://localhost:9090/metrics
   ```

### Docker Quick Start

```bash
# Build image
docker build -t hackload/job-service .

# Run with environment file
docker run --env-file .env -p 8080:8080 -p 9090:9090 hackload/job-service
```

## ⚙️ Configuration

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `API_BASE_URL` | Hub API base URL | `https://hub.hackload.kz` |
| `SERVICE_API_KEY` | Authentication key for Hub API | `hackload-service-key-xxx` |

### Optional Configuration

<details>
<summary><strong>Core Settings</strong></summary>

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Runtime environment |
| `LOG_LEVEL` | `info` | Logging level (error, warn, info, debug) |
| `API_TIMEOUT` | `30000` | API request timeout in milliseconds |
| `API_RETRIES` | `3` | Number of API retry attempts |

</details>

<details>
<summary><strong>Service Enablement</strong></summary>

| Variable | Default | Description |
|----------|---------|-------------|
| `GIT_MONITOR_ENABLED` | `true` | Enable Git repository monitoring |
| `DEPLOYMENT_MONITOR_ENABLED` | `true` | Enable deployment monitoring |
| `K6_SERVICES_ENABLED` | `false` | Enable K6 performance monitoring |
| `COST_TRACKING_ENABLED` | `false` | Enable cost tracking |

</details>

<details>
<summary><strong>GitHub Configuration</strong></summary>

| Variable | Default | Description |
|----------|---------|-------------|
| `GITHUB_TOKEN` | - | GitHub personal access token |
| `GITHUB_API_URL` | `https://api.github.com` | GitHub API base URL |

</details>

<details>
<summary><strong>Monitoring & Health</strong></summary>

| Variable | Default | Description |
|----------|---------|-------------|
| `HEALTH_CHECK_PORT` | `8080` | Health check endpoint port |
| `METRICS_PORT` | `9090` | Prometheus metrics port |
| `METRICS_ENABLED` | `true` | Enable metrics collection |

</details>

### Complete Configuration Reference

See [.env.example](./.env.example) for all available configuration options.

## 🔧 Services

### Git Monitor Service

Monitors team Git repositories for activity and code quality metrics.

**Tracked Metrics**:
- Total commits and recent commit count
- Unique authors and last commit date
- Repository size and programming language
- README, license, and documentation presence
- Stars, forks, and community engagement

**Configuration**:
```bash
GIT_MONITOR_ENABLED=true
GIT_MONITOR_INTERVAL="*/30 * * * *"  # Every 30 minutes
GITHUB_TOKEN=your_github_token
```

### Deployment Monitor Service

Monitors deployed applications for accessibility and performance.

**Tracked Metrics**:
- HTTP response status and time
- Application accessibility
- SSL/HTTPS usage
- Custom domain detection
- Uptime monitoring

**Configuration**:
```bash  
DEPLOYMENT_MONITOR_ENABLED=true
DEPLOYMENT_MONITOR_INTERVAL="*/15 * * * *"  # Every 15 minutes
HTTP_TIMEOUT=10000
```

### K6 Performance Services ⚠️ *Experimental*

Integrates with Grafana to track K6 load testing metrics.

**Tracked Metrics**:
- P95 latency and response times
- Success rate and error rate
- Request throughput
- Performance threshold compliance

**Configuration**:
```bash
K6_SERVICES_ENABLED=true
K6_SERVICES_INTERVAL="0 */6 * * *"  # Every 6 hours
GRAFANA_API_URL=https://grafana.example.com/api
GRAFANA_TOKEN=your_grafana_token
```

### Cost Tracking Service ⚠️ *Experimental*

Monitors cloud infrastructure costs across providers.

**Tracked Metrics**:
- Total cost and cost breakdown
- Budget utilization
- Cost trends over time
- Multi-cloud cost aggregation

**Configuration**:
```bash
COST_TRACKING_ENABLED=true
COST_TRACKING_INTERVAL="0 */6 * * *"  # Every 6 hours
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
```

## 💻 Development

### Prerequisites

- Node.js 18+
- TypeScript knowledge
- Docker (optional)
- Kubernetes cluster access (for deployment testing)

### Development Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start development mode**:
   ```bash
   npm run dev
   ```

3. **Run linting and type checking**:
   ```bash
   npm run lint
   npm run type-check
   ```

4. **Run tests**:
   ```bash
   npm test
   npm run test:integration
   npm run test:coverage
   ```

5. **Local testing script**:
   ```bash
   ./test-local.sh
   ```

### Project Structure

```
job-service/
├── src/                    # Source code
│   ├── config/            # Configuration management
│   ├── health/            # Health check endpoints
│   ├── lib/               # Shared libraries
│   ├── services/          # Job service implementations
│   └── types/             # TypeScript type definitions
├── tests/                 # Test files
│   ├── integration/       # Integration tests
│   ├── fixtures/          # Test data
│   └── services/          # Unit tests
├── k8s/                   # Kubernetes manifests
├── .env.example           # Environment configuration template
├── Dockerfile             # Container image definition
└── README.md              # This file
```

### Adding a New Service

1. **Create service class**:
   ```typescript
   // src/services/my-service.ts
   import { BaseJobService } from './base-service';
   
   export class MyService extends BaseJobService {
     readonly criteriaType = 'MY_CRITERIA';
     readonly serviceName = 'MyService';
     
     async collectMetrics(team: Team): Promise<MetricsData> {
       // Implementation
     }
   }
   ```

2. **Register in main application**:
   ```typescript
   // src/index.ts
   const myService = new MyService();
   myService.setApiClient(apiClient);
   scheduler.registerService(myService, config.myService);
   ```

3. **Add configuration**:
   ```typescript
   // src/config/validation.ts
   myService: {
     enabled: getBoolean('MY_SERVICE_ENABLED', false),
     interval: getString('MY_SERVICE_INTERVAL', '0 * * * *'),
     timeout: getNumber('MY_SERVICE_TIMEOUT', 300000),
     retries: getNumber('MY_SERVICE_RETRIES', 2)
   }
   ```

### Code Standards

- **ESLint**: Run `npm run lint` before commits
- **TypeScript**: Strict mode enabled, no `any` types
- **Testing**: Minimum 80% code coverage required
- **Documentation**: JSDoc comments for public APIs
- **Commits**: Conventional commit messages

## 🚢 Deployment

### Docker Deployment

**Build and run locally**:
```bash
# Build image
docker build -t hackload/job-service .

# Run with environment file
docker run --env-file .env hackload/job-service
```

**Multi-stage build optimized for production**:
- Security: Non-root user, minimal attack surface
- Size: Alpine-based image, ~150MB final size
- Health: Built-in health checks
- Performance: Optimized Node.js runtime

### Kubernetes Deployment

**Prerequisites**:
- Kubernetes cluster 1.24+
- kubectl configured with cluster access
- ConfigMap and Secret resources

**Deploy**:
```bash
# Apply configuration
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml

# Deploy application
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml

# Verify deployment
kubectl get pods -l app=hackload-job-service
kubectl logs deployment/hackload-job-service
```

**Production configuration**:
- **Resources**: 512MB memory, 0.5 CPU cores
- **Scaling**: Horizontal Pod Autoscaler ready
- **Health**: Liveness and readiness probes
- **Security**: Non-privileged containers, security contexts

### GitHub Actions CI/CD

Automated pipeline for testing, building, and deployment:

1. **Quality Gates**: ESLint, TypeScript, tests
2. **Docker Build**: Multi-platform images 
3. **Registry Push**: GitHub Container Registry
4. **K8s Deploy**: Automated deployment to cluster
5. **Health Verification**: Post-deployment checks

**Trigger deployment**:
```bash
git push origin main  # Automatic deployment
```

**Manual deployment**:
```bash
# GitHub Actions UI -> Run workflow -> Specify image tag
```

## 📊 API Reference

### Health Endpoints

#### `GET /health`
Returns overall service health status.

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T12:00:00.000Z",
  "uptime": 3600,
  "services": [
    {
      "name": "GitMonitorService", 
      "status": "healthy",
      "lastRun": "2024-01-15T11:30:00.000Z",
      "errorRate": 0
    }
  ]
}
```

#### `GET /health/live`
Kubernetes liveness probe endpoint.

**Response**: `200 OK` if service is running

#### `GET /health/ready` 
Kubernetes readiness probe endpoint.

**Response**: `200 OK` if service is ready to handle requests

### Metrics Endpoints

#### `GET /metrics`
Prometheus metrics in text format.

**Sample Metrics**:
```
# HELP job_service_runs_total Total number of job runs
# TYPE job_service_runs_total counter
job_service_runs_total{service="GitMonitorService"} 42

# HELP job_service_errors_total Total number of job errors  
# TYPE job_service_errors_total counter
job_service_errors_total{service="GitMonitorService"} 2

# HELP job_service_duration_seconds Job execution duration
# TYPE job_service_duration_seconds histogram
job_service_duration_seconds_bucket{service="GitMonitorService",le="1"} 35
job_service_duration_seconds_bucket{service="GitMonitorService",le="5"} 42
```

## 📈 Monitoring

### Key Metrics to Monitor

**Service Health**:
- `job_service_runs_total` - Total job executions
- `job_service_errors_total` - Total job errors
- `job_service_duration_seconds` - Job execution time

**System Health**:
- `process_cpu_user_seconds_total` - CPU usage
- `process_resident_memory_bytes` - Memory usage
- `nodejs_heap_size_total_bytes` - Heap memory

**Business Metrics**:
- `teams_processed_total` - Teams evaluated
- `criteria_updates_total` - Criteria updates sent
- `api_requests_total` - Hub API requests

### Alerting Rules

**Critical Alerts**:
```yaml
# Service down
up{job="hackload-job-service"} == 0

# High error rate  
rate(job_service_errors_total[5m]) / rate(job_service_runs_total[5m]) > 0.1

# Service not running jobs
increase(job_service_runs_total[1h]) == 0
```

**Warning Alerts**:
```yaml
# Slow job execution
histogram_quantile(0.95, job_service_duration_seconds) > 300

# Memory usage high
process_resident_memory_bytes / 1024 / 1024 > 400  # > 400MB
```

### Grafana Dashboard

Import the included dashboard configuration for monitoring:
- Service health and performance
- Job execution metrics  
- Error rates and trends
- Resource utilization

## 🔧 Troubleshooting

### Common Issues

#### Service Won't Start
```bash
# Check configuration
npm run config-check

# Verify environment variables
env | grep -E "(API_BASE_URL|SERVICE_API_KEY)"

# Check logs
docker logs <container-id>
kubectl logs deployment/hackload-job-service
```

#### GitHub API Rate Limits
```bash
# Check current rate limit
curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/rate_limit

# Solutions:
# 1. Use GitHub App authentication (higher limits)  
# 2. Increase polling intervals
# 3. Implement request queuing
```

#### Hub API Connection Issues
```bash
# Test API connectivity
curl -H "X-API-Key: $SERVICE_API_KEY" $API_BASE_URL/api/health

# Common fixes:
# 1. Verify API key permissions
# 2. Check network connectivity  
# 3. Verify SSL certificates
```

#### Performance Issues
```bash
# Check service metrics
curl http://localhost:9090/metrics | grep job_service

# Monitor resource usage
kubectl top pods -l app=hackload-job-service

# Solutions:
# 1. Increase resource limits
# 2. Reduce job concurrency
# 3. Optimize job intervals
```

### Debug Mode

Enable debug logging for troubleshooting:

```bash
export LOG_LEVEL=debug
npm start
```

Debug output includes:
- Detailed API request/response logs
- Service execution timing
- Configuration loading details
- Error stack traces

### Support

For issues and questions:

1. **Check documentation**: Review this README and inline code comments
2. **Search issues**: Check [GitHub Issues](https://github.com/hackload-kz/infra/issues)
3. **Create issue**: Submit detailed bug report with logs
4. **Community**: Reach out on hackathon communication channels

## 🧪 Testing

### Running Tests

```bash
# Unit tests
npm test

# Integration tests  
npm run test:integration

# Coverage report
npm run test:coverage

# Watch mode for development
npm run test:watch
```

### Test Categories

**Unit Tests** (`tests/services/`):
- Service logic testing
- API client functionality  
- Configuration validation
- Error handling

**Integration Tests** (`tests/integration/`):
- End-to-end workflows
- Service interaction
- Scheduler functionality
- Health endpoint verification

**Local Testing**:
```bash
# Comprehensive local testing
./test-local.sh

# Manual integration testing
npm run dev
curl http://localhost:8080/health
```

### Test Coverage Requirements

- **Minimum**: 80% line coverage
- **Services**: 90% coverage for core services
- **Critical paths**: 100% coverage for error handling
- **Integration**: Full workflow coverage

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

### Development Workflow

1. **Fork the repository**
2. **Create feature branch**: `git checkout -b feature/amazing-feature`
3. **Make changes**: Follow code standards and add tests
4. **Run quality checks**: `npm run lint && npm test`
5. **Commit changes**: Use conventional commit messages
6. **Push branch**: `git push origin feature/amazing-feature`
7. **Create Pull Request**: Provide detailed description

### Code Standards

- **TypeScript**: Strict mode, no `any` types
- **ESLint**: All rules must pass
- **Testing**: New features require tests  
- **Documentation**: Update README for new features
- **Commits**: Follow [Conventional Commits](https://conventionalcommits.org/)

### Pull Request Process

1. **Quality gates**: All CI checks must pass
2. **Code review**: Minimum one approver required  
3. **Testing**: Include unit and integration tests
4. **Documentation**: Update relevant documentation
5. **Breaking changes**: Clearly document in PR description

## 📄 License

This project is part of the HackLoad platform and is proprietary software. See the hackload-infra repository for license details.

## 🔗 Related Projects

- **[HackLoad Hub](../organizer-app/)** - Main hackathon management platform
- **[HackLoad Infrastructure](../terraform/)** - Kubernetes infrastructure as code
- **[HackLoad Docs](../docs/)** - Platform documentation

---

**Built with ❤️ for the HackLoad hackathon platform**