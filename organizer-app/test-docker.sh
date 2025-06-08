#!/bin/bash

# Скрипт для локального тестирования Docker образа

set -e

echo "🐳 Тестирование Docker образа HackLoad Organizer..."

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Функция для логирования
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

# Проверка зависимостей
if ! command -v docker &> /dev/null; then
    error "Docker не установлен"
fi

# Параметры
IMAGE_NAME="hackload-organizer"
CONTAINER_NAME="hackload-organizer-test"
PORT="3001"

# Очистка предыдущих запусков
log "Очистка предыдущих контейнеров..."
docker stop $CONTAINER_NAME 2>/dev/null || true
docker rm $CONTAINER_NAME 2>/dev/null || true

# Сборка образа
log "Сборка Docker образа..."
docker build -t $IMAGE_NAME .

# Запуск контейнера
log "Запуск контейнера на порту $PORT..."
docker run -d \
  --name $CONTAINER_NAME \
  -p $PORT:3000 \
  -e NODE_ENV=production \
  -e DATABASE_URL="postgresql://test:test@host.docker.internal:5432/test" \
  -e NEXTAUTH_URL="http://localhost:$PORT" \
  -e NEXTAUTH_SECRET="test-secret-for-docker-testing" \
  -e ADMIN_USERS="admin@hackload.com:admin123,test@hackload.com:test123" \
  $IMAGE_NAME

# Ожидание запуска
log "Ожидание запуска приложения..."
sleep 10

# Проверка здоровья
log "Проверка здоровья приложения..."
if curl -f http://localhost:$PORT > /dev/null 2>&1; then
    log "✅ Приложение успешно запущено!"
    log "🌐 Доступно по адресу: http://localhost:$PORT"
    log "🔑 Логин: admin@hackload.com / admin123"
else
    error "❌ Приложение не отвечает"
fi

# Показать логи
log "Последние логи контейнера:"
docker logs $CONTAINER_NAME --tail 20

echo
log "Для остановки выполните: docker stop $CONTAINER_NAME"
log "Для удаления выполните: docker rm $CONTAINER_NAME"
