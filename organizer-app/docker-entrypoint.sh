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

# Start the application in background
node server.js &
APP_PID=$!

# Wait for the app to be ready
echo "Waiting for application to be ready..."
sleep 5

# Initialize background jobs
echo "Initializing background jobs..."
node -e "
const http = require('http');
const postData = JSON.stringify({});
const options = {
  hostname: 'localhost',
  port: 8080,
  path: '/api/init-jobs',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  },
  timeout: 10000
};
const req = http.request(options, (res) => {
  console.log('Init jobs response:', res.statusCode);
  res.on('data', (chunk) => {
    console.log('Response:', chunk.toString());
  });
});
req.on('error', (e) => console.warn('Init jobs failed (app may still be starting):', e.message));
req.on('timeout', () => console.warn('Init jobs timeout (app may still be starting)'));
req.write(postData);
req.end();
" || echo "Background job initialization attempted"

# Bring the application to foreground
wait $APP_PID
