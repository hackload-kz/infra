# Production среда HackLoad 2025

Этот каталог содержит конфигурацию Terraform для **production (производственной)** среды платформы HackLoad 2025.

## Описание

Production среда предназначена для проведения хакатона HackLoad 2025. Конфигурация оптимизирована для высокой доступности, производительности и надежности.

## Архитектура

### Компоненты

- **Kubernetes кластер**: 6 узлов типа `t3.large`
- **PostgreSQL (CloudNativePG)**: 3 экземпляра с репликацией и высокой доступностью
- **HackLoad приложение**: 5 реплик с автомасштабированием (3-20 реплик)
- **K6 Operator**: Для нагрузочного тестирования команд участников
- **Prometheus**: Высокодоступный мониторинг (2 реплики), хранение данных 90 дней
- **Grafana**: Визуализация метрик (2 реплики)

### Ресурсы Production

| Компонент | CPU Requests | Memory Requests | CPU Limits | Memory Limits | Реплики |
|-----------|--------------|-----------------|------------|---------------|---------|
| HackLoad App | 500m | 1Gi | 2000m | 4Gi | 5 (3-20) |
| PostgreSQL | - | - | - | - | 3 |
| K6 Tests | 250m | 512Mi | 2000m | 4Gi | - |
| Prometheus | 1000m | 4Gi | 4000m | 16Gi | 2 |
| Grafana | 500m | 1Gi | 2000m | 4Gi | 2 |

### Хранилище

| Компонент | Размер | Класс хранилища | Репликация |
|-----------|--------|-----------------|------------|
| PostgreSQL | 200Gi | gp3 | 3 реплики |
| Prometheus | 500Gi | gp3 | 2 реплики |
| Grafana | 50Gi | gp3 | 2 реплики |

## Предварительные требования

1. **Terraform** >= 1.5
2. **kubectl** настроенный для production кластера
3. **Helm** >= 3.0
4. Доступ к Kubernetes кластеру production
5. Настроенный S3 бэкенд для состояния Terraform (обязательно для production)
6. SSL сертификаты для доменов
7. Резервная стратегия для критических данных

## Развертывание

### 1. Подготовка

```bash
# Перейти в каталог production среды
cd src/environments/production

# Инициализировать Terraform с S3 бэкендом
terraform init
```

### 2. Настройка переменных

Создайте файл `terraform.tfvars`:

```hcl
# Основные настройки
environment = "production"
cluster_name = "hackload-production"

# Настройки кластера
node_count = 6
node_instance_type = "t3.large"
kubernetes_version = "1.28"

# Настройки приложения
app_image_tag = "v1.0.0"
app_replicas = 5
app_ingress_host = "hackload.example.com"

# Автомасштабирование
app_autoscaling_enabled = true
app_min_replicas = 3
app_max_replicas = 20
app_target_cpu_utilization = 70
app_target_memory_utilization = 80

# PostgreSQL настройки
postgres_instances = 3
postgres_storage_size = "200Gi"
postgres_backup_retention = "30d"
postgres_max_connections = 200
postgres_shared_buffers = "2GB"
postgres_effective_cache_size = "6GB"

# Мониторинг
prometheus_storage_size = "500Gi"
prometheus_retention_time = "90d"
prometheus_replicas = 2

# Grafana
grafana_admin_password = "very-secure-production-password"
grafana_ingress_host = "grafana.hackload.example.com"
grafana_storage_size = "50Gi"
grafana_replicas = 2

# Общие теги
common_tags = {
  Project     = "HackLoad2025"
  Environment = "production"
  Team        = "Infrastructure"
  ManagedBy   = "Terraform"
  Backup      = "critical"
  Monitoring  = "enabled"
}
```

### 3. Планирование и применение

```bash
# Просмотр плана изменений
terraform plan

# Применение конфигурации (с осторожностью в production!)
terraform apply

# Для автоматического подтверждения (НЕ рекомендуется для production)
# terraform apply -auto-approve
```

