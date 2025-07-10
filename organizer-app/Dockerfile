# Используем официальный Node.js образ
FROM node:20-alpine AS base

# Устанавливаем зависимости только когда нужно
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Оптимизация npm для быстрой установки
RUN npm config set registry https://registry.npmjs.org/
RUN npm config set fetch-retries 3
RUN npm config set fetch-retry-mintimeout 10000
RUN npm config set fetch-retry-maxtimeout 60000

# Копируем файлы зависимостей
COPY package.json package-lock.json* ./

# Используем npm ci без verbose для быстрой установки
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev --silent

# Пересборка исходного кода только когда нужно
FROM base AS builder
WORKDIR /app

# Устанавливаем все зависимости (включая dev) для сборки
COPY package.json package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --silent

# Копируем исходный код
COPY . .

# Генерируем Prisma Client
RUN npx prisma generate

# Отключаем телеметрию Next.js во время сборки
ENV NEXT_TELEMETRY_DISABLED=1

# Собираем приложение
RUN npm run build

# Production образ, копируем только необходимые файлы
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Копируем публичные файлы
COPY --from=builder /app/public ./public

# Автоматически используем output traces для уменьшения размера образа
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Копируем Prisma схему и сгенерированный клиент
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Копируем скрипт запуска
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Устанавливаем netcat для проверки подключения к БД и wget для healthcheck
USER root
RUN apk add --no-cache netcat-openbsd wget
USER nextjs

EXPOSE 3300

ENV PORT=3300
ENV HOSTNAME="0.0.0.0"

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3300/api/health || exit 1

CMD ["./docker-entrypoint.sh"]
