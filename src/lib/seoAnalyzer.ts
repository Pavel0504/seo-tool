import { fetchViaProxy } from './fetchProxy';
import { seoIssueTranslations } from './translations';

export interface CrawlResult {
  url: string;
  status: number;
  redirectChain: string[];
  responseTime: number;
  title?: string;
  metaDescription?: string;
  h1Tags: string[];
  canonicalUrl?: string;
  robotsMeta?: string;
  hasNoindex: boolean;
  hasNofollow: boolean;
  imagesWithoutAlt: number;
  brokenImages: number;
  contentLength: number;
  internalLinks: number;
  externalLinks: number;
  brokenLinks: number;
  hasHttps: boolean;
  mixedContent: boolean;
  schemaMarkups: Array<{ type: string; count: number }>;
  html?: string;
}

export async function crawlUrl(url: string): Promise<CrawlResult> {
  const startTime = performance.now();
  const redirectChain: string[] = [];

  try {
    const proxyResponse = await fetchViaProxy(url);
    const responseTime = Math.round(performance.now() - startTime);
    const html = typeof proxyResponse.data === 'string'
      ? proxyResponse.data
      : String(proxyResponse.data);

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const title = doc.querySelector('title')?.textContent || '';
    const metaDescription = doc.querySelector('meta[name="description"]')?.getAttribute('content') || '';

    const h1Elements = doc.querySelectorAll('h1');
    const h1Tags = Array.from(h1Elements).map(h1 => h1.textContent?.trim() || '');

    const canonicalLink = doc.querySelector('link[rel="canonical"]');
    const canonicalUrl = canonicalLink?.getAttribute('href') || undefined;

    const robotsMeta = doc.querySelector('meta[name="robots"]')?.getAttribute('content') || '';
    const hasNoindex = robotsMeta.toLowerCase().includes('noindex');
    const hasNofollow = robotsMeta.toLowerCase().includes('nofollow');

    const images = doc.querySelectorAll('img');
    const imagesWithoutAlt = Array.from(images).filter(img => !img.getAttribute('alt')).length;

    const textContent = doc.body?.textContent || '';
    const contentLength = textContent.trim().split(/\s+/).length;

    const links = doc.querySelectorAll('a[href]');
    let internalLinks = 0;
    let externalLinks = 0;

    const urlObj = new URL(url);
    links.forEach(link => {
      const href = link.getAttribute('href') || '';
      if (href.startsWith('http')) {
        try {
          const linkUrl = new URL(href);
          if (linkUrl.hostname === urlObj.hostname) {
            internalLinks++;
          } else {
            externalLinks++;
          }
        } catch (e) {
          // Skip invalid URLs
        }
      } else if (!href.startsWith('#') && !href.startsWith('javascript:') && !href.startsWith('mailto:')) {
        internalLinks++;
      }
    });

    const hasHttps = url.startsWith('https://');
    const mixedContent = hasHttps && html.includes('http://');

    const schemaMarkups: Array<{ type: string; count: number }> = [];
    const jsonLdScripts = doc.querySelectorAll('script[type="application/ld+json"]');
    const schemaCounts: Record<string, number> = {};

    jsonLdScripts.forEach(script => {
      try {
        const data = JSON.parse(script.textContent || '');
        const schemaType = data['@type'] || 'Unknown';
        schemaCounts[schemaType] = (schemaCounts[schemaType] || 0) + 1;
      } catch (e) {
        // Invalid JSON-LD
      }
    });

    Object.entries(schemaCounts).forEach(([type, count]) => {
      schemaMarkups.push({ type, count });
    });

    return {
      url,
      status: proxyResponse.status,
      redirectChain,
      responseTime,
      title,
      metaDescription,
      h1Tags,
      canonicalUrl,
      robotsMeta,
      hasNoindex,
      hasNofollow,
      imagesWithoutAlt,
      brokenImages: 0,
      contentLength,
      internalLinks,
      externalLinks,
      brokenLinks: 0,
      hasHttps,
      mixedContent,
      schemaMarkups,
      html
    };
  } catch (error) {
    const responseTime = Math.round(performance.now() - startTime);
    console.error(`Error crawling ${url}:`, error);
    return {
      url,
      status: 0,
      redirectChain,
      responseTime,
      h1Tags: [],
      hasNoindex: false,
      hasNofollow: false,
      imagesWithoutAlt: 0,
      brokenImages: 0,
      contentLength: 0,
      internalLinks: 0,
      externalLinks: 0,
      brokenLinks: 0,
      hasHttps: url.startsWith('https://'),
      mixedContent: false,
      schemaMarkups: []
    };
  }
}

export interface SeoIssueResult {
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'success';
  code: string;
  description: string;
  recommendation: string;
}

