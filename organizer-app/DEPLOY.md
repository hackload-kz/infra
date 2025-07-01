# Деплой с Docker

## Быстрый старт с Docker

### Локальная разработка с Docker Compose

```bash
# Сборка и запуск всех сервисов
docker-compose up --build

# Запуск в фоновом режиме
docker-compose up -d --build

# Остановка сервисов
docker-compose down

# Очистка данных
docker-compose down -v
```

### Ручная сборка Docker образа

```bash
# Сборка образа
docker build -t hackload-organizer .

# Запуск контейнера
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:password@host:5432/db" \
  -e NEXTAUTH_URL="http://localhost:3000" \
  -e NEXTAUTH_SECRET="your-secret" \
  -e GOOGLE_CLIENT_ID="your-google-client-id" \
  -e GOOGLE_CLIENT_SECRET="your-google-client-secret" \
  -e GITHUB_CLIENT_ID="your-github-client-id" \
  -e GITHUB_CLIENT_SECRET="your-github-client-secret" \
  -e ADMIN_USERS="admin@hackload.com" \
  hackload-organizer
```

## GitHub Container Registry

### Автоматическая сборка

При пуше в ветку `main` GitHub Actions автоматически:
1. Собирает Docker образ
2. Публикует его в `ghcr.io/your-username/your-repo`
3. Создает теги:
   - `latest` для main ветки
   - `sha-xxxxxxx` для каждого коммита
   - Теги веток для feature branches

### Ручное использование образа из GHCR

```bash
# Авторизация в GHCR
echo $GITHUB_TOKEN | docker login ghcr.io -u username --password-stdin

# Скачивание образа
docker pull ghcr.io/your-username/your-repo:latest

# Запуск
docker run -p 3000:3000 \
  -e DATABASE_URL="your-db-url" \
  -e NEXTAUTH_URL="https://your-domain.com" \
  -e NEXTAUTH_SECRET="your-secret" \
  -e GOOGLE_CLIENT_ID="your-google-client-id" \
  -e GOOGLE_CLIENT_SECRET="your-google-client-secret" \
  -e GITHUB_CLIENT_ID="your-github-client-id" \
  -e GITHUB_CLIENT_SECRET="your-github-client-secret" \
  -e ADMIN_USERS="admin@hackload.com" \
  ghcr.io/your-username/your-repo:latest
```

## Переменные окружения для продакшена

```env
NODE_ENV=production
DATABASE_URL=postgresql://user:password@host:5432/db
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=secure-random-secret-change-this
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
ADMIN_USERS=admin@hackload.com,organizer@hackload.com
```

## Kubernetes деплой (пример)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hackload-organizer
spec:
  replicas: 2
  selector:
    matchLabels:
      app: hackload-organizer
  template:
    metadata:
      labels:
        app: hackload-organizer
    spec:
      containers:
      - name: app
        image: ghcr.io/your-username/your-repo:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: database-url
        - name: NEXTAUTH_SECRET
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: nextauth-secret
        - name: NEXTAUTH_URL
          value: "https://your-domain.com"
        - name: ADMIN_USERS
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: admin-users
---
apiVersion: v1
kind: Service
metadata:
  name: hackload-organizer-service
spec:
  selector:
    app: hackload-organizer
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer
```