### 4. Проверка развертывания

```bash
# Проверка статуса всех подов
kubectl get pods --all-namespaces

# Проверка узлов кластера
kubectl get nodes -o wide

# Проверка сервисов
kubectl get services --all-namespaces

# Проверка ingress
kubectl get ingress --all-namespaces

# Проверка автомасштабирования
kubectl get hpa --all-namespaces
```

## Доступ к компонентам

### HackLoad приложение
- **URL**: `https://hackload.example.com`
- **Namespace**: `hackload`
- **Реплики**: 5 (автомасштабирование 3-20)
- **Мониторинг**: Доступен через Grafana

### Grafana (Мониторинг)
- **URL**: `https://grafana.hackload.example.com`
- **Пользователь**: `admin`
- **Пароль**: Значение переменной `grafana_admin_password`
- **Реплики**: 2 (высокая доступность)

### Prometheus (Метрики)
- **Внутренний URL**: `http://prometheus.monitoring.svc.cluster.local:9090`
- **Порт**: 9090
- **Реплики**: 2 (высокая доступность)
- **Хранение**: 90 дней

### PostgreSQL (База данных)
- **Хост записи**: `production-postgres-rw.database.svc.cluster.local`
- **Хост чтения**: `production-postgres-ro.database.svc.cluster.local`
- **Порт**: 5432
- **База данных**: `hackload`
- **Экземпляры**: 3 (высокая доступность)

## Мониторинг и алертинг

### Prometheus метрики

Production Prometheus настроен для сбора метрик каждые 15 секунд с:
- Узлов Kubernetes (состояние, ресурсы)
- Подов приложений (CPU, память, сеть)
- PostgreSQL (соединения, производительность, репликация)
- K6 тестов (результаты нагрузочного тестирования)
- Ingress контроллера (HTTP метрики)
- Автомасштабирования приложений

### Grafana дашборды

Предустановленные дашборды для production:
1. **Обзор платформы HackLoad**
   - Общее состояние системы
   - Ключевые метрики производительности
   - Статус автомасштабирования

2. **Мониторинг кластера Kubernetes**
   - Состояние узлов
   - Распределение ресурсов
   - Сетевой трафик

3. **Мониторинг приложения HackLoad**
   - Время отклика API
   - Количество активных пользователей
   - Ошибки и исключения

4. **Мониторинг PostgreSQL**
   - Производительность запросов
   - Состояние репликации
   - Использование соединений

5. **Результаты нагрузочного тестирования**
   - Метрики K6 тестов команд
   - Сравнительная производительность
   - Статистика по командам

### Алертинг

Настроены критические алерты:
- Недоступность компонентов
- Высокое использование ресурсов
- Ошибки базы данных
- Превышение времени отклика
- Проблемы с автомасштабированием

## Нагрузочное тестирование

### Управление K6 тестами

```bash
# Просмотр активных тестов
kubectl get k6 -n k6-system

# Создание теста для команды
kubectl apply -f - <<EOF
apiVersion: k6.io/v1alpha1
kind: K6
metadata:
  name: team-alpha-test
  namespace: k6-system
  labels:
    team: "alpha"
    test-type: "load"
spec:
  parallelism: 4
  script:
    configMap:
      name: team-alpha-script
      file: loadtest.js
  arguments: --vus=100 --duration=10m
  resources:
    requests:
      memory: "512Mi"
      cpu: "250m"
    limits:
      memory: "2Gi"
      cpu: "1000m"
EOF
```

### Мониторинг результатов

```bash
# Логи конкретного теста
kubectl logs -l app=k6,team=alpha -n k6-system

# Статус всех тестов
kubectl get k6 -n k6-system -o wide

# Метрики в реальном времени через Grafana
# https://grafana.hackload.example.com/d/k6-overview
```

## Автомасштабирование

### Горизонтальное автомасштабирование приложения

