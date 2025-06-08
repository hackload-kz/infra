# Модуль веб-приложения HackLoad

## Обзор

Этот модуль развертывает веб-приложение HackLoad 2025 - сервис REST API, который предоставляет интерфейсы для управления нагрузочными тестами, регистрации команд и визуализации результатов тестов. Приложение служит центральной плоскостью управления для инфраструктуры нагрузочного тестирования хакатона.

## Функции

- **REST API** для управления нагрузочными тестами
- **Регистрация команд** и управление конечными точками
- **Конфигурация тестов** и планирование
- **Интеграция дашборда результатов**
- **Интеграция базы данных** с CloudNativePG
- **Kubernetes-нативное** развертывание с проверками работоспособности
- **Автомасштабирование** на основе спроса

## Использование

```hcl
module "hackload_app" {
  source = "../../modules/hackload-app"
  
  namespace        = "hackload"
  environment      = "production"
  image_tag        = "v1.0.0"
  replica_count    = 3
  
  # Подключение к базе данных
  database_host     = module.cloudnative_pg.cluster_rw_service
  database_name     = "hackload"
  database_user     = "hackload_app"
  database_secret   = "hackload-db-credentials"
  
  # Конфигурация приложения
  max_concurrent_tests = 5
  test_timeout_minutes = 30
  
  # Ресурсы
  cpu_request    = "200m"
  cpu_limit      = "500m"
  memory_request = "256Mi"
  memory_limit   = "512Mi"
  
  # Ingress
  enable_ingress = true
  host          = "hackload.example.com"
  tls_enabled   = true
  
  tags = {
    Component = "web-app"
    Project   = "HackLoad2025"
  }
}
```

## Входные параметры

| Имя | Описание | Тип | По умолчанию | Обязательный |
|-----|----------|-----|--------------|-------------|
| namespace | Пространство имен Kubernetes | string | "hackload" | нет |
| environment | Имя окружения | string | - | да |
| image_repository | Репозиторий образа контейнера | string | "hackload/web-app" | нет |
| image_tag | Тег образа контейнера | string | "latest" | нет |
| replica_count | Количество реплик приложения | number | 2 | нет |
| database_host | Хост подключения к базе данных | string | - | да |
| database_name | Имя базы данных | string | - | да |
| database_user | Имя пользователя базы данных | string | - | да |
| database_secret | Kubernetes секрет с учетными данными БД | string | - | да |
| max_concurrent_tests | Максимальное количество одновременных нагрузочных тестов | number | 3 | нет |
| test_timeout_minutes | Таймаут нагрузочного теста в минутах | number | 15 | нет |
| cpu_request | Запрос CPU | string | "100m" | нет |
| cpu_limit | Лимит CPU | string | "500m" | нет |
| memory_request | Запрос памяти | string | "128Mi" | нет |
| memory_limit | Лимит памяти | string | "512Mi" | нет |
| enable_ingress | Создать ресурс ingress | bool | false | нет |
| host | Имя хоста ingress | string | "" | нет |
| tls_enabled | Включить TLS для ingress | bool | false | нет |

## Выходные параметры

| Имя | Описание |
|-----|----------|
| service_name | Имя сервиса Kubernetes |
| service_port | Номер порта сервиса |
| ingress_url | URL приложения (если ingress включен) |
| deployment_name | Имя развертывания Kubernetes |

## API конечные точки

### Управление командами

- `POST /api/teams` - Зарегистрировать новую команду
- `GET /api/teams` - Список всех команд
- `PUT /api/teams/{id}` - Обновить информацию о команде
- `DELETE /api/teams/{id}` - Удалить команду

### Управление нагрузочными тестами

- `POST /api/tests` - Создать новый нагрузочный тест
- `GET /api/tests` - Список всех тестов
- `GET /api/tests/{id}` - Получить детали теста
- `POST /api/tests/{id}/start` - Запустить нагрузочный тест
- `POST /api/tests/{id}/stop` - Остановить нагрузочный тест
- `GET /api/tests/{id}/results` - Get test results

### Monitoring
- `GET /api/health` - Health check endpoint
- `GET /api/metrics` - Prometheus metrics
- `GET /api/status` - Application status

## Database Schema

### Teams Table
```sql
CREATE TABLE teams (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  endpoint_url VARCHAR(512) NOT NULL,
  api_key VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Tests Table
```sql
CREATE TABLE tests (
  id SERIAL PRIMARY KEY,
  team_id INTEGER REFERENCES teams(id),
  name VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  configuration JSONB,
  results JSONB,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `MAX_CONCURRENT_TESTS` | Maximum concurrent tests | No |
| `TEST_TIMEOUT` | Test timeout in minutes | No |
| `LOG_LEVEL` | Application log level | No |
| `PROMETHEUS_ENABLED` | Enable Prometheus metrics | No |

### Kubernetes Resources Created

- **Deployment**: Application pods with rolling updates
- **Service**: ClusterIP service for internal communication
- **ConfigMap**: Application configuration
- **Secret**: Sensitive configuration (if needed)
- **ServiceAccount**: For K8s API access
- **HorizontalPodAutoscaler**: Auto-scaling configuration
- **Ingress**: External access (if enabled)

## Health Checks

### Liveness Probe
- **Endpoint**: `/api/health`
- **Initial Delay**: 30 seconds
- **Period**: 10 seconds

### Readiness Probe
- **Endpoint**: `/api/health/ready`
- **Initial Delay**: 5 seconds
- **Period**: 5 seconds

## Auto-scaling

The module configures HorizontalPodAutoscaler with:
- **Min Replicas**: 2
- **Max Replicas**: 10
- **CPU Target**: 70%
- **Memory Target**: 80%

## Security

- **RBAC**: Service account with minimal required permissions
- **Network Policies**: Restrict pod-to-pod communication
- **Secrets**: Database credentials stored as Kubernetes secrets
- **Container Security**: Non-root user, read-only filesystem

## Monitoring

### Metrics Exposed
- HTTP request metrics (duration, status codes)
- Database connection pool metrics
- Active load tests count
- Application-specific business metrics

### Logging
- Structured JSON logging
- Request/response logging
- Error tracking and alerting

## Development

### Local Development
```bash
# Build image
docker build -t hackload/web-app:dev .

# Run locally with docker-compose
docker-compose up -d

# Apply to development cluster
terraform apply -var="image_tag=dev"
```

### Testing
```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# Load tests against the API
k6 run tests/load-test.js
```

## Deployment Workflow

1. **Build**: Container image built in CI/CD
2. **Test**: Unit and integration tests
3. **Deploy**: Terraform applies changes
4. **Verify**: Health checks and smoke tests
5. **Monitor**: Metrics and logs verification

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check database service is running
   - Verify connection credentials
   - Check network policies

2. **High Memory Usage**
   - Review application logs
   - Check for memory leaks
   - Adjust resource limits

3. **Load Tests Not Starting**
   - Verify K6 operator is installed
   - Check RBAC permissions
   - Review test configuration

### Useful Commands

```bash
# Check pod logs
kubectl logs -f deployment/hackload-app -n hackload

# Port forward for local testing
kubectl port-forward svc/hackload-app 8080:80 -n hackload

# Check resource usage
kubectl top pods -n hackload

# Describe deployment
kubectl describe deployment hackload-app -n hackload
```

## Dependencies

- CloudNativePG module for database
- K6 operator for load testing
- Prometheus for metrics collection
- Ingress controller (if external access needed)

## Related Documentation

- [API Documentation](./docs/api.md)
- [Database Schema](./docs/database.md)
- [Development Guide](./docs/development.md)
