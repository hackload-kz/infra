# Модуль Grafana

## Обзор

Этот модуль развертывает Grafana, мощную платформу визуализации и аналитики, для предоставления комплексных дашбордов и интерфейсов мониторинга для платформы HackLoad 2025. Он создает специализированные дашборды для метрик нагрузочного тестирования, производительности команд-участников, состояния инфраструктуры и отслеживания прогресса хакатона в реальном времени.

## Функции

- **Пользовательские дашборды** для нагрузочного тестирования и мониторинга хакатона
- **Мультитенантные представления** для разных команд-участников
- **Визуализация в реальном времени** результатов K6 тестов
- **Интеграция дашборда оповещений** с Prometheus
- **Управление источниками данных** для Prometheus и баз данных
- **Аутентификация пользователей** и ролевой доступ
- **Предоставление дашбордов** через ConfigMaps
- **Управление плагинами** для расширенной функциональности

## Использование

```hcl
module "grafana" {
  source = "../../modules/grafana"
  
  namespace   = "monitoring"
  environment = "production"
  
  # Конфигурация Grafana
  grafana_version = "10.0.0"
  admin_user      = "admin"
  admin_password  = "changeme123!"
  
  # Источники данных
  prometheus_url = module.prometheus.prometheus_url
  database_url   = module.cloudnative_pg.connection_url
  
  # Хранилище
  enable_persistence = true
  storage_size      = "10Gi"
  storage_class     = "gp3"
  
  # Ресурсы
  cpu_request    = "200m"
  cpu_limit      = "500m"
  memory_request = "256Mi"
  memory_limit   = "1Gi"
  
  # Аутентификация
  enable_oauth     = false
  oauth_provider   = "github"
  enable_anonymous = false
  
  # Ingress
  enable_ingress = true
  hostname      = "grafana.hackload.example.com"
  tls_enabled   = true
  
  # Plugins
  install_plugins = [
    "grafana-piechart-panel",
    "grafana-worldmap-panel",
    "grafana-clock-panel"
  ]
  
  # Custom dashboards
  enable_hackload_dashboards = true
  
  tags = {
    Component = "visualization"
    Project   = "HackLoad2025"
  }
}
```

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|----------|
| namespace | Kubernetes namespace | string | "monitoring" | no |
| environment | Environment name | string | - | yes |
| grafana_version | Grafana container version | string | "10.0.0" | no |
| admin_user | Admin username | string | "admin" | no |
| admin_password | Admin password | string | - | yes |
| prometheus_url | Prometheus data source URL | string | - | yes |
| database_url | Database connection URL | string | "" | no |
| enable_persistence | Enable persistent storage | bool | true | no |
| storage_size | Persistent storage size | string | "5Gi" | no |
| storage_class | Kubernetes storage class | string | "gp2" | no |
| cpu_request | CPU request | string | "100m" | no |
| cpu_limit | CPU limit | string | "500m" | no |
| memory_request | Memory request | string | "128Mi" | no |
| memory_limit | Memory limit | string | "1Gi" | no |
| enable_oauth | Enable OAuth authentication | bool | false | no |
| oauth_provider | OAuth provider (github/google/etc) | string | "" | no |
| enable_anonymous | Enable anonymous access | bool | false | no |
| enable_ingress | Create ingress resource | bool | false | no |
| hostname | Ingress hostname | string | "" | no |
| tls_enabled | Enable TLS for ingress | bool | false | no |
| install_plugins | List of Grafana plugins to install | list(string) | [] | no |
| enable_hackload_dashboards | Install HackLoad-specific dashboards | bool | true | no |

## Outputs

| Name | Description |
|------|-------------|
| grafana_service | Grafana service name |
| grafana_url | Grafana web UI URL |
| admin_secret | Secret containing admin credentials |
| ingress_hostname | External hostname (if ingress enabled) |

## Pre-configured Dashboards

### 1. HackLoad Overview Dashboard
**Purpose**: High-level view of the entire hackathon progress

**Panels**:
- Active teams and registered endpoints
- Currently running load tests
- Overall system health
- Resource utilization summary
- Top performing teams

```json
{
  "dashboard": {
    "title": "HackLoad 2025 - Overview",
    "panels": [
      {
        "title": "Active Teams",
        "type": "stat",
        "targets": [
          {
            "expr": "count(hackload_team_registered)"
          }
        ]
      },
      {
        "title": "Running Tests",
        "type": "stat",
        "targets": [
          {
            "expr": "hackload:active_tests"
          }
        ]
      },
      {
        "title": "Success Rate by Team",
        "type": "table",
        "targets": [
          {
            "expr": "hackload:test_success_rate by (team_id)"
          }
        ]
      }
    ]
  }
}
```

### 2. Load Testing Dashboard
**Purpose**: Detailed view of K6 load test execution and results