Приложение HackLoad настроено на автомасштабирование:
- **Минимум**: 3 реплики
- **Максимум**: 20 реплик
- **Целевая утилизация CPU**: 70%
- **Целевая утилизация памяти**: 80%

```bash
# Просмотр статуса автомасштабирования
kubectl get hpa -n hackload

# Детальная информация
kubectl describe hpa hackload-app -n hackload

# Мониторинг в реальном времени
kubectl top pods -n hackload
```

### Вертикальное масштабирование кластера

При необходимости можно увеличить размер кластера:

```bash
# Обновление количества узлов
terraform apply -var="node_count=8"

# Обновление типа узлов
terraform apply -var="node_instance_type=t3.xlarge"
```

## Резервное копирование

### PostgreSQL

Автоматическое резервное копирование:
- **Расписание**: Ежедневно в 01:00 UTC
- **Хранение**: 30 дней
- **Тип**: Point-in-time recovery (PITR)
- **Место хранения**: S3-совместимое хранилище

```bash
# Просмотр резервных копий
kubectl get backup -n database

# Статус последней резервной копии
kubectl describe backup -n database --sort-by='.metadata.creationTimestamp' | tail -20

# Восстановление из резервной копии (ОСТОРОЖНО!)
kubectl apply -f - <<EOF
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: restored-postgres
  namespace: database
spec:
  instances: 3
  bootstrap:
    recovery:
      backup:
        name: "backup-20240115-010000"
EOF
```

### Мониторинг состояния

```bash
# Статус кластера PostgreSQL
kubectl get cluster -n database

# Проверка репликации
kubectl exec -n database production-postgres-1 -- \
  psql -c "SELECT * FROM pg_stat_replication;"
```

## Безопасность

### Сетевые политики

Production среда использует строгие сетевые политики:
- Изоляция между namespace'ами
- Ограничение исходящих подключений
- Контроль доступа к базе данных

### RBAC (Role-Based Access Control)

Настроены роли доступа:
- **Администраторы**: Полный доступ
- **Разработчики**: Доступ только к namespace приложения
- **Мониторинг**: Доступ только для чтения

### Секреты и сертификаты

```bash
# Просмотр секретов (без содержимого)
kubectl get secrets --all-namespaces

# Проверка TLS сертификатов
kubectl get certificates --all-namespaces

# Ротация секретов базы данных
kubectl delete secret postgres-credentials -n database
# Terraform автоматически пересоздаст секрет
```

## Обслуживание

### Плановое обслуживание

```bash
# Отключение трафика (drain узла)
kubectl drain node-name --ignore-daemonsets --delete-emptydir-data

# Включение трафика обратно
kubectl uncordon node-name

# Обновление приложения без простоя
terraform apply -var="app_image_tag=v1.1.0"
```

### Мониторинг производительности

```bash
# Топ потребителей ресурсов
kubectl top nodes
kubectl top pods --all-namespaces --sort-by=cpu
kubectl top pods --all-namespaces --sort-by=memory

# Статистика использования хранилища
kubectl get pv
kubectl get pvc --all-namespaces
```

## Устранение неполадок

### Диагностика общих проблем

```bash
# События кластера (последние проблемы)
kubectl get events --all-namespaces --sort-by='.lastTimestamp' | tail -20

# Проблемные поды
kubectl get pods --all-namespaces --field-selector=status.phase!=Running

# Логи системных компонентов
kubectl logs -n kube-system -l component=kube-scheduler
kubectl logs -n kube-system -l component=kube-controller-manager
```

### Диагностика приложения

```bash
# Логи приложения HackLoad
kubectl logs -n hackload -l app=hackload-app --tail=100

# Статус автомасштабирования
kubectl describe hpa hackload-app -n hackload

# Проверка подключения к базе данных
kubectl exec -n hackload deployment/hackload-app -- \
  nc -zv production-postgres-rw.database.svc.cluster.local 5432
```

### Диагностика базы данных

