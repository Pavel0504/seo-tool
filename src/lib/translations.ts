export const seoIssueTranslations = {
  '404_error': {
    description: 'Страница возвращает ошибку 404 Not Found',
    recommendation: 'Исправьте URL или настройте 301 редирект на правильную страницу'
  },
  '5xx_error': {
    description: (status: number) => `Ошибка сервера: ${status}`,
    recommendation: 'Исправьте конфигурацию сервера или ошибки приложения'
  },
  '302_redirect': {
    description: 'Страница использует 302 (временный) редирект вместо 301 (постоянный)',
    recommendation: 'Измените на 301 редирект для постоянных перемещений'
  },
  missing_title: {
    description: 'На странице отсутствует тег title',
    recommendation: 'Добавьте описательный заголовок (30-60 символов)'
  },
  title_too_short: {
    description: (length: number) => `Заголовок слишком короткий (${length} символов)`,
    recommendation: 'Увеличьте длину заголовка до 30-60 символов'
  },
  title_too_long: {
    description: (length: number) => `Заголовок слишком длинный (${length} символов)`,
    recommendation: 'Сократите длину заголовка до 30-60 символов'
  },
  missing_meta_description: {
    description: 'На странице отсутствует мета-описание',
    recommendation: 'Добавьте мета-описание (120-160 символов)'
  },
  meta_description_too_short: {
    description: (length: number) => `Мета-описание слишком короткое (${length} символов)`,
    recommendation: 'Увеличьте длину мета-описания до 120-160 символов'
  },
  meta_description_too_long: {
    description: (length: number) => `Мета-описание слишком длинное (${length} символов)`,
    recommendation: 'Сократите длину мета-описания до 120-160 символов'
  },
  missing_h1: {
    description: 'На странице отсутствует заголовок H1',
    recommendation: 'Добавьте один заголовок H1 с основным ключевым словом'
  },
  multiple_h1: {
    description: (count: number) => `На странице ${count} заголовков H1`,
    recommendation: 'Используйте только один заголовок H1 на странице'
  },
  missing_canonical: {
    description: 'На странице отсутствует canonical URL',
    recommendation: 'Добавьте canonical link для предотвращения дублирования контента'
  },
  noindex_tag: {
    description: 'Страница содержит директиву noindex',
    recommendation: 'Удалите noindex, если страница должна индексироваться'
  },
  images_without_alt: {
    description: (count: number) => `${count} изображений без атрибута alt`,
    recommendation: 'Добавьте описательный alt-текст ко всем изображениям'
  },
  thin_content: {
    description: (words: number) => `Недостаточно контента на странице (${words} слов)`,
    recommendation: 'Добавьте больше ценного контента (рекомендуется 300+ слов)'
  },
  no_https: {
    description: 'Страница не использует HTTPS',
    recommendation: 'Установите SSL сертификат и настройте редирект с HTTP на HTTPS'
  },
  mixed_content: {
    description: 'Страница содержит смешанный контент (HTTP ресурсы на HTTPS странице)',
    recommendation: 'Обновите все ресурсы для использования HTTPS'
  }
};
