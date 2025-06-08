# Модуль K6 Оператора

## Обзор

Этот модуль развертывает K6 Оператор, Kubernetes-нативное решение для выполнения распределенных нагрузочных тестов с использованием K6. Оператор позволяет платформе HackLoad 2025 выполнять масштабируемые, одновременные нагрузочные тесты против бэкендов системы продажи билетов команд-участников с Kubernetes-нативным управлением ресурсами и мониторингом.

## Функции

- **Распределенное нагрузочное тестирование** с K6 через несколько подов
- **Управление на основе CRD** для определений и выполнений тестов
- **Автомасштабирование** исполнителей тестов на основе требований нагрузки
- **Kubernetes-нативное** с полным RBAC и управлением ресурсами
- **Интеграция Prometheus** для сбора метрик
- **Многоокружениное** выполнение тестов
- **Сбор и хранение результатов тестов**

## Использование

```hcl
module "k6_operator" {
  source = "../../modules/k6-operator"
  
  namespace   = "k6-operator-system"
  environment = "production"
  
  # Конфигурация оператора
  operator_image_tag = "v0.0.14"
  enable_webhook     = true
  
  # Лимиты ресурсов для оператора
  operator_cpu_request    = "100m"
  operator_cpu_limit      = "500m"
  operator_memory_request = "128Mi"
  operator_memory_limit   = "512Mi"
  
  # Конфигурация исполнителя тестов по умолчанию
  default_runner_image = "grafana/k6:0.47.0"
  
  # Лимиты выполнения тестов
  max_concurrent_tests = 10
  default_parallelism  = 5
  max_parallelism     = 20
  
  # Хранилище для результатов тестов
  enable_test_results_storage = true
  results_storage_class      = "gp3"
  results_storage_size       = "10Gi"
  
  # Мониторинг
  enable_prometheus_monitoring = true
  
  tags = {
    Component = "load-testing"
    Project   = "HackLoad2025"
  }
}
```

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|----------|
| namespace | Kubernetes namespace for K6 operator | string | "k6-operator-system" | no |
| environment | Environment name | string | - | yes |
| operator_image_tag | K6 operator image tag | string | "latest" | no |
| enable_webhook | Enable admission webhook | bool | true | no |
| operator_cpu_request | Operator CPU request | string | "100m" | no |
| operator_cpu_limit | Operator CPU limit | string | "500m" | no |
| operator_memory_request | Operator memory request | string | "128Mi" | no |
| operator_memory_limit | Operator memory limit | string | "512Mi" | no |
| default_runner_image | Default K6 runner image | string | "grafana/k6:latest" | no |
| max_concurrent_tests | Maximum concurrent tests | number | 5 | no |
| default_parallelism | Default test parallelism | number | 1 | no |
| max_parallelism | Maximum test parallelism | number | 10 | no |
| enable_test_results_storage | Enable persistent storage for results | bool | true | no |
| results_storage_class | Storage class for test results | string | "gp2" | no |
| results_storage_size | Storage size for test results | string | "5Gi" | no |
| enable_prometheus_monitoring | Enable Prometheus monitoring | bool | true | no |

## Outputs

| Name | Description |
|------|-------------|
| operator_namespace | K6 operator namespace |
| operator_service_account | Operator service account name |
| webhook_service | Webhook service name |
| crd_names | List of created CRD names |

## K6Test Custom Resource

The operator introduces the `K6Test` CRD for defining load tests:

```yaml
apiVersion: k6.io/v1alpha1
kind: K6Test
metadata:
  name: hackload-basic-test
  namespace: hackload
spec:
  parallelism: 4
  script:
    configMap:
      name: k6-test-basic
      file: test.js
  separate: false
  runner:
    image: grafana/k6:0.47.0
    resources:
      requests:
        cpu: "200m"
        memory: "256Mi"
      limits:
        cpu: "500m"
        memory: "512Mi"
    env:
      - name: TARGET_URL
        value: "https://api.team1.hackload.example.com"
      - name: VUS
        value: "50"
      - name: DURATION
        value: "5m"
  starter:
    image: grafana/k6:0.47.0
```

## Test Script Examples

### Basic Load Test
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: __ENV.VUS || 10 },
    { duration: '5m', target: __ENV.VUS || 10 },
    { duration: '2m', target: 0 },
  ],
};

export default function () {
  const response = http.get(__ENV.TARGET_URL || 'http://test.k6.io');
  
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  sleep(1);
}
```

### Ticketing System Load Test
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';

const baseUrl = __ENV.TARGET_URL || 'http://localhost:8080';

// Shared test data
const events = new SharedArray('events', function () {
  return [
    { id: 1, name: 'Concert A' },
    { id: 2, name: 'Concert B' },
    { id: 3, name: 'Concert C' },
  ];
});

export const options = {
  stages: [
    { duration: '1m', target: 20 },   // Ramp up
    { duration: '3m', target: 50 },   // Peak load
    { duration: '1m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'], // 95% < 1s
    http_req_failed: ['rate<0.1'],     // Error rate < 10%
  },
};

export default function () {
  // Browse events
  let response = http.get(`${baseUrl}/api/events`);
  check(response, {
    'events list loaded': (r) => r.status === 200,
  });

  // Select random event
  const event = events[Math.floor(Math.random() * events.length)];
  
  // Get event details
  response = http.get(`${baseUrl}/api/events/${event.id}`);
  check(response, {
    'event details loaded': (r) => r.status === 200,
  });

  // Try to book tickets (simulate user behavior)
  const bookingData = {
    eventId: event.id,
    quantity: Math.floor(Math.random() * 4) + 1,
    customerEmail: `user${__VU}@example.com`,
  };

  response = http.post(`${baseUrl}/api/bookings`, JSON.stringify(bookingData), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  check(response, {
    'booking successful or sold out': (r) => [200, 409].includes(r.status),
  });

  sleep(Math.random() * 3 + 1); // Random think time 1-4s
}
```

