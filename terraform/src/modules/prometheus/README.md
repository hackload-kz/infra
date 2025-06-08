# Модуль Prometheus

## Обзор

Этот модуль развертывает Prometheus, облачно-нативный инструментарий мониторинга и оповещений, для сбора и хранения метрик с платформы HackLoad 2025. Он обеспечивает комплексный мониторинг нагрузочных тестов, производительности приложений, состояния инфраструктуры и метрик команд-участников.

## Функции

- **Мониторинг множественных целей** для K6 тестов, приложений и инфраструктуры
- **Высокая доступность** с несколькими репликами
- **Долгосрочное хранение** с настраиваемым удержанием
- **Обнаружение сервисов** для автоматического обнаружения целей
- **Интеграция Alert Manager** для уведомлений
- **Поддержка федерации** для мульти-кластерных настроек
- **Сбор пользовательских метрик** с компонентов HackLoad

## Использование

```hcl
module "prometheus" {
  source = "../../modules/prometheus"
  
  namespace   = "monitoring"
  environment = "production"
  
  # Конфигурация Prometheus
  prometheus_version = "v2.45.0"
  retention_time     = "30d"
  storage_size       = "100Gi"
  storage_class      = "gp3"
  
  # Высокая доступность
  enable_ha     = true
  replica_count = 2
  
  # Распределение ресурсов
  cpu_request    = "500m"
  cpu_limit      = "2"
  memory_request = "2Gi"
  memory_limit   = "8Gi"
  
  # Обнаружение сервисов
  enable_kubernetes_sd = true
  enable_consul_sd     = false
  
  # Оповещения
  enable_alertmanager = true
  alert_retention     = "7d"
  
  # Внешние интеграции
  enable_pushgateway    = true
  enable_node_exporter  = true
  enable_kube_state_metrics = true
  
  # Remote storage (optional)
  enable_remote_write = false
  remote_write_url    = ""
  
  # Security
  enable_rbac = true
  enable_psp  = false
  
  tags = {
    Component = "monitoring"
    Project   = "HackLoad2025"
  }
}
```

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|----------|
| namespace | Kubernetes namespace | string | "monitoring" | no |
| environment | Environment name | string | - | yes |
| prometheus_version | Prometheus container version | string | "v2.45.0" | no |
| retention_time | Metrics retention period | string | "15d" | no |
| storage_size | Persistent storage size | string | "50Gi" | no |
| storage_class | Kubernetes storage class | string | "gp2" | no |
| enable_ha | Enable high availability mode | bool | false | no |
| replica_count | Number of Prometheus replicas | number | 1 | no |
| cpu_request | CPU request | string | "250m" | no |
| cpu_limit | CPU limit | string | "1" | no |
| memory_request | Memory request | string | "1Gi" | no |
| memory_limit | Memory limit | string | "4Gi" | no |
| enable_kubernetes_sd | Enable Kubernetes service discovery | bool | true | no |
| enable_consul_sd | Enable Consul service discovery | bool | false | no |
| enable_alertmanager | Deploy AlertManager | bool | true | no |
| alert_retention | Alert retention period | string | "5d" | no |
| enable_pushgateway | Deploy Pushgateway | bool | true | no |
| enable_node_exporter | Deploy Node Exporter | bool | true | no |
| enable_kube_state_metrics | Deploy kube-state-metrics | bool | true | no |
| enable_remote_write | Enable remote write | bool | false | no |
| remote_write_url | Remote write endpoint URL | string | "" | no |
| enable_rbac | Enable RBAC | bool | true | no |

## Outputs

| Name | Description |
|------|-------------|
| prometheus_service | Prometheus service name |
| prometheus_url | Prometheus web UI URL |
| alertmanager_service | AlertManager service name |
| pushgateway_service | Pushgateway service name |
| grafana_datasource_url | URL for Grafana data source configuration |

## Service Discovery Configuration

### Kubernetes Service Discovery
```yaml
# Automatic discovery of Kubernetes services
scrape_configs:
  - job_name: 'kubernetes-pods'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
        action: replace
        target_label: __metrics_path__
        regex: (.+)
```

