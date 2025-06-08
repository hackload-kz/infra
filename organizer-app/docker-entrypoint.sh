#!/bin/sh

# Ждем, пока база данных будет готова
echo "Waiting for database to be ready..."
until nc -z db 5432; do
  echo "Database is unavailable - sleeping"
  sleep 1
done

echo "Database is ready!"

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