## Test Management

### Creating Tests via API
```bash
# Create test configuration
curl -X POST http://hackload-app/api/tests \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Team 1 Load Test",
    "teamId": 1,
    "configuration": {
      "targetUrl": "https://api.team1.example.com",
      "virtualUsers": 50,
      "duration": "5m",
      "parallelism": 4
    }
  }'

# Start test
curl -X POST http://hackload-app/api/tests/123/start
```

### Test Lifecycle
1. **Created**: Test configuration stored
2. **Scheduled**: K6Test resource created
3. **Running**: K6 pods executing the test
4. **Collecting**: Results being gathered
5. **Completed**: Test finished, results available
6. **Failed**: Test execution failed

## Monitoring and Metrics

### K6 Metrics Integration
The operator automatically configures K6 to send metrics to Prometheus:

```javascript
// K6 automatically exports these metrics to Prometheus
export const options = {
  ext: {
    prometheus: {
      enabled: true,
      push_gateway: 'http://prometheus-pushgateway:9091',
    },
  },
};
```

### Custom Metrics Dashboard
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: k6-dashboard
data:
  dashboard.json: |
    {
      "dashboard": {
        "title": "K6 Load Testing",
        "panels": [
          {
            "title": "HTTP Request Rate",
            "targets": [
              {
                "expr": "rate(k6_http_reqs_total[5m])"
              }
            ]
          },
          {
            "title": "Response Time",
            "targets": [
              {
                "expr": "k6_http_req_duration"
              }
            ]
          }
        ]
      }
    }
```

## Resource Management

### Test Runner Resources
```yaml
spec:
  runner:
    resources:
      requests:
        cpu: "200m"        # Minimum CPU per runner
        memory: "256Mi"    # Minimum memory per runner
      limits:
        cpu: "1"           # Maximum CPU per runner
        memory: "1Gi"      # Maximum memory per runner
```

### Node Affinity for Load Testing
```yaml
spec:
  runner:
    affinity:
      nodeAffinity:
        preferredDuringSchedulingIgnoredDuringExecution:
        - weight: 100
          preference:
            matchExpressions:
            - key: node-type
              operator: In
              values: ["load-testing"]
```

## Security

### RBAC Configuration
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: k6-operator
rules:
- apiGroups: [""]
  resources: ["pods", "services", "configmaps"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
- apiGroups: ["k6.io"]
  resources: ["k6tests"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
```

### Network Policies
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: k6-test-isolation
spec:
  podSelector:
    matchLabels:
      app: k6-test
  policyTypes:
  - Egress
  egress:
  - to: []  # Allow all egress for load testing
```

## Kubernetes Resources Created

- **Deployment**: K6 operator controller
- **CustomResourceDefinition**: K6Test CRD
- **ClusterRole/ClusterRoleBinding**: RBAC permissions
- **Service**: Operator webhook service
- **ValidatingAdmissionWebhook**: Test validation
- **ConfigMaps**: Operator configuration
- **ServiceMonitor**: Prometheus monitoring

## Operations

### Managing Tests
```bash
# List all tests
kubectl get k6tests -A

# Check test status
kubectl describe k6test hackload-basic-test -n hackload

# View test logs
kubectl logs -l app=k6-test,k6test=hackload-basic-test -n hackload

# Cancel running test
kubectl delete k6test hackload-basic-test -n hackload
```

### Scaling Tests
```bash
# Scale existing test
kubectl patch k6test hackload-basic-test -n hackload \
  --type merge \
  --patch '{"spec":{"parallelism":8}}'
```

## Troubleshooting

### Common Issues

1. **Tests Not Starting**
   - Check operator logs: `kubectl logs -n k6-operator-system deployment/k6-operator`
   - Verify RBAC permissions
   - Check resource quotas

2. **Test Runners Failing**
   - Review test script syntax
   - Check target URL accessibility
   - Verify resource limits

3. **Missing Metrics**
   - Confirm Prometheus configuration
   - Check pushgateway connectivity
   - Verify ServiceMonitor configuration

### Useful Commands

```bash
# Check operator status
kubectl get pods -n k6-operator-system

# View CRDs
kubectl get crd | grep k6

# Debug test execution
kubectl logs -f k6test/hackload-basic-test -n hackload

# Check resource usage
kubectl top pods -l app=k6-test -n hackload
```

## Integration with HackLoad App

The K6 operator integrates with the HackLoad web application through:

1. **Dynamic Test Creation**: App creates K6Test resources
2. **Status Monitoring**: App watches test status changes
3. **Result Collection**: App retrieves test results
4. **Resource Management**: App manages test lifecycle

## Performance Considerations

- **Node Resources**: Ensure adequate CPU/memory for concurrent tests
- **Network Bandwidth**: Consider egress limits for high-throughput tests
- **Storage**: Adequate space for test results and logs
- **Scheduling**: Use node affinity for dedicated load testing nodes

## Related Modules

- `hackload-app`: Creates and manages K6 tests
- `prometheus`: Collects and stores test metrics
- `grafana`: Visualizes test results and metrics
- `k8s-cluster`: Provides underlying infrastructure
