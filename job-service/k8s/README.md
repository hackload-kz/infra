# Kubernetes Deployment Guide

This directory contains Kubernetes manifests for deploying the HackLoad Job Service.

## Files Overview

- `configmap.yaml` - Configuration settings for the job service
- `secret.yaml.example` - Template for sensitive configuration (API keys, tokens)
- `deployment.yaml` - Main application deployment
- `service.yaml` - Service definition for health and metrics endpoints

## Prerequisites

1. **Kubernetes cluster** with access configured
2. **Namespace** `hub` should exist
3. **GitHub Container Registry access** for pulling the image
4. **Hub API service** running and accessible
5. **Service API key** from the Hub service

## Deployment Steps

### 1. Create Namespace (if not exists)

```bash
kubectl create namespace hub
```

### 2. Create Secrets

Copy the secret template and fill in actual values:

```bash
cp secret.yaml.example secret.yaml
# Edit secret.yaml with your actual values
kubectl apply -f secret.yaml
```

**Required secrets:**
- `SERVICE_API_KEY` - API key for Hub service authentication
- `GITHUB_TOKEN` - GitHub personal access token for repository monitoring

**Optional secrets:**
- `GRAFANA_TOKEN` - For K6 performance monitoring (when enabled)
- Cloud provider credentials for cost tracking (when enabled)

### 3. Apply Configuration

```bash
kubectl apply -f configmap.yaml
```

### 4. Deploy the Service

```bash
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml
```

### 5. Verify Deployment

```bash
# Check deployment status
kubectl get deployments -n hub
kubectl get pods -n hub -l app=hackload-job-service

# Check service
kubectl get services -n hub hackload-job-service

# Check logs
kubectl logs -n hub -l app=hackload-job-service -f

# Test health endpoint
kubectl port-forward -n hub service/hackload-job-service 8080:8080
curl http://localhost:8080/health

# Test metrics endpoint
kubectl port-forward -n hub service/hackload-job-service 9090:9090
curl http://localhost:9090/metrics
```

## Configuration Options

### Environment Variables

The service can be configured via environment variables in the ConfigMap:

#### Core Configuration
- `NODE_ENV` - Runtime environment (production/development)
- `LOG_LEVEL` - Logging level (error/warn/info/debug)
- `API_BASE_URL` - Hub API base URL
- `SERVICE_API_KEY` - Hub service API key (secret)

#### Service Enablement
- `GIT_MONITOR_ENABLED` - Enable Git repository monitoring
- `DEPLOYMENT_MONITOR_ENABLED` - Enable deployment monitoring
- `K6_SERVICES_ENABLED` - Enable K6 performance monitoring
- `COST_TRACKING_ENABLED` - Enable cost tracking

#### Scheduling
- `GIT_MONITOR_INTERVAL` - Git monitor cron schedule (default: every 30 min)
- `DEPLOYMENT_MONITOR_INTERVAL` - Deployment monitor cron schedule (default: every 15 min)

#### GitHub Configuration
- `GITHUB_TOKEN` - GitHub API token (secret)
- `GITHUB_API_URL` - GitHub API URL (default: https://api.github.com)

### Resource Configuration

The deployment is configured with:

- **CPU**: 200m request, 500m limit
- **Memory**: 256Mi request, 512Mi limit
- **Replicas**: 1 (single instance to avoid job duplication)

## Monitoring

The service exposes two endpoints:

### Health Endpoints (Port 8080)
- `/health` - Overall service health with detailed status
- `/health/ready` - Readiness probe (used by Kubernetes)
- `/health/live` - Liveness probe (used by Kubernetes)

### Metrics Endpoint (Port 9090)
- `/metrics` - Prometheus metrics
- `/metrics/json` - JSON format metrics

## Troubleshooting

### Common Issues

1. **Service fails to start**
   ```bash
   kubectl logs -n hub -l app=hackload-job-service
   ```
   Check for configuration validation errors.

2. **API authentication failures**
   - Verify `SERVICE_API_KEY` is correct
   - Check Hub service is accessible from the cluster
   - Verify API base URL is correct

3. **GitHub API failures**
   - Verify `GITHUB_TOKEN` is valid and has required permissions
   - Check rate limits on GitHub API

4. **Pod crashes or restarts**
   - Check resource limits
   - Review logs for memory/CPU issues
   - Verify health check endpoints

### Useful Commands

```bash
# Get detailed deployment info
kubectl describe deployment hackload-job-service -n hub

# Get pod details
kubectl describe pod -l app=hackload-job-service -n hub

# Check events
kubectl get events -n hub --sort-by=.metadata.creationTimestamp

# Scale deployment
kubectl scale deployment hackload-job-service --replicas=1 -n hub

# Restart deployment
kubectl rollout restart deployment hackload-job-service -n hub

# View configuration
kubectl get configmap job-service-config -n hub -o yaml
kubectl get secret job-service-secrets -n hub -o yaml
```

## Security Considerations

- The deployment runs as non-root user (UID 1001)
- Read-only root filesystem for security
- No service account token mounted
- All sensitive data stored in Kubernetes secrets
- Network policies can be added for additional security

## Scaling

The job service is designed to run as a single replica to avoid duplicate job execution. If high availability is needed, consider:

1. Leader election pattern
2. Distributed job scheduling
3. External job queue system

For now, Kubernetes will automatically restart the pod if it fails.