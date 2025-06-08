# Staging среда HackLoad 2025

Этот каталог содержит конфигурацию Terraform для **staging (промежуточной)** среды платформы HackLoad 2025.

## Описание

Staging среда предназначена для тестирования изменений перед развертыванием в production. Она имеет конфигурацию, максимально приближенную к production, но с меньшими ресурсами.

## Архитектура

### Компоненты

- **Kubernetes кластер**: 3 узла типа `t3.medium`
- **PostgreSQL (CloudNativePG)**: 2 экземпляра с репликацией
- **HackLoad приложение**: 2 реплики
- **K6 Operator**: Для нагрузочного тестирования
- **Prometheus**: Мониторинг с хранением данных 30 дней
- **Grafana**: Визуализация метрик

### Ресурсы

| Компонент | CPU Requests | Memory Requests | CPU Limits | Memory Limits |
|-----------|--------------|-----------------|------------|---------------|
| HackLoad App | 250m | 512Mi | 500m | 1Gi |
| PostgreSQL | - | - | - | - |
| K6 Tests | 100m | 256Mi | 500m | 1Gi |
| Prometheus | 500m | 1Gi | 2000m | 4Gi |
| Grafana | 250m | 512Mi | 500m | 1Gi |

## Предварительные требования

1. **Terraform** >= 1.5
2. **kubectl** настроенный для staging кластера
3. **Helm** >= 3.0
4. Доступ к Kubernetes кластеру staging
5. Настроенный S3 бэкенд для состояния Terraform (опционально)

## Развертывание

### 1. Подготовка

```bash
# Перейти в каталог staging среды
cd src/environments/staging

# Инициализировать Terraform
terraform init
```

### 2. Настройка переменных

Создайте файл `terraform.tfvars`:

```hcl
# Основные настройки
environment = "staging"
cluster_name = "hackload-staging"

# Настройки кластера
node_count = 3
node_instance_type = "t3.medium"
kubernetes_version = "1.28"

# Настройки приложения
app_image_tag = "staging-latest"
app_ingress_host = "staging.hackload.example.com"

# Настройки Grafana
grafana_admin_password = "secure-staging-password"
grafana_ingress_host = "grafana-staging.hackload.example.com"

# Общие теги
common_tags = {
  Project     = "HackLoad2025"
  Environment = "staging"
  Team        = "Infrastructure"
  ManagedBy   = "Terraform"
}
```

### 3. Планирование и применение

```bash
# Просмотр плана изменений
terraform plan

# Применение конфигурации
terraform apply

# Для автоматического подтверждения
terraform apply -auto-approve
```

### 4. Проверка развертывания

```bash
# Проверка статуса подов
kubectl get pods --all-namespaces

# Проверка сервисов
kubectl get services --all-namespaces

# Проверка ingress
kubectl get ingress --all-namespaces
```

## Доступ к компонентам

После успешного развертывания будут доступны следующие компоненты:

### HackLoad приложение
- **URL**: `https://staging.hackload.example.com`
- **Namespace**: `hackload`
- **Реплики**: 2

### Grafana
- **URL**: `https://grafana-staging.hackload.example.com`
- **Пользователь**: `admin`
- **Пароль**: Значение переменной `grafana_admin_password`

### Prometheus
- **Внутренний URL**: `http://prometheus.monitoring.svc.cluster.local:9090`
- **Порт**: 9090

### PostgreSQL
- **Хост**: `staging-postgres-rw.database.svc.cluster.local`
- **Порт**: 5432
- **База данных**: `hackload`

## Мониторинг

### Prometheus метрики

Prometheus настроен для сбора метрик с:
- Узлов Kubernetes
- Подов приложений
- PostgreSQL
- K6 тестов
- Ingress контроллера

### Grafana дашборды

Предустановленные дашборды:
- Обзор кластера Kubernetes
- Метрики приложения HackLoad
- Мониторинг PostgreSQL
- Результаты нагрузочного тестирования K6

## Нагрузочное тестирование

### Запуск K6 тестов

```bash
# Создание K6 тестового задания
kubectl apply -f - <<EOF
apiVersion: k6.io/v1alpha1
kind: K6
metadata:
  name: staging-load-test
  namespace: k6-system
spec:
  parallelism: 2
  script:
    configMap:
      name: loadtest-script
      file: script.js
  arguments: --vus=50 --duration=5m
EOF
```

### Мониторинг тестов

```bash
# Просмотр статуса тестов
kubectl get k6 -n k6-system

# Просмотр логов тестирования
kubectl logs -l app=k6 -n k6-system
```

## Резервное копирование

### PostgreSQL

Автоматическое резервное копирование настроено:
- **Расписание**: Ежедневно в 02:00 UTC
- **Хранение**: 7 дней
- **Тип**: Point-in-time recovery

### Проверка резервных копий

```bash
# Список резервных копий
kubectl get backup -n database

# Статус резервного копирования
kubectl describe backup -n database
```

## Обновление

### Обновление приложения

```bash
# Обновление образа приложения
terraform apply -var="app_image_tag=staging-v1.2.3"
```

### Обновление инфраструктуры

```bash
# Проверка изменений
terraform plan

# Применение обновлений
terraform apply
```

## Масштабирование

### Горизонтальное масштабирование

```bash
# Увеличение количества реплик приложения
terraform apply -var="app_replicas=4"

# Увеличение количества узлов кластера
terraform apply -var="node_count=5"
```

## Устранение неполадок

### Общие команды диагностики

```bash
# Просмотр событий кластера
kubectl get events --all-namespaces --sort-by='.lastTimestamp'

# Проверка состояния узлов
kubectl get nodes -o wide

# Просмотр ресурсов
kubectl top nodes
kubectl top pods --all-namespaces
```

### Проблемы с приложением

```bash
# Логи приложения HackLoad
kubectl logs -l app=hackload-app -n hackload

# Описание подов
kubectl describe pods -l app=hackload-app -n hackload
```

### Проблемы с базой данных

```bash
# Статус кластера PostgreSQL
kubectl get cluster -n database

# Логи PostgreSQL
kubectl logs -l postgresql=staging-postgres -n database
```

## Очистка

### Удаление ресурсов

```bash
# Удаление всех ресурсов
terraform destroy

# Подтверждение удаления
# Введите "yes" когда будет запрошено подтверждение
```

### Очистка PVC (если необходимо)

```bash
# Удаление Persistent Volume Claims
kubectl delete pvc --all -n database
kubectl delete pvc --all -n monitoring
```

## Безопасность

### Сетевые политики

Staging среда использует сетевые политики для ограничения трафика между namespace'ами.

### Секреты

Все чувствительные данные хранятся в Kubernetes Secrets:
- Пароли базы данных
- Токены аутентификации
- Сертификаты TLS

### RBAC

Настроен Role-Based Access Control для ограничения доступа к ресурсам кластера.

## Поддержка

При возникновении проблем:

1. Проверьте логи компонентов
2. Убедитесь в достаточности ресурсов
3. Проверьте сетевую связность
4. Обратитесь к документации модулей в `src/modules/`

## Полезные ссылки

- [Документация модулей](../../modules/README.md)
- [Конфигурация разработки](../dev/README.md)
- [Конфигурация production](../production/README.md)
