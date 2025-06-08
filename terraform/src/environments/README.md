# Среды развертывания HackLoad 2025

Этот каталог содержит конфигурации Terraform для различных сред развертывания платформы HackLoad 2025.

## Обзор сред

| Среда | Назначение | Узлы | Тип узлов | Приложение | Автомасштабирование |
|-------|------------|------|-----------|------------|-------------------|
| **dev** | Разработка и отладка | 2 | t3.small | 1 реплика | Отключено |
| **staging** | Тестирование перед релизом | 3 | t3.medium | 2 реплики | Отключено |
| **production** | Рабочая среда хакатона | 6 | t3.large | 5 реплик | 3-20 реплик |

## Сравнение ресурсов

### Кластер Kubernetes

| Параметр | Dev | Staging | Production |
|----------|-----|---------|-----------|
| Узлы | 2 × t3.small | 3 × t3.medium | 6 × t3.large |
| CPU (всего) | 4 vCPU | 6 vCPU | 12 vCPU |
| RAM (всего) | 4 GB | 12 GB | 48 GB |
| Версия K8s | 1.28 | 1.28 | 1.28 |

### PostgreSQL (CloudNativePG)

| Параметр | Dev | Staging | Production |
|----------|-----|---------|-----------|
| Экземпляры | 1 | 2 | 3 |
| Хранилище | 20Gi | 50Gi | 200Gi |
| Класс хранилища | gp2 | gp2 | gp3 |
| Версия | 15 | 15 | 15 |
| Резервные копии | 3 дня | 7 дней | 30 дней |
| Мониторинг | Базовый | Включен | Расширенный |

### Приложение HackLoad

| Параметр | Dev | Staging | Production |
|----------|-----|---------|-----------|
| Реплики | 1 | 2 | 5 (3-20) |
| CPU requests | 100m | 250m | 500m |
| Memory requests | 256Mi | 512Mi | 1Gi |
| CPU limits | 200m | 500m | 2000m |
| Memory limits | 512Mi | 1Gi | 4Gi |
| Автомасштабирование | ❌ | ❌ | ✅ |

### Мониторинг

#### Prometheus

| Параметр | Dev | Staging | Production |
|----------|-----|---------|-----------|
| Реплики | 1 | 1 | 2 |
| Хранилище | 20Gi | 100Gi | 500Gi |
| Хранение данных | 7 дней | 30 дней | 90 дней |
| CPU requests | 100m | 500m | 1000m |
| Memory requests | 512Mi | 1Gi | 4Gi |
| Интервал сбора | 60s | 30s | 15s |

#### Grafana

| Параметр | Dev | Staging | Production |
|----------|-----|---------|-----------|
| Реплики | 1 | 1 | 2 |
| Хранилище | 5Gi | 10Gi | 50Gi |
| CPU requests | 100m | 250m | 500m |
| Memory requests | 256Mi | 512Mi | 1Gi |
| Высокая доступность | ❌ | ❌ | ✅ |

### K6 Operator

| Параметр | Dev | Staging | Production |
|----------|-----|---------|-----------|
| CPU requests | 50m | 100m | 250m |
| Memory requests | 128Mi | 256Mi | 512Mi |
| CPU limits | 200m | 500m | 2000m |
| Memory limits | 512Mi | 1Gi | 4Gi |
| Параллельность | Низкая | Средняя | Высокая |

## Быстрый старт

### Развертывание Dev среды

```bash
cd src/environments/dev
terraform init
terraform apply -auto-approve
```

### Развертывание Staging среды

```bash
cd src/environments/staging
terraform init
terraform plan
terraform apply
```

### Развертывание Production среды

```bash
cd src/environments/production
terraform init
# Обязательно просмотрите план!
terraform plan
# Применяйте только после тщательной проверки
terraform apply
```

## Выбор среды

### Используйте **dev** для:
- ✅ Разработки новых функций
- ✅ Отладки и тестирования
- ✅ Экспериментов с конфигурацией
- ✅ Обучения и изучения платформы
- ❌ Нагрузочного тестирования
- ❌ Демонстрации клиентам

### Используйте **staging** для:
- ✅ Финального тестирования перед релизом
- ✅ Интеграционного тестирования
- ✅ Проверки миграций базы данных
- ✅ Тестирования автоматизации развертывания
- ✅ UAT (User Acceptance Testing)
- ❌ Разработки
- ❌ Production нагрузок

### Используйте **production** для:
- ✅ Проведения хакатона HackLoad 2025
- ✅ Нагрузочного тестирования команд участников
- ✅ Реальных пользователей и трафика
- ✅ Критически важных операций
- ❌ Экспериментов
- ❌ Нестабильного кода

## Миграция между средами

### Dev → Staging

1. Убедитесь, что код стабилен в dev
2. Обновите тег образа для staging
3. Примените конфигурацию staging
4. Проведите интеграционные тесты

```bash
# Обновление staging до версии из dev
cd src/environments/staging
terraform apply -var="app_image_tag=dev-stable-v1.2.3"
```

### Staging → Production

1. Полное тестирование в staging
2. Создание резервной копии production
3. Запланированное окно обслуживания
4. Поэтапное развертывание

```bash
# Обновление production (с осторожностью!)
cd src/environments/production
terraform plan -var="app_image_tag=v1.2.3"
terraform apply -var="app_image_tag=v1.2.3"
```

## Мониторинг всех сред

### Центральная панель мониторинга