export function analyzeSeoIssues(crawlResult: CrawlResult): SeoIssueResult[] {
  const issues: SeoIssueResult[] = [];

  if (crawlResult.status === 200) {
    issues.push({
      type: 'http_success',
      severity: 'success',
      code: 'http_200',
      description: 'Страница доступна и возвращает корректный HTTP статус 200',
      recommendation: 'Отлично! Продолжайте следить за доступностью страницы'
    });
  }

  if (crawlResult.status === 404) {
    issues.push({
      type: 'http_error',
      severity: 'critical',
      code: '404_error',
      description: seoIssueTranslations['404_error'].description,
      recommendation: seoIssueTranslations['404_error'].recommendation
    });
  } else if (crawlResult.status >= 500) {
    const trans = seoIssueTranslations['5xx_error'];
    issues.push({
      type: 'http_error',
      severity: 'critical',
      code: '5xx_error',
      description: typeof trans.description === 'function' ? trans.description(crawlResult.status) : trans.description,
      recommendation: trans.recommendation
    });
  } else if (crawlResult.status >= 300 && crawlResult.status < 400) {
    if (crawlResult.status === 302) {
      issues.push({
        type: 'redirect',
        severity: 'medium',
        code: '302_redirect',
        description: seoIssueTranslations['302_redirect'].description,
        recommendation: seoIssueTranslations['302_redirect'].recommendation
      });
    }
  }

  if (!crawlResult.title) {
    issues.push({
      type: 'title',
      severity: 'critical',
      code: 'missing_title',
      description: seoIssueTranslations.missing_title.description,
      recommendation: seoIssueTranslations.missing_title.recommendation
    });
  } else if (crawlResult.title.length >= 30 && crawlResult.title.length <= 60) {
    issues.push({
      type: 'title',
      severity: 'success',
      code: 'title_good',
      description: `Заголовок имеет оптимальную длину (${crawlResult.title.length} символов)`,
      recommendation: 'Отлично! Длина заголовка соответствует рекомендациям'
    });
  } else if (crawlResult.title.length < 30) {
    const trans = seoIssueTranslations.title_too_short;
    issues.push({
      type: 'title',
      severity: 'medium',
      code: 'title_too_short',
      description: typeof trans.description === 'function' ? trans.description(crawlResult.title.length) : trans.description,
      recommendation: trans.recommendation
    });
  } else if (crawlResult.title.length > 60) {
    const trans = seoIssueTranslations.title_too_long;
    issues.push({
      type: 'title',
      severity: 'low',
      code: 'title_too_long',
      description: typeof trans.description === 'function' ? trans.description(crawlResult.title.length) : trans.description,
      recommendation: trans.recommendation
    });
  }

  if (!crawlResult.metaDescription) {
    issues.push({
      type: 'meta',
      severity: 'high',
      code: 'missing_meta_description',
      description: seoIssueTranslations.missing_meta_description.description,
      recommendation: seoIssueTranslations.missing_meta_description.recommendation
    });
  } else if (crawlResult.metaDescription.length >= 120 && crawlResult.metaDescription.length <= 160) {
    issues.push({
      type: 'meta',
      severity: 'success',
      code: 'meta_description_good',
      description: `Мета-описание имеет оптимальную длину (${crawlResult.metaDescription.length} символов)`,
      recommendation: 'Отлично! Длина мета-описания соответствует рекомендациям'
    });
  } else if (crawlResult.metaDescription.length < 120) {
    const trans = seoIssueTranslations.meta_description_too_short;
    issues.push({
      type: 'meta',
      severity: 'low',
      code: 'meta_description_too_short',
      description: typeof trans.description === 'function' ? trans.description(crawlResult.metaDescription.length) : trans.description,
      recommendation: trans.recommendation
    });
  } else if (crawlResult.metaDescription.length > 160) {
    const trans = seoIssueTranslations.meta_description_too_long;
    issues.push({
      type: 'meta',
      severity: 'low',
      code: 'meta_description_too_long',
      description: typeof trans.description === 'function' ? trans.description(crawlResult.metaDescription.length) : trans.description,
      recommendation: trans.recommendation
    });
  }

  if (crawlResult.h1Tags.length === 0) {
    issues.push({
      type: 'h1',
      severity: 'high',
      code: 'missing_h1',
      description: seoIssueTranslations.missing_h1.description,
      recommendation: seoIssueTranslations.missing_h1.recommendation
    });
  } else if (crawlResult.h1Tags.length === 1) {
    issues.push({
      type: 'h1',
      severity: 'success',
      code: 'h1_good',
      description: `На странице один заголовок H1: "${crawlResult.h1Tags[0]}"`,
      recommendation: 'Отлично! Используется один заголовок H1 как рекомендовано'
    });
  } else if (crawlResult.h1Tags.length > 1) {
    const trans = seoIssueTranslations.multiple_h1;
    issues.push({
      type: 'h1',
      severity: 'medium',
      code: 'multiple_h1',
      description: typeof trans.description === 'function' ? trans.description(crawlResult.h1Tags.length) : trans.description,
      recommendation: trans.recommendation
    });
  }

  if (!crawlResult.canonicalUrl) {
    issues.push({
      type: 'canonical',
      severity: 'medium',
      code: 'missing_canonical',
      description: seoIssueTranslations.missing_canonical.description,
      recommendation: seoIssueTranslations.missing_canonical.recommendation
    });
  } else {
    issues.push({
      type: 'canonical',
      severity: 'success',
      code: 'canonical_good',
      description: `Canonical URL установлен: ${crawlResult.canonicalUrl}`,
      recommendation: 'Отлично! Canonical URL помогает избежать дублирования контента'
    });
  }

  if (crawlResult.hasNoindex) {
    issues.push({
      type: 'robots',
      severity: 'high',
      code: 'noindex_tag',
      description: seoIssueTranslations.noindex_tag.description,
      recommendation: seoIssueTranslations.noindex_tag.recommendation
    });
  }

  if (crawlResult.imagesWithoutAlt > 0) {
    const trans = seoIssueTranslations.images_without_alt;
    issues.push({
      type: 'image',
      severity: 'medium',
      code: 'images_without_alt',
      description: typeof trans.description === 'function' ? trans.description(crawlResult.imagesWithoutAlt) : trans.description,
      recommendation: trans.recommendation
    });
  }

  if (crawlResult.contentLength < 200) {
    const trans = seoIssueTranslations.thin_content;
    issues.push({
      type: 'content',
      severity: 'medium',
      code: 'thin_content',
      description: typeof trans.description === 'function' ? trans.description(crawlResult.contentLength) : trans.description,
      recommendation: trans.recommendation
    });
  } else if (crawlResult.contentLength >= 300) {
    issues.push({
      type: 'content',
      severity: 'success',
      code: 'content_good',
      description: `Страница содержит достаточно контента (${crawlResult.contentLength} слов)`,
      recommendation: 'Отлично! Объем контента соответствует рекомендациям'
    });
  }

  if (!crawlResult.hasHttps) {
    issues.push({
      type: 'technical',
      severity: 'critical',
      code: 'no_https',
      description: seoIssueTranslations.no_https.description,
      recommendation: seoIssueTranslations.no_https.recommendation
    });
  } else {
    issues.push({
      type: 'technical',
      severity: 'success',
      code: 'https_good',
      description: 'Страница использует защищенное HTTPS соединение',
      recommendation: 'Отлично! HTTPS обеспечивает безопасность и улучшает SEO'
    });
  }

  if (crawlResult.mixedContent) {
    issues.push({
      type: 'technical',
      severity: 'high',
      code: 'mixed_content',
      description: seoIssueTranslations.mixed_content.description,
      recommendation: seoIssueTranslations.mixed_content.recommendation
    });
  }

  if (crawlResult.schemaMarkups.length === 0) {
    issues.push({
      type: 'technical',
      severity: 'medium',
      code: 'no_schema_markup',
      description: 'На странице отсутствует структурированная разметка Schema.org',
      recommendation: 'Добавьте JSON-LD разметку (Schema.org) для улучшения понимания контента поисковыми системами'
    });
  } else {
    const schemaTypes = crawlResult.schemaMarkups.map(s => s.type).join(', ');
    issues.push({
      type: 'technical',
      severity: 'success',
      code: 'schema_markup_present',
      description: `На странице найдена структурированная разметка: ${schemaTypes}`,
      recommendation: 'Отлично! Schema.org разметка помогает поисковым системам лучше понимать ваш контент'
    });
  }

  return issues;
}

