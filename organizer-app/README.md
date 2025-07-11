# Хакатон Организатор

Веб-приложение для организаторов хакатона билетного сервиса. Позволяет управлять командами и в будущем запускать нагрузочные тесты.

## Функции

- 🔐 Аутентификация через переменные окружения
- 👥 Управление командами (создание, редактирование, удаление)
- 🗂️ Мягкое удаление команд
- 🌐 URL-friendly никнеймы команд
- 📊 Панель управления с левым сайдбаром

## Технологии

- **Frontend**: Next.js 15 с App Router, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **База данных**: PostgreSQL с Prisma ORM
- **Аутентификация**: NextAuth.js

## Установка и запуск

### 1. Клонирование и установка зависимостей

```bash
git clone <repository-url>
cd organizer-app
npm install
```

### 2. Настройка базы данных

Создайте PostgreSQL базу данных и обновите `DATABASE_URL` в файле `.env`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/hackload_organizer?schema=public"
```

### 3. Настройка переменных окружения

Обновите файл `.env`:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/hackload_organizer?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret-key-here-change-this-in-production"

# OAuth Providers
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"

# Admin Users (email addresses separated by comma)
ADMIN_USERS="admin@hackload.com,organizer@hackload.com"
```

### 4. Применение миграций

```bash
npx prisma db push
npx prisma generate
```

### 5. Запуск приложения

```bash
npm run dev
```

Приложение будет доступно по адресу [http://localhost:3000](http://localhost:3000)

## Использование

### Вход в систему

1. Перейдите на [http://localhost:3000](http://localhost:3000)
2. Войдите в систему через Google или GitHub, используя один из email-ов, указанных в `ADMIN_USERS`
3. Автоматический редирект в панель управления

### Управление командами

В разделе "Команды" вы можете:

- **Создать команду**: нажмите "Добавить команду"
- **Редактировать команду**: нажмите кнопку редактирования
- **Просмотреть команду**: нажмите кнопку просмотра
- **Удалить команду**: нажмите кнопку удаления (мягкое удаление)

### Атрибуты команды

- **Название**: отображаемое имя команды
- **Никнейм**: используется в URL (только буквы, цифры, дефисы и подчеркивания)

## Структура проекта

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API маршруты
│   ├── dashboard/         # Панель управления
│   └── login/             # Страница входа
├── components/            # React компоненты
│   ├── ui/               # Базовые UI компоненты
│   ├── header.tsx        # Заголовок
│   ├── sidebar.tsx       # Боковое меню
│   └── login-form.tsx    # Форма входа
└── lib/                  # Утилиты
    ├── db.ts             # Prisma клиент
    └── utils.ts          # Общие утилиты
```

## Команды разработки

```bash
# Запуск в режиме разработки
npm run dev

# Сборка проекта
npm run build

# Запуск production сборки
npm start

# Линтинг
npm run lint

# Работа с базой данных
npx prisma studio          # Просмотр данных
npx prisma db push         # Применение схемы
npx prisma generate        # Генерация клиента
npx prisma db seed         # Заполнение тестовыми данными (если настроено)
```

## Переменные окружения

| Переменная | Описание | Пример |
|------------|----------|---------|
| `DATABASE_URL` | Строка подключения к PostgreSQL | `postgresql://user:pass@localhost:5432/db` |
| `NEXTAUTH_URL` | URL приложения | `http://localhost:3000` |
| `NEXTAUTH_SECRET` | Секретный ключ для NextAuth | `your-secret-key` |
| `GOOGLE_CLIENT_ID` | Client ID для Google OAuth | `your-google-client-id` |
| `GOOGLE_CLIENT_SECRET` | Client Secret для Google OAuth | `your-google-client-secret` |
| `GITHUB_CLIENT_ID` | Client ID для GitHub OAuth | `your-github-client-id` |
| `GITHUB_CLIENT_SECRET` | Client Secret для GitHub OAuth | `your-github-client-secret` |
| `ADMIN_USERS` | Email адреса администраторов через запятую | `admin@test.com,user@test.com` |

## Безопасность

- Аутентификация происходит только через OAuth (Google и GitHub)
- Пароли не хранятся в системе, так как используется только OAuth
- В продакшене рекомендуется настроить OAuth приложения с правильными callback URL
- Обязательно смените `NEXTAUTH_SECRET` в продакшене
- Убедитесь, что OAuth приложения настроены с правильными доменами в продакшене

## Дизайн и UX

### Улучшения контрастности

Приложение имеет улучшенную цветовую схему для лучшей читаемости:

- ✅ **Высокий контраст текста** - все тексты имеют достаточный контраст на белом фоне
- ✅ **Темная боковая панель** - боковая навигация использует темную тему для лучшего визуального разделения
- ✅ **Четкие границы** - все элементы имеют четкие границы и тени для лучшего восприятия
- ✅ **Улучшенные формы** - поля ввода и кнопки имеют четкие состояния фокуса
- ✅ **Градиентный фон** - страница входа использует градиентный фон для лучшего визуального эффекта

### Цветовая схема

- **Основной текст**: `text-gray-900` (#111827)
- **Вторичный текст**: `text-gray-700` (#374151)  
- **Боковая панель**: `bg-gray-900` с белым текстом
- **Активные состояния**: `bg-blue-600` для кнопок и навигации
- **Границы**: `border-gray-300` для четкого разделения

## Roadmap

- [ ] Система нагрузочного тестирования
- [ ] Мониторинг результатов тестов
- [ ] API endpoints для команд
- [ ] Более сложная система ролей
- [ ] Интеграция с системами мониторинга

## CI/CD и Деплой

### GitHub Actions

Проект настроен с автоматическим CI/CD:

- ✅ **Сборка и тесты** - проверка кода при каждом PR
- ✅ **Docker образы** - автоматическая сборка и публикация в `ghcr.io`
- ✅ **Multi-platform** - поддержка AMD64 и ARM64 архитектур
- ✅ **Кеширование** - ускоренная сборка благодаря GitHub Actions cache

### Docker образы

Образы автоматически публикуются в GitHub Container Registry:

- `ghcr.io/your-username/your-repo:latest` - последняя версия main ветки
- `ghcr.io/your-username/your-repo:sha-xxxxxxx` - версия для конкретного коммита

Подробные инструкции по деплою см. в [DEPLOY.md](./DEPLOY.md)
