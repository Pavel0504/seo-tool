import { useState } from 'react';
import { Play, AlertCircle, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { crawlUrl, analyzeSeoIssues, parseRobotsTxt } from '../lib/seoAnalyzer';
import { fetchViaProxy } from '../lib/fetchProxy';

export default function NewAudit() {
  const [siteUrl, setSiteUrl] = useState('https://atlantpro24.ru');
  const [urlsJsonUrl, setUrlsJsonUrl] = useState('https://atlantpro24.ru/urls.json');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [error, setError] = useState('');
  const [totalUrls, setTotalUrls] = useState(0);

  async function fetchUrlsJson() {
    setLoading(true);
    setError('');
    setProgress('Загрузка списка URL...');
    setProgressPercent(0);

    try {
      const proxyResponse = await fetchViaProxy(urlsJsonUrl);

      if (proxyResponse.status !== 200) {
        throw new Error(`HTTP ${proxyResponse.status}: ${proxyResponse.statusText}`);
      }

      const data = typeof proxyResponse.data === 'string'
        ? JSON.parse(proxyResponse.data)
        : proxyResponse.data;
      let count = 0;

      if (data.urls) {
        Object.values(data.urls).forEach((category: any) => {
          if (Array.isArray(category)) {
            count += category.length;
          }
        });
      }

      setTotalUrls(count);
      setProgress(`Загружено ${count.toLocaleString('ru-RU')} URL`);
      setProgressPercent(100);

      setTimeout(() => {
        setProgress('');
        setProgressPercent(0);
      }, 2000);
    } catch (err) {
      setError(`Ошибка загрузки URLs: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`);
    } finally {
      setLoading(false);
    }
  }


  async function extractUrlsFromJson(obj: any): Promise<string[]> {
    const result: string[] = [];
    const stack = [obj];
    const visited = new WeakSet();
    let iterations = 0;
    const MAX_ITERATIONS = 100000;

    while (stack.length > 0 && iterations < MAX_ITERATIONS) {
      iterations++;
      const current = stack.pop();

      if (!current || typeof current !== 'object') continue;
      if (visited.has(current)) continue;

      visited.add(current);

      if (Array.isArray(current)) {
        for (let i = current.length - 1; i >= 0; i--) {
          const item = current[i];
          if (!item) continue;

          if (typeof item === 'string' && item.startsWith('http')) {
            result.push(item);
          } else if (typeof item === 'object' && item.url && typeof item.url === 'string') {
            result.push(item.url);
          } else if (typeof item === 'object') {
            stack.push(item);
          }
        }
      } else {
        const values = Object.values(current);
        for (let i = values.length - 1; i >= 0; i--) {
          const value = values[i];
          if (value && typeof value === 'object') {
            stack.push(value);
          }
        }
      }
    }

    return [...new Set(result)];
  }

  async function processSitemapIndex(indexUrl: string, auditId: string) {
    const parser = new DOMParser();
    const sitemapUrls: Set<string> = new Set();

    try {
      const indexResponse = await fetchViaProxy(indexUrl);
      const indexXml = typeof indexResponse.data === 'string'
        ? indexResponse.data
        : String(indexResponse.data);
      const indexDoc = parser.parseFromString(indexXml, 'text/xml');

      const sitemapLocs = indexDoc.querySelectorAll('sitemapindex > sitemap > loc');

      setProgress(`Обнаружено ${sitemapLocs.length} sitemap файлов...`);

      let processedSitemaps = 0;
      for (const loc of sitemapLocs) {
        const sitemapUrl = loc.textContent;
        if (sitemapUrl) {
          processedSitemaps++;
          setProgress(`Обработка sitemap ${processedSitemaps}/${sitemapLocs.length}...`);

          try {
            const sitemapResponse = await fetchViaProxy(sitemapUrl);
            const sitemapXml = typeof sitemapResponse.data === 'string'
              ? sitemapResponse.data
              : String(sitemapResponse.data);
            const sitemapDoc = parser.parseFromString(sitemapXml, 'text/xml');

            const urlElements = sitemapDoc.querySelectorAll('url > loc');
            const urlsToInsert: any[] = [];

            for (const urlEl of urlElements) {
              const url = urlEl.textContent;
              if (url && !sitemapUrls.has(url)) {
                sitemapUrls.add(url);
                urlsToInsert.push({
                  audit_id: auditId,
                  sitemap_url: sitemapUrl,
                  url: url,
                  lastmod: urlEl.parentElement?.querySelector('lastmod')?.textContent || null,
                  priority: urlEl.parentElement?.querySelector('priority')?.textContent || null,
                  changefreq: urlEl.parentElement?.querySelector('changefreq')?.textContent || null
                });
              }
            }

            if (urlsToInsert.length > 0) {
              const BATCH_SIZE = 1000;
              for (let i = 0; i < urlsToInsert.length; i += BATCH_SIZE) {
                const batch = urlsToInsert.slice(i, i + BATCH_SIZE);
                await supabase.from('sitemap_urls').insert(batch);
              }
            }

            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (err) {
            console.error(`Error processing sitemap ${sitemapUrl}:`, err);
          }
        }
      }

      setProgress(`Загружено ${sitemapUrls.size} URL из sitemap`);
    } catch (err) {
      console.error('Error processing sitemap index:', err);
    }
  }

  async function processSingleSitemap(sitemapUrl: string, auditId: string) {
    const parser = new DOMParser();
    const urlsToInsert: any[] = [];

    try {
      const response = await fetchViaProxy(sitemapUrl);
      const xml = typeof response.data === 'string' ? response.data : String(response.data);
      const doc = parser.parseFromString(xml, 'text/xml');

      const urlElements = doc.querySelectorAll('url > loc');

      for (const urlEl of urlElements) {
        const url = urlEl.textContent;
        if (url) {
          urlsToInsert.push({
            audit_id: auditId,
            sitemap_url: sitemapUrl,
            url: url,
            lastmod: urlEl.parentElement?.querySelector('lastmod')?.textContent || null,
            priority: urlEl.parentElement?.querySelector('priority')?.textContent || null,
            changefreq: urlEl.parentElement?.querySelector('changefreq')?.textContent || null
          });
        }
      }

      if (urlsToInsert.length > 0) {
        await supabase.from('sitemap_urls').insert(urlsToInsert);
      }
    } catch (err) {
      console.error('Error processing sitemap:', err);
    }
  }

  async function processUrlBatch(urls: string[], batchNum: number, totalBatches: number, auditId: string) {
    const BATCH_SIZE = 100;
    let retries = 0;
    const MAX_RETRIES = 3;

    for (const urlToCrawl of urls) {
      let success = false;

      while (!success && retries < MAX_RETRIES) {
        try {
          const crawlResult = await crawlUrl(urlToCrawl);
          const issues = analyzeSeoIssues(crawlResult);

          const { data: existingCheck } = await supabase
            .from('url_checks')
            .select('id')
            .eq('audit_id', auditId)
            .eq('url', crawlResult.url)
            .maybeSingle();

          if (existingCheck) {
            success = true;
            retries = 0;
            continue;
          }

          const { data: urlCheck, error: urlError } = await supabase
            .from('url_checks')
            .insert({
              audit_id: auditId,
              url: crawlResult.url,
              http_status: crawlResult.status,
              redirect_chain: crawlResult.redirectChain,
              response_time: crawlResult.responseTime,
              title: crawlResult.title,
              title_length: crawlResult.title?.length || 0,
              meta_description: crawlResult.metaDescription,
              meta_description_length: crawlResult.metaDescription?.length || 0,
              h1_tags: crawlResult.h1Tags,
              h1_count: crawlResult.h1Tags.length,
              canonical_url: crawlResult.canonicalUrl,
              robots_meta: crawlResult.robotsMeta,
              has_noindex: crawlResult.hasNoindex,
              has_nofollow: crawlResult.hasNofollow,
              images_without_alt: crawlResult.imagesWithoutAlt,
              broken_images: crawlResult.brokenImages,
              content_length: crawlResult.contentLength,
              internal_links: crawlResult.internalLinks,
              external_links: crawlResult.externalLinks,
              broken_links: crawlResult.brokenLinks,
              has_https: crawlResult.hasHttps,
              mixed_content: crawlResult.mixedContent
            })
            .select()
            .single();

          if (urlError) throw urlError;

          if (issues.length > 0) {
            await supabase.from('seo_issues').delete().eq('url_check_id', urlCheck.id);
            const issueInserts = issues.map(issue => ({
              audit_id: auditId,
              url_check_id: urlCheck.id,
              issue_type: issue.type,
              severity: issue.severity,
              issue_code: issue.code,
              description: issue.description,
              recommendation: issue.recommendation
            }));

            await supabase.from('seo_issues').insert(issueInserts);
          }

          success = true;
          retries = 0;
        } catch (err) {
          retries++;
          if (retries >= MAX_RETRIES) {
            console.error(`Failed to process ${urlToCrawl} after ${MAX_RETRIES} retries:`, err);
          } else {
            setProgress(`Повтор запроса... (${retries}/${MAX_RETRIES})`);
            await new Promise(resolve => setTimeout(resolve, 300000));
          }
        }
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  async function startAudit() {
    if (!siteUrl) {
      setError('Пожалуйста, введите URL сайта');
      return;
    }

    setLoading(true);
    setError('');
    setProgress('Создание аудита...');
    setProgressPercent(0);

    try {
      const { data: audit, error: auditError } = await supabase
        .from('audits')
        .insert({
          site_url: siteUrl,
          status: 'running',
          started_at: new Date().toISOString()
        })
        .select()
        .single();

      if (auditError) throw auditError;

      let allUrls: Set<string> = new Set();

      setProgress('Загрузка списка URL...');
      setProgressPercent(5);

      try {
        const proxyResponse = await fetchViaProxy(urlsJsonUrl);
        if (proxyResponse.status === 200) {
          const parsed = typeof proxyResponse.data === 'string'
            ? JSON.parse(proxyResponse.data)
            : proxyResponse.data;

          const extractedUrls = await extractUrlsFromJson(parsed.urls || parsed);
          extractedUrls.forEach(url => allUrls.add(url));

          for (const url of extractedUrls) {
            await supabase.from('found_urls').upsert({
              audit_id: audit.id,
              url: url,
              source: 'json_list'
            }, { onConflict: 'audit_id,url' });
          }
        }
      } catch (err) {
        console.error('Error fetching URLs:', err);
      }

      setProgress('Загрузка и анализ sitemap...');
      setProgressPercent(10);

      const sitemapUrl = `${siteUrl}/sitemap.xml`;
      try {
        const parser = new DOMParser();
        const proxyResponse = await fetchViaProxy(sitemapUrl);
        const sitemapXml = typeof proxyResponse.data === 'string'
          ? proxyResponse.data
          : String(proxyResponse.data);
        const xmlDoc = parser.parseFromString(sitemapXml, 'text/xml');

        const sitemapIndexUrls = xmlDoc.querySelectorAll('sitemapindex > sitemap > loc');

        if (sitemapIndexUrls.length > 0) {
          setProgress(`Обнаружен sitemap index с ${sitemapIndexUrls.length} файлами...`);
          await processSitemapIndex(sitemapUrl, audit.id);
        } else {
          await processSingleSitemap(sitemapUrl, audit.id);
        }

        const { data: sitemapData } = await supabase
          .from('sitemap_urls')
          .select('url')
          .eq('audit_id', audit.id);

        if (sitemapData) {
          setProgress(`Добавлено ${sitemapData.length} URL из sitemap`);
          sitemapData.forEach(item => allUrls.add(item.url));
          for (const item of sitemapData) {
            await supabase.from('found_urls').upsert({
              audit_id: audit.id,
              url: item.url,
              source: 'sitemap'
            }, { onConflict: 'audit_id,url' });
          }
        }
      } catch (err) {
        console.error('Error analyzing sitemap:', err);
      }

      const urlsArray = Array.from(allUrls);
      const totalUrls = urlsArray.length;

      await supabase
        .from('audits')
        .update({
          total_found_urls: totalUrls,
          total_urls: Math.min(totalUrls, 100)
        })
        .eq('id', audit.id);

      setProgress(`Начало сканирования ${totalUrls} URL по 100 за раз...`);
      setProgressPercent(20);

      const BATCH_SIZE = 100;
      const totalBatches = Math.ceil(totalUrls / BATCH_SIZE);

      for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
        const start = batchNum * BATCH_SIZE;
        const end = Math.min(start + BATCH_SIZE, totalUrls);
        const batchUrls = urlsArray.slice(start, end);

        const percent = 20 + Math.floor((batchNum / totalBatches) * 70);
        setProgressPercent(percent);
        setProgress(`Сканирование пакета ${batchNum + 1}/${totalBatches} (${batchUrls.length} URL)`);

        await processUrlBatch(batchUrls, batchNum + 1, totalBatches, audit.id);

        await supabase
          .from('audits')
          .update({ urls_checked: end })
          .eq('id', audit.id);
      }

      await supabase
        .from('audits')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          urls_checked: totalUrls
        })
        .eq('id', audit.id);

      setProgress('Аудит завершен!');
      setProgressPercent(100);
      setTimeout(() => {
        window.location.href = `/audit/${audit.id}`;
      }, 1000);

    } catch (err) {
      console.error('Audit error:', err);
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
      setProgress('');
      setProgressPercent(0);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-100 mb-6">Новый SEO аудит</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              URL сайта
            </label>
            <input
              type="text"
              value={siteUrl}
              onChange={(e) => setSiteUrl(e.target.value)}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-100"
              placeholder="https://example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Ссылка на файл URLs (JSON)
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={urlsJsonUrl}
                onChange={(e) => setUrlsJsonUrl(e.target.value)}
                className="flex-1 px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-100"
                placeholder="https://atlantpro24.ru/urls.json"
              />
              <button
                onClick={fetchUrlsJson}
                disabled={loading}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Загрузить</span>
              </button>
            </div>
            {totalUrls > 0 && (
              <div className="mt-2 text-sm text-green-400">
                Обнаружено {totalUrls.toLocaleString('ru-RU')} URL (все будут обработаны по 100 за раз)
              </div>
            )}
          </div>


          {error && (
            <div className="flex items-center space-x-2 p-4 bg-red-900/50 border border-red-600 rounded-lg text-red-200">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {progress && (
            <div className="space-y-2">
              <div className="p-4 bg-blue-900/50 border border-blue-600 rounded-lg text-blue-200">
                {progress}
              </div>
              {progressPercent > 0 && (
                <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300 ease-out relative overflow-hidden"
                    style={{ width: `${progressPercent}%` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            onClick={startAudit}
            disabled={loading}
            className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors font-medium shadow-lg"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Выполняется аудит...</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                <span>Начать аудит</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