export function parseRobotsTxt(content: string): {
  hasErrors: boolean;
  errors: string[];
  blockedPaths: string[];
  recommendations: string[];
  correctedContent?: string;
} {
  const lines = content.split('\n');
  const errors: string[] = [];
  const blockedPaths: string[] = [];
  const recommendations: string[] = [];

  let currentUserAgent = '*';
  const rules: Record<string, string[]> = { '*': [] };

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) {
      errors.push(`Строка ${index + 1}: Неверный синтаксис - отсутствует двоеточие`);
      return;
    }

    const directive = trimmed.substring(0, colonIndex).trim().toLowerCase();
    const value = trimmed.substring(colonIndex + 1).trim();

    if (directive === 'user-agent') {
      currentUserAgent = value;
      if (!rules[currentUserAgent]) {
        rules[currentUserAgent] = [];
      }
    } else if (directive === 'disallow') {
      if (!rules[currentUserAgent]) {
        rules[currentUserAgent] = [];
      }
      rules[currentUserAgent].push(value);
      if (value) {
        blockedPaths.push(value);
      }
    } else if (directive === 'sitemap') {
      if (!value.startsWith('http')) {
        errors.push(`Строка ${index + 1}: URL Sitemap должен быть абсолютным`);
      }
    }
  });

  const importantPaths = ['/products/', '/category/', '/categories/'];
  importantPaths.forEach(path => {
    if (blockedPaths.some(blocked => path.startsWith(blocked))) {
      recommendations.push(`Важный путь '${path}' может быть заблокирован`);
    }
  });

  if (!content.includes('Sitemap:')) {
    recommendations.push('Добавьте директиву Sitemap, чтобы помочь поисковым системам найти вашу карту сайта');
  }

  return {
    hasErrors: errors.length > 0,
    errors,
    blockedPaths,
    recommendations
  };
}
