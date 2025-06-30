#!/bin/sh

# Устанавливаем права на выполнение для prisma
chmod +x ./node_modules/.bin/prisma || true

# Запускаем миграции
echo "Running database migrations..."
npx prisma migrate deploy

# Запускаем seed (если нужно)
echo "Running database seed..."
npx prisma db seed || echo "Seed failed or not configured"

# Запускаем приложение
echo "Starting application..."
exec node server.js
