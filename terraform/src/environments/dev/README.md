# HackLoad 2025 - Окружение разработки

## Обзор

Это окружение разработки для платформы HackLoad 2025. Оно предназначено для:

- Разработки и тестирования новых функций
- Валидации изменений инфраструктуры
- Экспериментов с конфигурацией
- Быстрого прототипирования

## Конфигурация

### Ресурсы

- **Kubernetes кластер**: 1 узел t3.medium
- **База данных**: Одиночный экземпляр PostgreSQL 15
- **Хранилище**: Минимальные объемы (20Gi для БД, 20Gi для метрик)
- **Мониторинг**: Базовая конфигурация без высокой доступности
- **Нагрузочное тестирование**: До 2 одновременных тестов

### Особенности разработки

- Отключено автомасштабирование кластера
- Нет репликации базы данных
- Упрощенное резервное копирование (еженедельно)
- Минимальные лимиты ресурсов
- Отключена персистентность Grafana

## Развертывание

### Предварительные требования

```bash
# Убедитесь, что у вас есть доступ к Kubernetes кластеру
kubectl cluster-info

# Убедитесь, что Terraform инициализирован
terraform --version
```

### Развертывание

```bash
# Перейдите в директорию окружения разработки
cd src/environments/dev

# Инициализируйте Terraform
terraform init

# Проверьте план развертывания
terraform plan

# Примените конфигурацию
terraform apply
```

### Проверка развертывания

```bash
# Проверьте статус подов
kubectl get pods --all-namespaces

# Проверьте статус сервисов
kubectl get svc --all-namespaces

# Проверьте статус кластера PostgreSQL
kubectl get cluster -n hackload
```

## Доступ к сервисам

### Port Forwarding (для локальной разработки)

```bash
# Grafana (дашборды)
kubectl port-forward -n monitoring svc/grafana 3000:80
# Доступ: http://localhost:3000 (admin/dev123!)

# Prometheus (метрики)
kubectl port-forward -n monitoring svc/prometheus 9090:9090
# Доступ: http://localhost:9090

# HackLoad приложение (API)
kubectl port-forward -n hackload svc/hackload-app 8080:80
# Доступ: http://localhost:8080
```

### Прямой доступ через kubectl

```bash
# Получить логи приложения
kubectl logs -n hackload deployment/hackload-app

# Получить логи базы данных
kubectl logs -n hackload cluster/hackload-postgres-dev

# Подключиться к базе данных
kubectl exec -it -n hackload cluster/hackload-postgres-dev -- psql -U hackload_app hackload
```

## Тестирование

### API тестирование

```bash
# Проверка здоровья приложения
curl http://localhost:8080/health

# Список команд
curl http://localhost:8080/api/teams

# Создание тестовой команды
curl -X POST http://localhost:8080/api/teams \
  -H "Content-Type: application/json" \
  -d '{"name": "test-team", "endpoint": "https://test.example.com"}'
```

### Нагрузочное тестирование

```bash
# Создание простого K6 теста
kubectl apply -f - <<EOF
apiVersion: k6.io/v1alpha1
kind: K6
metadata:
  name: dev-test
  namespace: hackload
spec:
  parallelism: 1
  script:
    configMap:
      name: dev-test-script
      file: test.js
EOF
```

## Мониторинг

### Grafana дашборды

- **HackLoad Overview**: Общая информация о платформе
- **Load Test Results**: Результаты нагрузочных тестов
- **Infrastructure Health**: Состояние инфраструктуры
- **Database Performance**: Производительность PostgreSQL

### Prometheus метрики

- `hackload_active_tests`: Количество активных тестов
- `hackload_registered_teams`: Количество зарегистрированных команд
- `hackload_api_requests_total`: Общее количество API запросов
- `postgres_up`: Статус базы данных

## Устранение неполадок

### Распространенные проблемы

1. **Поды не запускаются**
   ```bash
   kubectl describe pod <pod-name> -n <namespace>
   kubectl logs <pod-name> -n <namespace>
   ```

2. **База данных недоступна**
   ```bash
   kubectl get cluster -n hackload
   kubectl describe cluster hackload-postgres-dev -n hackload
   ```

3. **Недостаточно ресурсов**
   ```bash
   kubectl top nodes
   kubectl top pods --all-namespaces
   ```

### Полезные команды

```bash
# Перезапуск всех компонентов
kubectl rollout restart deployment --all --all-namespaces

# Очистка завершившихся подов
kubectl delete pods --field-selector=status.phase=Succeeded --all-namespaces

# Проверка событий кластера
kubectl get events --sort-by=.metadata.creationTimestamp
```

## Очистка

```bash
# Удаление всех ресурсов
terraform destroy

# Подтверждение удаления
# Введите "yes" когда будет запрошено подтверждение
```

## Разработка

### Локальные изменения

1. Внесите изменения в модули
2. Протестируйте изменения в этом окружении
3. Проверьте работоспособность всех компонентов
4. Примените изменения в staging окружении

### Добавление новых компонентов

1. Добавьте модуль в `main.tf`
2. Обновите переменные в `variables.tf`
3. Добавьте выходные параметры в `outputs.tf`
4. Обновите документацию

## Контакты

По вопросам окружения разработки обращайтесь к команде инфраструктуры.