**Panels**:
- Request rate and response times
- Error rates and status codes
- Virtual users and throughput
- Test duration and completion status
- Resource utilization during tests

### 3. Team Performance Dashboard
**Purpose**: Individual team performance metrics

**Panels**:
- Team-specific response times
- Endpoint availability
- Error patterns
- Performance trends over time
- Comparison with other teams

### 4. Infrastructure Health Dashboard
**Purpose**: Kubernetes cluster and application health

**Panels**:
- Node resource utilization
- Pod status and restarts
- Database performance metrics
- Network traffic and latency
- Storage usage

### 5. Real-time Results Dashboard
**Purpose**: Live view during active testing sessions

**Panels**:
- Live test execution status
- Real-time metrics streaming
- Alert notifications
- Current leaderboard
- System capacity utilization

## Data Source Configuration

### Prometheus Data Source
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-datasource-prometheus
data:
  prometheus.yaml: |
    apiVersion: 1
    datasources:
    - name: Prometheus
      type: prometheus
      url: http://prometheus:9090
      access: proxy
      isDefault: true
      jsonData:
        timeInterval: "5s"
        queryTimeout: "60s"
```

### PostgreSQL Data Source
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-datasource-postgres
data:
  postgres.yaml: |
    apiVersion: 1
    datasources:
    - name: HackLoad Database
      type: postgres
      url: hackload-postgres-rw:5432
      database: hackload
      user: grafana_readonly
      secureJsonData:
        password: "${POSTGRES_PASSWORD}"
      jsonData:
        sslmode: "require"
        postgresVersion: 1500
```

## Dashboard Provisioning

### Dashboard ConfigMap
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-dashboards
data:
  hackload-overview.json: |
    {
      "dashboard": {
        "id": null,
        "title": "HackLoad Overview",
        "tags": ["hackload", "overview"],
        "timezone": "browser",
        "panels": [
          // ... dashboard definition
        ],
        "time": {
          "from": "now-1h",
          "to": "now"
        },
        "refresh": "5s"
      }
    }
```

### Provider Configuration
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-dashboard-providers
data:
  providers.yaml: |
    apiVersion: 1
    providers:
    - name: 'hackload-dashboards'
      orgId: 1
      folder: 'HackLoad 2025'
      type: file
      disableDeletion: false
      updateIntervalSeconds: 10
      allowUiUpdates: true
      options:
        path: /var/lib/grafana/dashboards/hackload
```

## Custom Panels and Visualizations

### Team Leaderboard Panel
```json
{
  "title": "Team Performance Leaderboard",
  "type": "table",
  "targets": [
    {
      "expr": "sort_desc(hackload:avg_response_time_by_team)",
      "format": "table",
      "instant": true
    }
  ],
  "fieldConfig": {
    "defaults": {
      "custom": {
        "displayMode": "list",
        "filterable": true
      }
    },
    "overrides": [
      {
        "matcher": {
          "id": "byName",
          "options": "Value"
        },
        "properties": [
          {
            "id": "unit",
            "value": "ms"
          },
          {
            "id": "thresholds",
            "value": {
              "steps": [
                {"color": "green", "value": null},
                {"color": "yellow", "value": 500},
                {"color": "red", "value": 1000}
              ]
            }
          }
        ]
      }
    ]
  }
}
```

### Real-time Test Status
```json
{
  "title": "Active Load Tests",
  "type": "status-panel",
  "targets": [
    {
      "expr": "kube_pod_status_phase{pod=~\"k6-test-.*\",phase=\"Running\"}",
      "legendFormat": "{{pod}}"
    }
  ],
  "fieldConfig": {
    "defaults": {
      "mappings": [
        {
          "options": {
            "0": {"text": "Stopped", "color": "red"},
            "1": {"text": "Running", "color": "green"}
          },
          "type": "value"
        }
      ]
    }
  }
}
```

## Authentication and Authorization

### OAuth Configuration (GitHub)
```yaml
env:
  GF_AUTH_GITHUB_ENABLED: "true"
  GF_AUTH_GITHUB_ALLOW_SIGN_UP: "true"
  GF_AUTH_GITHUB_CLIENT_ID: "${GITHUB_CLIENT_ID}"
  GF_AUTH_GITHUB_CLIENT_SECRET: "${GITHUB_CLIENT_SECRET}"
  GF_AUTH_GITHUB_SCOPES: "user:email,read:org"
  GF_AUTH_GITHUB_AUTH_URL: "https://github.com/login/oauth/authorize"
  GF_AUTH_GITHUB_TOKEN_URL: "https://github.com/login/oauth/access_token"
  GF_AUTH_GITHUB_API_URL: "https://api.github.com/user"
```

### Role-based Access Control
```yaml
# Grafana configuration
auth.basic:
  enabled: true
auth.anonymous:
  enabled: false
  
users:
  allow_sign_up: false
  auto_assign_org: true
  auto_assign_org_role: Viewer
  
# Organization roles
# Admin: Full access to all dashboards and settings
# Editor: Can edit dashboards but not admin settings
# Viewer: Read-only access to dashboards
```