### HackLoad Specific Targets
```yaml
scrape_configs:
  # HackLoad Web Application
  - job_name: 'hackload-app'
    kubernetes_sd_configs:
      - role: endpoints
        namespaces:
          names: ['hackload']
    relabel_configs:
      - source_labels: [__meta_kubernetes_service_label_app]
        action: keep
        regex: hackload-app

  # K6 Load Tests
  - job_name: 'k6-tests'
    kubernetes_sd_configs:
      - role: pod
        namespaces:
          names: ['hackload']
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_label_app]
        action: keep
        regex: k6-test

  # CloudNativePG
  - job_name: 'postgres'
    kubernetes_sd_configs:
      - role: endpoints
        namespaces:
          names: ['hackload']
    relabel_configs:
      - source_labels: [__meta_kubernetes_service_label_cnpg_io_cluster]
        action: keep
        regex: hackload-postgres
```

## Custom Metrics and Rules

### HackLoad Recording Rules
```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: hackload-rules
spec:
  groups:
  - name: hackload.rules
    rules:
    # Load test success rate
    - record: hackload:test_success_rate
      expr: |
        (
          rate(k6_http_reqs_total{status=~"2.."}[5m]) /
          rate(k6_http_reqs_total[5m])
        ) * 100

    # Average response time by team
    - record: hackload:avg_response_time_by_team
      expr: |
        avg(k6_http_req_duration) by (team_id)

    # Active concurrent tests
    - record: hackload:active_tests
      expr: |
        count(kube_pod_info{pod=~"k6-test-.*"})

    # Database connection pool usage
    - record: hackload:db_connection_usage
      expr: |
        (
          postgres_stat_database_numbackends /
          postgres_settings_max_connections
        ) * 100
```

### Alert Rules
```yaml
  - name: hackload.alerts
    rules:
    # High error rate alert
    - alert: HighErrorRate
      expr: hackload:test_success_rate < 95
      for: 2m
      labels:
        severity: warning
      annotations:
        summary: "High error rate detected"
        description: "Error rate is {{ $value }}% for team {{ $labels.team_id }}"

    # Database connection pool exhaustion
    - alert: DatabaseConnectionsHigh
      expr: hackload:db_connection_usage > 80
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "Database connection pool usage high"
        description: "Connection pool usage is {{ $value }}%"

    # Test execution failures
    - alert: TestExecutionFailed
      expr: increase(k6_test_failed_total[5m]) > 0
      for: 1m
      labels:
        severity: warning
      annotations:
        summary: "K6 test execution failed"
```

## Storage and Retention

### Storage Configuration
```yaml
spec:
  storage:
    volumeClaimTemplate:
      spec:
        storageClassName: gp3
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 100Gi
```

### Retention Policies
- **Short-term**: High-resolution metrics for 24 hours
- **Medium-term**: 5-minute aggregates for 7 days  
- **Long-term**: 1-hour aggregates for 30 days

## AlertManager Configuration

### Notification Channels
```yaml
route:
  group_by: ['alertname', 'cluster', 'service']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'default'
  routes:
  - match:
      severity: critical
    receiver: 'critical-alerts'

receivers:
- name: 'default'
  slack_configs:
  - api_url: '${SLACK_WEBHOOK_URL}'
    channel: '#hackload-alerts'
    
- name: 'critical-alerts'
  slack_configs:
  - api_url: '${SLACK_WEBHOOK_URL}'
    channel: '#hackload-critical'
  email_configs:
  - to: 'hackload-ops@example.com'
```

## Pushgateway for Batch Jobs

### K6 Test Results
```javascript
// K6 script sending custom metrics
import { Counter, Trend } from 'k6/metrics';

const testCounter = new Counter('hackload_test_executions_total');
const responseTime = new Trend('hackload_response_time_seconds');

export default function() {
  // ... test logic ...
  
  testCounter.add(1, { team_id: __ENV.TEAM_ID });
  responseTime.add(response.timings.duration / 1000);
}
```

