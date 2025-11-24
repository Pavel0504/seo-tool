# Быстрый старт

## Что было реализовано

Все 12 пунктов из задания выполнены:

✅ Аудит без сканирования sitemap/robots (использует сохраненные данные)
✅ Страницы Sitemap и Robots в навигации
✅ Многопоточное сканирование (3 потока по 100 URL)
✅ Авторизация (логин: `atlant`, пароль: `atlantpro`)
✅ Экспорт ошибок в CSV
✅ Экспорт исключений в CSV
✅ Убрана вкладка sitemap из аудита
✅ Колонки для проверки sitemap/robots в результатах
✅ Упрощена форма нового аудита
✅ Разделение фронт/бэк через ngrok
✅ Кнопка ручного обновления sitemap
✅ Кнопка ручного обновления robots

## Архитектура

```
Frontend (Netlify) → Backend API (ngrok) → Целевой сайт
       ↓
Supabase (База + Edge Functions)
```

## Развертывание за 5 шагов

### 1. Supabase
```bash
# Создайте проект на supabase.com
# Скопируйте URL и anon key
```

### 2. Edge Functions
```bash
supabase login
supabase link --project-ref YOUR_REF
supabase functions deploy update-sitemap
supabase functions deploy update-robots
supabase functions deploy scan-urls
```

### 3. Backend (ngrok)
```bash
cd server
npm install
npm start

# В другом терминале:
ngrok http 3030
# Сохраните ngrok URL
```

### 4. Frontend (.env.production)
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=https://your-ngrok-url.ngrok-free.app
```

### 5. Деплой на Netlify
```bash
npm run build
netlify deploy --prod
```

## Вход в систему

```
URL: https://your-site.netlify.app
Логин: atlant
Пароль: atlantpro
```

## Использование

### Обновление Sitemap
1. Перейдите "Sitemap"
2. Нажмите "Обновить Sitemap"
3. Данные загрузятся с https://atlantpro24.ru/urls.json

### Обновление Robots
1. Перейдите "Robots"
2. Нажмите "Обновить Robots.txt"
3. Данные загрузятся с https://atlantpro24.ru/robots.txt

### Запуск аудита
1. "Новый аудит"
2. Введите URL и путь к urls.json
3. "Начать аудит"
4. Система автоматически:
   - Сканирует все URL (быстро, 3 потока)
   - Проверяет наличие в sitemap
   - Проверяет разрешение в robots.txt
   - Отмечает проблемы

### Экспорт данных
- Аудит: кнопка "Экспорт ошибок CSV"
- Исключения: кнопка "CSV"
- Sitemap: кнопка "Экспорт CSV"

## Автоматическое обновление

Настройте в Supabase SQL Editor:

```sql
-- Sitemap в 10:00 UTC (13:00 MSK)
SELECT cron.schedule('update-sitemap-daily', '0 10 * * *',
  $$ SELECT net.http_post(...) $$
);

-- Robots в 07:00 UTC (10:00 MSK)
SELECT cron.schedule('update-robots-daily', '0 7 * * *',
  $$ SELECT net.http_post(...) $$
);
```

Полный SQL в DEPLOYMENT_GUIDE.md

## Документация

- **IMPLEMENTATION_SUMMARY.md** - что реализовано
- **DEPLOYMENT_GUIDE.md** - полная инструкция
- **README.md** - описание функций

## Troubleshooting

**Ошибки CORS:**
- Проверьте что ngrok работает
- Проверьте VITE_API_URL в .env

**Медленно сканирует:**
- Должен использовать scan-urls Edge Function
- Проверьте что функция задеплоена

**Не входит в систему:**
- Логин: `atlant`
- Пароль: `atlantpro`
- Проверьте что таблица users создана

**Sitemap/Robots не обновляются:**
- Проверьте Edge Functions в Supabase Dashboard
- Попробуйте обновить вручную через UI
- Проверьте логи

## Важно

⚠️ **ngrok в бесплатной версии** меняет URL при перезапуске
→ Обновите VITE_API_URL и пересоберите фронтенд

⚠️ **Для продакшена** используйте:
- Платный ngrok ($8/мес) с постоянным URL
- Или VPS для backend

## Готово к работе

Проект полностью функционален и готов к использованию.
Все функции протестированы и работают.

Сборка успешна: `npm run build` ✅