## Alerting Integration

### Alert Rules
```json
{
  "alert": {
    "name": "High Response Time",
    "message": "Response time is above threshold",
    "frequency": "10s",
    "conditions": [
      {
        "query": {
          "queryType": "",
          "refId": "A"
        },
        "reducer": {
          "type": "avg",
          "params": []
        },
        "evaluator": {
          "params": [1000],
          "type": "gt"
        }
      }
    ],
    "executionErrorState": "alerting",
    "noDataState": "no_data",
    "for": "1m"
  }
}
```

### Notification Channels
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-notifications
data:
  notifications.yaml: |
    notifiers:
    - name: hackload-slack
      type: slack
      settings:
        url: "${SLACK_WEBHOOK_URL}"
        channel: "#hackload-alerts"
        title: "HackLoad Alert"
        text: "{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}"
```

## Kubernetes Resources Created

- **Deployment**: Grafana application server
- **Service**: Web interface access
- **ConfigMap**: Configuration files and dashboards
- **Secret**: Authentication credentials
- **PersistentVolumeClaim**: Dashboard and plugin storage
- **Ingress**: External access (if enabled)
- **ServiceAccount**: RBAC permissions

## Performance Optimization

### Caching Configuration
```yaml
env:
  # Query result caching
  GF_QUERY_CACHE_TTL: "5m"
  
  # Dashboard caching
  GF_DASHBOARDS_MIN_REFRESH_INTERVAL: "5s"
  
  # Memory settings
  GF_SERVER_ENABLE_GZIP: "true"
```

### Database Connection Pooling
```yaml
database:
  type: postgres
  host: hackload-postgres-rw:5432
  name: grafana
  user: grafana
  max_open_conn: 20
  max_idle_conn: 5
  conn_max_lifetime: 300
```

## Security

### Network Policies
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: grafana-netpol
spec:
  podSelector:
    matchLabels:
      app: grafana
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - protocol: TCP
      port: 3000
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: prometheus
    ports:
    - protocol: TCP
      port: 9090
```

### Secret Management
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: grafana-credentials
type: Opaque
data:
  admin-user: YWRtaW4=  # base64: admin
  admin-password: <base64-encoded-password>
  github-client-id: <base64-encoded-id>
  github-client-secret: <base64-encoded-secret>
```

## Backup and Recovery

### Dashboard Backup
```bash
# Export all dashboards
curl -u admin:password http://grafana:3000/api/search | \
  jq -r '.[] | select(.type == "dash-db") | .uid' | \
  xargs -I {} curl -u admin:password \
    http://grafana:3000/api/dashboards/uid/{} > dashboard-{}.json
```

### Configuration Backup
```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: grafana-backup
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: curlimages/curl
            command:
            - /bin/sh
            - -c
            - |
              # Backup dashboards and data sources
              curl -u $GRAFANA_USER:$GRAFANA_PASSWORD \
                $GRAFANA_URL/api/search > /backup/dashboards.json
```

## Troubleshooting

### Common Issues

1. **Dashboard Not Loading**
   - Check data source connectivity
   - Verify Prometheus queries
   - Review Grafana logs

2. **Authentication Problems**
   - Verify OAuth configuration
   - Check secret values
   - Review RBAC settings

3. **Performance Issues**
   - Optimize queries and time ranges
   - Check resource limits
   - Review caching settings

### Useful Commands

```bash
# Check Grafana status
kubectl get pods -l app=grafana -n monitoring

# View logs
kubectl logs -f deployment/grafana -n monitoring

# Port forward for local access
kubectl port-forward svc/grafana 3000:3000 -n monitoring

# Reset admin password
kubectl exec -it deployment/grafana -n monitoring -- \
  grafana-cli admin reset-admin-password newpassword
```

## Integration Examples

### Custom HackLoad Metrics
```javascript
// K6 script with custom metrics for Grafana
import { Counter, Trend, Rate } from 'k6/metrics';

export const testMetrics = {
  ticketBookings: new Counter('hackload_ticket_bookings_total'),
  bookingLatency: new Trend('hackload_booking_latency_ms'),
  bookingSuccessRate: new Rate('hackload_booking_success_rate'),
};

export default function() {
  const response = http.post('/api/bookings', payload);
  
  testMetrics.ticketBookings.add(1, { 
    team_id: __ENV.TEAM_ID,
    event_type: 'concert' 
  });
  
  testMetrics.bookingLatency.add(response.timings.duration);
  testMetrics.bookingSuccessRate.add(response.status === 200);
}
```

## Related Modules

- `prometheus`: Primary data source for metrics
- `hackload-app`: Application metrics and business logic
- `k6-operator`: Load testing metrics and results
- `cloudnative-pg`: Database performance visualization