### Batch Job Metrics
```bash
# Push batch job metrics
curl -X POST http://prometheus-pushgateway:9091/metrics/job/hackload-batch/instance/worker-1 \
  --data-binary 'hackload_batch_duration_seconds{job="data-processing"} 45.2'
```

## Federation for Multi-Cluster

### Cross-Cluster Metrics
```yaml
scrape_configs:
- job_name: 'federate'
  scrape_interval: 15s
  honor_labels: true
  metrics_path: '/federate'
  params:
    'match[]':
      - '{job=~"hackload-.*"}'
      - '{__name__=~"k6_.*"}'
  static_configs:
    - targets: ['prometheus-cluster-1:9090']
```

## Kubernetes Resources Created

- **StatefulSet**: Prometheus server instances
- **Service**: Prometheus web UI and API
- **ConfigMap**: Prometheus configuration
- **Secret**: Authentication credentials
- **ServiceAccount**: RBAC permissions
- **PersistentVolumeClaim**: Metrics storage
- **ServiceMonitor**: Auto-discovery rules
- **PrometheusRule**: Custom recording and alert rules

## Integration Points

### With Grafana
```yaml
# Grafana data source configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-datasource
data:
  prometheus.yaml: |
    apiVersion: 1
    datasources:
    - name: Prometheus
      type: prometheus
      url: http://prometheus:9090
      access: proxy
      isDefault: true
```

### With HackLoad App
```go
// Application metrics registration
import "github.com/prometheus/client_golang/prometheus"

var (
    testsTotal = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "hackload_tests_total",
            Help: "Total number of load tests executed",
        },
        []string{"team_id", "status"},
    )
    
    testDuration = prometheus.NewHistogramVec(
        prometheus.HistogramOpts{
            Name: "hackload_test_duration_seconds",
            Help: "Duration of load tests",
        },
        []string{"team_id"},
    )
)
```

## Performance Tuning

### Query Performance
```yaml
# Prometheus configuration optimizations
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    cluster: 'hackload-prod'

rule_files:
  - "/etc/prometheus/rules/*.yml"

scrape_configs:
  # Optimize scrape intervals
  - job_name: 'k6-tests'
    scrape_interval: 5s  # High frequency for load tests
    
  - job_name: 'infrastructure'
    scrape_interval: 30s  # Lower frequency for infra
```

### Memory Management
```yaml
spec:
  retention: "30d"
  retentionSize: "50GB"
  resources:
    requests:
      memory: "2Gi"
    limits:
      memory: "8Gi"
  # Enable compression
  enableFeatures:
    - memory-snapshot-on-shutdown
```

## Security

### RBAC Configuration
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: prometheus
rules:
- apiGroups: [""]
  resources: ["nodes", "services", "endpoints", "pods"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["networking.k8s.io"]
  resources: ["ingresses"]
  verbs: ["get", "list", "watch"]
```

### Network Policies
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: prometheus-netpol
spec:
  podSelector:
    matchLabels:
      app: prometheus
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: grafana
    ports:
    - protocol: TCP
      port: 9090
```

## Troubleshooting

### Common Issues

1. **High Memory Usage**
   - Check retention settings
   - Review query complexity
   - Monitor cardinality

2. **Missing Metrics**
   - Verify service discovery
   - Check network policies
   - Review scrape configuration

3. **Query Performance**
   - Optimize recording rules
   - Reduce query time ranges
   - Check resource limits

### Useful Commands

```bash
# Check Prometheus status
kubectl get statefulset prometheus -n monitoring

# View configuration
kubectl get configmap prometheus-config -n monitoring -o yaml

# Check targets
kubectl port-forward svc/prometheus 9090:9090 -n monitoring
# Visit http://localhost:9090/targets

# Query metrics
curl 'http://prometheus:9090/api/v1/query?query=up'
```

## Related Modules

- `grafana`: Visualizes Prometheus metrics
- `k6-operator`: Source of load testing metrics
- `hackload-app`: Application performance metrics
- `cloudnative-pg`: Database metrics collection
