# Руководство по развертыванию SEO Audit System

## Архитектура

Система разделена на три части:
1. **Frontend** - React приложение (Netlify)
2. **Backend API** - Proxy сервер для сканирования (ngrok)
3. **Edge Functions** - Supabase Functions для обновления sitemap/robots

## Предварительные требования

- Node.js 18+
- Аккаунт Supabase (бесплатный)
- Аккаунт Netlify (бесплатный)
- ngrok установлен глобально

## Шаг 1: Настройка Supabase

### 1.1 Создание проекта

1. Зайдите на [supabase.com](https://supabase.com)
2. Создайте новый проект
3. Дождитесь инициализации базы данных

### 1.2 Получение credentials

1. Откройте Settings → API
2. Скопируйте:
   - `Project URL` (SUPABASE_URL)
   - `anon public` ключ (SUPABASE_ANON_KEY)

### 1.3 Применение миграций

Миграции уже применены автоматически. Проверьте таблицы в Table Editor:
- audits
- url_checks
- seo_issues
- stored_sitemaps
- stored_robots
- users
- exclusion_rules

### 1.4 Деплой Edge Functions

```bash
# Установите Supabase CLI (если еще нет)
npm install -g supabase

# Логин
supabase login

# Связываем проект
supabase link --project-ref YOUR_PROJECT_REF

# Деплой функций
supabase functions deploy fetch-proxy
supabase functions deploy update-sitemap
supabase functions deploy update-robots
supabase functions deploy scan-urls
```

## Шаг 2: Настройка Backend API (ngrok)

### 2.1 Настройка прокси-сервера

```bash
cd server
npm install
```

### 2.2 Запуск локально

```bash
# В папке server
npm start
```

Сервер запустится на `http://localhost:3030`

### 2.3 Создание туннеля ngrok

Откройте новый терминал:

```bash
# Запустите ngrok
ngrok http 3030
```

Вы получите URL вида: `https://xxxx-xx-xx-xx-xx.ngrok-free.app`

**Важно:** Сохраните этот URL - он понадобится для фронтенда.

### 2.4 Постоянный запуск (опционально)

Для продакшена используйте PM2:

```bash
# Установите PM2
npm install -g pm2

# Запустите сервер
cd server
pm2 start index.js --name "seo-audit-api"
pm2 save
pm2 startup
```

## Шаг 3: Настройка Frontend (Netlify)

### 3.1 Подготовка к деплою

Создайте файл `.env.production`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=https://your-ngrok-url.ngrok-free.app
```

### 3.2 Сборка проекта

```bash
npm install
npm run build
```

Папка `dist/` будет содержать готовые файлы.

### 3.3 Деплой на Netlify

#### Вариант A: Через Netlify CLI

```bash
# Установите Netlify CLI
npm install -g netlify-cli

# Логин
netlify login

# Инициализация
netlify init

# Деплой
netlify deploy --prod
```

#### Вариант B: Через веб-интерфейс

1. Зайдите на [netlify.com](https://netlify.com)
2. Нажмите "Add new site" → "Deploy manually"
3. Перетащите папку `dist/` в окно браузера
4. Дождитесь завершения деплоя

### 3.4 Настройка Environment Variables в Netlify

1. Откройте настройки сайта в Netlify
2. Перейдите в "Site settings" → "Environment variables"
3. Добавьте переменные:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_API_URL`
4. Пересоберите сайт: "Deploys" → "Trigger deploy"

## Шаг 4: Настройка автообновления Sitemap и Robots

### 4.1 Через Supabase Cron (рекомендуется)

Создайте функцию для периодического вызова:

```sql
-- В SQL Editor Supabase
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Обновление Sitemap каждый день в 10:00 UTC (13:00 MSK)
SELECT cron.schedule(
  'update-sitemap-daily',
  '0 10 * * *',
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/update-sitemap',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY", "Content-Type": "application/json"}'::jsonb,
    body := '{"site_url": "https://atlantpro24.ru", "urls_json_url": "https://atlantpro24.ru/urls.json"}'::jsonb
  );
  $$
);

-- Обновление Robots каждый день в 07:00 UTC (10:00 MSK)
SELECT cron.schedule(
  'update-robots-daily',
  '0 7 * * *',
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/update-robots',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY", "Content-Type": "application/json"}'::jsonb,
    body := '{"site_url": "https://atlantpro24.ru", "robots_txt_url": "https://atlantpro24.ru/robots.txt"}'::jsonb
  );
  $$
);
```

### 4.2 Через внешний cron-сервис

Используйте [cron-job.org](https://cron-job.org) или [EasyCron](https://www.easycron.com):

1. Создайте задачу для вызова Edge Functions
2. URL: `https://your-project.supabase.co/functions/v1/update-sitemap`
3. Метод: POST
4. Headers:
   - `Authorization: Bearer YOUR_SERVICE_ROLE_KEY`
   - `Content-Type: application/json`
5. Body:
```json
{
  "site_url": "https://atlantpro24.ru",
  "urls_json_url": "https://atlantpro24.ru/urls.json"
}
```

## Шаг 5: Проверка работы

### 5.1 Авторизация

1. Откройте ваш сайт на Netlify
2. Войдите с учетными данными:
   - Логин: `atlant`
   - Пароль: `atlantpro`

### 5.2 Обновление Sitemap

1. Перейдите на страницу "Sitemap"
2. Нажмите "Обновить Sitemap"
3. Проверьте, что данные загрузились

### 5.3 Обновление Robots

1. Перейдите на страницу "Robots"
2. Нажмите "Обновить Robots.txt"
3. Проверьте содержимое

### 5.4 Запуск аудита

1. Перейдите в "Новый аудит"
2. Введите URL сайта: `https://atlantpro24.ru`
3. Укажите URL списка URL: `https://atlantpro24.ru/urls.json`
4. Нажмите "Начать аудит"

## Архитектура работы

### Поток данных при аудите:

1. Frontend → Backend API (ngrok) → Целевой сайт
2. Backend API возвращает HTML
3. Frontend парсит HTML и сохраняет в Supabase
4. Frontend проверяет URL в stored_sitemaps
5. Frontend проверяет URL в stored_robots
6. Результаты сохраняются в url_checks с флагами:
   - `in_sitemap` - найден ли в sitemap
   - `robots_allowed` - разрешен ли robots.txt
   - `sitemap_robots_issues` - описание проблем

### Многопоточное сканирование:

Вместо последовательного сканирования используется Edge Function `scan-urls`:
- Принимает массив из 100 URL
- Запускает 3 параллельных потока
- Каждый поток обрабатывает ~33 URL
- Возвращает все результаты сразу

Frontend вызывает эту функцию для каждой порции из 100 URL.

## Обслуживание

### Обновление ngrok URL

Если ngrok URL изменился:

1. Обновите `.env.production`
2. Пересоберите: `npm run build`
3. Передеплойте на Netlify

### Мониторинг

Проверяйте логи в:
- Supabase Dashboard → Logs
- Netlify Dashboard → Functions logs
- ngrok Dashboard (если используете платный план)

### Резервное копирование

Supabase автоматически создает бэкапы. Для ручного экспорта:

```bash
# Экспорт всех данных
supabase db dump -f backup.sql
```

## Устранение неполадок

### Ошибка CORS

Если получаете CORS ошибки:
1. Проверьте, что все Edge Functions возвращают правильные CORS headers
2. Проверьте, что ngrok работает

### Медленное сканирование

1. Проверьте, что используется Edge Function `scan-urls`
2. Убедитесь, что параллельность работает (3 потока)
3. Проверьте лимиты Supabase на вашем тарифе

### Ошибки аутентификации

1. Проверьте, что пользователь `atlant` создан в таблице `users`
2. Проверьте localStorage в браузере: `seo_auth` должен быть `authenticated`

### Sitemap/Robots не обновляются

1. Проверьте, что Edge Functions задеплоены
2. Проверьте логи в Supabase Dashboard
3. Попробуйте обновить вручную через UI

## Безопасность

### Важные замечания:

1. **Никогда не коммитьте .env файлы** с реальными ключами
2. **Service Role Key** храните только на сервере, не в frontend
3. **Anon Key** можно использовать в frontend (он публичный)
4. **ngrok** в бесплатной версии меняет URL при перезапуске
5. Для продакшена рекомендуется:
   - Использовать платный ngrok с постоянным URL
   - Или разместить backend на VPS

## Производительность

### Оптимизация:

1. **Batch inserts** в Supabase (по 1000 записей)
2. **Parallel scanning** через Edge Function (3 потока)
3. **Pagination** в UI (по 100 элементов)
4. **Indexes** на часто запрашиваемых полях

### Лимиты Supabase Free Tier:

- 500 MB база данных
- 2 GB передачи данных
- 500K вызовов Edge Functions

Если превысите лимиты, рассмотрите Pro план ($25/месяц).

## Поддержка

При возникновении проблем:
1. Проверьте логи в Supabase Dashboard
2. Проверьте Network tab в DevTools браузера
3. Проверьте, что ngrok работает: `curl http://localhost:3030/health`
4. Проверьте версию Node.js: `node --version` (должна быть 18+)

## Контакты

Для вопросов по развертыванию обращайтесь к документации:
- Supabase: https://supabase.com/docs
- Netlify: https://docs.netlify.com
- ngrok: https://ngrok.com/docs
