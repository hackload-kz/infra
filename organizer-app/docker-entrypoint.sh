#!/bin/sh

# Устанавливаем права на выполнение для prisma
chmod +x ./node_modules/.bin/prisma || true

# Настраиваем логирование для Node.js
export NODE_OPTIONS="--max-old-space-size=1024"

# Запускаем миграции
echo "Running database migrations..."
npx prisma migrate deploy

# Запускаем seed (если нужно)
echo "Running database seed..."
npx prisma db seed || echo "Seed failed or not configured"

# Запускаем приложение
echo "Starting application..."
echo "Node.js version: $(node --version)"
echo "Environment: $NODE_ENV"
echo "Logging configuration:"
echo "  - console.info: enabled"
echo "  - console.warn: enabled" 
echo "  - console.error: enabled"
echo "  - console.log: $(test "$NODE_ENV" = "production" && echo "disabled" || echo "enabled")"

exec node server.js
