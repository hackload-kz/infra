# Используем официальный Node.js образ
FROM node:20-alpine AS base

# Устанавливаем системные зависимости
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Глобальные оптимизации npm
RUN npm config set registry https://registry.npmjs.org/ && \
    npm config set fetch-retries 3 && \
    npm config set fetch-retry-mintimeout 10000 && \
    npm config set fetch-retry-maxtimeout 60000 && \
    npm config set progress false && \
    npm config set loglevel info

# Этап установки production зависимостей
FROM base AS deps
# Копируем только файлы зависимостей для лучшего кэширования
COPY package.json package-lock.json* ./
# Устанавливаем production зависимости с оптимизацией
RUN --mount=type=cache,target=/root/.npm \
    --mount=type=cache,target=/app/.npm \
    npm ci --omit=dev --silent --no-audit --no-fund

# Этап сборки
FROM base AS builder
# Копируем файлы зависимостей
COPY package.json package-lock.json* ./
# Устанавливаем все зависимости (включая dev) для сборки
RUN --mount=type=cache,target=/root/.npm \
    --mount=type=cache,target=/app/.npm \
    npm ci --silent --no-audit --no-fund

# Копируем только необходимые файлы для сборки
COPY next.config.ts ./
COPY tailwind.config.ts ./
COPY tsconfig.json ./
COPY postcss.config.js ./
COPY prisma ./prisma/

# Генерируем Prisma Client
RUN npx prisma generate

# Копируем исходный код
COPY src ./src/
COPY public ./public/

# Оптимизации сборки
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV SKIP_ENV_VALIDATION=1

# Собираем приложение с оптимизациями
RUN npm run build:docker

# Production образ, копируем только необходимые файлы
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Создаем пользователя и группу для безопасности
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Устанавливаем необходимые системные пакеты
RUN apk add --no-cache netcat-openbsd wget

# Копируем production зависимости из deps stage
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# Копируем публичные файлы
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Автоматически используем output traces для уменьшения размера образа
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Копируем Prisma схему и сгенерированный клиент
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

# Копируем скрипт запуска
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh && chown nextjs:nodejs docker-entrypoint.sh

# Переключаемся на непривилегированного пользователя
USER nextjs

EXPOSE 3300

ENV PORT=3300
ENV HOSTNAME="0.0.0.0"

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3300/api/health || exit 1

CMD ["./docker-entrypoint.sh"]
