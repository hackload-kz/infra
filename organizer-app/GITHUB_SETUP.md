# Настройка GitHub Actions для CI/CD

## Подготовка репозитория

### 1. Создание репозитория на GitHub

Если репозиторий еще не создан:

```bash
# Инициализация git репозитория
git init
git add .
git commit -m "Initial commit: HackLoad Organizer application"

# Добавление удаленного репозитория
git remote add origin https://github.com/your-username/hackload-organizer.git
git branch -M main
git push -u origin main
```

### 2. Настройка разрешений для GitHub Actions

Перейдите в настройки репозитория на GitHub:

1. **Settings** → **Actions** → **General**
2. В разделе **Workflow permissions** выберите:
   - ✅ **Read and write permissions**
   - ✅ **Allow GitHub Actions to create and approve pull requests**

3. **Settings** → **Code and automation** → **Pages**
4. В разделе **Build and deployment** выберите **GitHub Actions**

### 3. Настройка Container Registry

GitHub Container Registry (ghcr.io) будет автоматически доступен с правильными разрешениями.

Для просмотра образов:
1. Перейдите на главную страницу репозитория
2. Справа найдите раздел **Packages**
3. После первого успешного build там появится ваш Docker образ

### 4. Проверка переменных окружения

Убедитесь, что в корне проекта есть файл `.env` с правильными значениями для разработки.

## Использование CI/CD

### Автоматические сборки

GitHub Actions будет автоматически запускаться при:

- ✅ **Push в main** → сборка и публикация Docker образа с тегом `latest`
- ✅ **Push в другие ветки** → сборка образа с тегом ветки
- ✅ **Pull Request** → проверка качества кода и сборка

### Проверка статуса сборки

После push вы можете отслеживать прогресс:

1. Перейдите в репозиторий на GitHub
2. Вкладка **Actions**
3. Выберите нужный workflow

### Badges для README

Добавьте badges в README для отображения статуса:

```markdown
![Build Status](https://github.com/your-username/hackload-organizer/workflows/Build%20and%20Push%20Docker%20Image/badge.svg)
![Code Quality](https://github.com/your-username/hackload-organizer/workflows/Code%20Quality/badge.svg)
```

## Безопасность

### Secrets в GitHub

Для продакшн деплоя добавьте секреты в репозиторий:

1. **Settings** → **Secrets and variables** → **Actions**
2. Добавьте необходимые секреты:
   - `DATABASE_URL`
   - `NEXTAUTH_SECRET`
   - `ADMIN_USERS` (для продакшена)

### Использование secrets в workflow

```yaml
env:
  DATABASE_URL: ${{ secrets.DATABASE_URL }}
  NEXTAUTH_SECRET: ${{ secrets.NEXTAUTH_SECRET }}
```

## Локальное тестирование

Для тестирования Docker образа локально:

```bash
# Запуск скрипта тестирования
./test-docker.sh

# Или ручная сборка и запуск
docker build -t hackload-organizer .
docker run -p 3000:3000 hackload-organizer
```

## Troubleshooting

### Проблема с правами доступа

Если возникла ошибка с правами доступа к ghcr.io:

1. Проверьте настройки **Workflow permissions**
2. Убедитесь, что репозиторий публичный или у вас есть права на packages

### Проблема с Prisma в Docker

Если возникают проблемы с Prisma Client в Docker:

1. Убедитесь, что `npx prisma generate` выполняется в Dockerfile
2. Проверьте, что Prisma схема копируется в образ

### Проблема с переменными окружения

Для локального тестирования Docker образа:

1. Создайте `.env.docker` с тестовыми значениями
2. Используйте `docker run --env-file .env.docker`