```bash
# Состояние кластера PostgreSQL
kubectl get cluster production-postgres -n database -o yaml

# Логи PostgreSQL
kubectl logs -n database production-postgres-1 --tail=50

# Проверка репликации
kubectl exec -n database production-postgres-1 -- \
  psql -c "SELECT client_addr, state, sync_state FROM pg_stat_replication;"
```

### Диагностика мониторинга

```bash
# Статус Prometheus
kubectl get pods -n monitoring -l app=prometheus

# Статус целей мониторинга
kubectl port-forward -n monitoring svc/prometheus 9090:9090
# Откройте http://localhost:9090/targets

# Проверка Grafana
kubectl get pods -n monitoring -l app=grafana
kubectl logs -n monitoring -l app=grafana
```

## Аварийное восстановление

### План восстановления

1. **Оценка ущерба**
   ```bash
   kubectl get nodes
   kubectl get pods --all-namespaces
   kubectl get pv
   ```

2. **Восстановление базы данных**
   ```bash
   # Восстановление из последней резервной копии
   kubectl apply -f backup-restore-config.yaml
   ```

3. **Восстановление приложения**
   ```bash
   # Пересоздание приложения
   terraform destroy -target=module.hackload_app
   terraform apply -target=module.hackload_app
   ```

4. **Проверка целостности**
   ```bash
   # Проверка всех компонентов
   kubectl get all --all-namespaces
   # Тестирование функциональности
   curl -f https://hackload.example.com/health
   ```

## Масштабирование под нагрузкой

### Подготовка к высокой нагрузке

```bash
# Предварительное масштабирование
kubectl scale deployment hackload-app --replicas=10 -n hackload

# Увеличение лимитов HPA
kubectl patch hpa hackload-app -n hackload -p '{"spec":{"maxReplicas":30}}'

# Мониторинг ресурсов кластера
kubectl top nodes
```

### Реагирование на алерты

```bash
# При алерте высокой утилизации CPU
kubectl top pods -n hackload --sort-by=cpu

# При алерте проблем с базой данных
kubectl exec -n database production-postgres-1 -- \
  psql -c "SELECT * FROM pg_stat_activity WHERE state = 'active';"

# При алерте недоступности сервиса
kubectl describe service hackload-app -n hackload
kubectl get endpoints hackload-app -n hackload
```

## Очистка

### Удаление ресурсов (ОСТОРОЖНО!)

```bash
# Создание резервной копии перед удалением
kubectl get all --all-namespaces -o yaml > production-backup.yaml

# Удаление через Terraform
terraform destroy

# Подтверждение удаления
# ВНИМАНИЕ: Это удалит ВСЕ ресурсы production среды!
```

### Сохранение критических данных

```bash
# Экспорт данных PostgreSQL
kubectl exec -n database production-postgres-1 -- \
  pg_dumpall > production-database-backup.sql

# Экспорт конфигурации Grafana
kubectl get configmaps -n monitoring -o yaml > grafana-config-backup.yaml
```

## Поддержка и мониторинг 24/7

### Критические метрики для мониторинга

1. **Доступность приложения** (>99.9%)
2. **Время отклика API** (<200ms для 95% запросов)
3. **Утилизация CPU кластера** (<80%)
4. **Утилизация памяти** (<85%)
5. **Доступность базы данных** (>99.99%)
6. **Успешность резервного копирования** (100%)

### Контакты для экстренных случаев

- **Техническая поддержка**: support@hackload.example.com
- **Дежурный инженер**: +1-XXX-XXX-XXXX
- **Escalation**: engineering-lead@hackload.example.com

## Полезные ссылки

- [Документация модулей](../../modules/README.md)
- [Конфигурация разработки](../dev/README.md)
- [Конфигурация staging](../staging/README.md)
- [Grafana дашборды](https://grafana.hackload.example.com)
- [Prometheus метрики](https://grafana.hackload.example.com/prometheus)