Каждая среда имеет собственный экземпляр Grafana:

- **Dev**: `https://grafana-dev.hackload.example.com`
- **Staging**: `https://grafana-staging.hackload.example.com`
- **Production**: `https://grafana.hackload.example.com`

### Ключевые метрики для отслеживания

| Метрика | Dev | Staging | Production |
|---------|-----|---------|-----------|
| Доступность | >95% | >99% | >99.9% |
| Время отклика | <1s | <500ms | <200ms |
| Использование CPU | <90% | <80% | <70% |
| Использование памяти | <90% | <85% | <80% |
| Дисковое пространство | <90% | <85% | <80% |

## Безопасность

### Изоляция сред

- Каждая среда развертывается в отдельном namespace
- Сетевые политики ограничивают межсредовой трафик
- Отдельные секреты и конфигурации
- Разные домены и сертификаты

### Доступ к средам

| Роль | Dev | Staging | Production |
|------|-----|---------|-----------|
| Разработчики | Полный доступ | Только чтение | Нет доступа |
| QA инженеры | Чтение | Полный доступ | Только чтение |
| DevOps | Полный доступ | Полный доступ | Полный доступ |
| Менеджеры | Только мониторинг | Только мониторинг | Только мониторинг |

## Резервное копирование

### Стратегия по средам

| Компонент | Dev | Staging | Production |
|-----------|-----|---------|-----------|
| База данных | Нет | Еженедельно | Ежедневно |
| Конфигурация | Git | Git | Git + S3 |
| Логи | 1 день | 7 дней | 30 дней |
| Метрики | 7 дней | 30 дней | 90 дней |

## Стоимость и оптимизация

### Приблизительная стоимость в месяц (AWS)

| Среда | Compute | Storage | Network | Итого |
|-------|---------|---------|---------|-------|
| **Dev** | $50 | $10 | $5 | ~$65 |
| **Staging** | $150 | $30 | $15 | ~$195 |
| **Production** | $600 | $120 | $50 | ~$770 |

### Оптимизация затрат

#### Dev среда
- Автоматическое выключение в нерабочее время
- Spot экземпляры для некритических задач
- Минимальные ресурсы мониторинга

#### Staging среда
- Включение только для тестирования релизов
- Shared storage для несекретных данных
- Автоматическая очистка старых данных

#### Production среда
- Reserved экземпляры для постоянных нагрузок
- Автомасштабирование для оптимизации
- Мониторинг и алертинг для предотвращения перерасхода

## Автоматизация

### CI/CD pipeline

```yaml
# Пример .github/workflows/deploy.yml
name: Deploy to environments
on:
  push:
    branches: [main, develop]
    
jobs:
  deploy-dev:
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to dev
        run: |
          cd src/environments/dev
          terraform init
          terraform apply -auto-approve
          
  deploy-staging:
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to staging
        run: |
          cd src/environments/staging
          terraform init
          terraform plan
          terraform apply -auto-approve
          
  deploy-production:
    if: startsWith(github.ref, 'refs/tags/v')
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to production
        run: |
          cd src/environments/production
          terraform init
          terraform plan
          # Требует ручного подтверждения
          terraform apply
```

## Устранение неполадок

### Общие проблемы

#### Проблема: Недостаток ресурсов
```bash
# Проверка использования ресурсов
kubectl top nodes
kubectl top pods --all-namespaces

# Масштабирование кластера
terraform apply -var="node_count=4"
```

#### Проблема: Сбой развертывания
```bash
# Откат к предыдущей версии
terraform apply -var="app_image_tag=previous-version"

# Проверка логов
kubectl logs -n hackload -l app=hackload-app
```

#### Проблема: Проблемы с сетью между средами
```bash
# Проверка сетевых политик
kubectl get networkpolicies --all-namespaces

# Тестирование связности
kubectl run test-pod --image=busybox --rm -it -- /bin/sh
```

## Полезные команды

### Быстрая диагностика всех сред

```bash
#!/bin/bash
# check-all-environments.sh

ENVIRONMENTS=("dev" "staging" "production")

for env in "${ENVIRONMENTS[@]}"; do
    echo "=== Checking $env environment ==="
    cd "src/environments/$env"
    
    echo "Terraform status:"
    terraform show -json | jq '.values.root_module.resources | length'
    
    echo "Kubernetes status:"
    kubectl get pods --all-namespaces --context="$env-context"
    
    echo "Application health:"
    curl -s "https://$env.hackload.example.com/health" | jq .
    
    echo ""
done
```

### Синхронизация конфигураций

```bash
#!/bin/bash
# sync-configs.sh

# Копирование общих настроек из dev в staging
cp src/environments/dev/common-settings.tf src/environments/staging/

# Обновление версий модулей во всех средах
find src/environments -name "main.tf" -exec sed -i 's/version = "1.0.0"/version = "1.1.0"/g' {} \;
```

## Дальнейшее развитие

### Планируемые улучшения

1. **Multi-region развертывание** для production
2. **GitOps с ArgoCD** для автоматизации развертывания
3. **Service Mesh (Istio)** для улучшения безопасности
4. **Chaos Engineering** для тестирования устойчивости
5. **Blue-Green развертывания** для zero-downtime обновлений

### Документация

- [Развертывание dev среды](dev/README.md)
- [Развертывание staging среды](staging/README.md)  
- [Развертывание production среды](production/README.md)
- [Документация модулей](../modules/README.md)
- [Основная документация проекта](../../README.md)
