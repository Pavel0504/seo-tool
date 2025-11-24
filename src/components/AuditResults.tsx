import { useState, useEffect } from 'react';
import { AlertCircle, ChevronDown, Copy, Download, Check, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { supabase, UrlCheck, SeoIssue } from '../lib/supabase';

interface AuditResultsProps {
  auditId: string;
}

export default function AuditResults({ auditId }: AuditResultsProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'issues'>('overview');
  const [urlChecks, setUrlChecks] = useState<UrlCheck[]>([]);
  const [seoIssues, setSeoIssues] = useState<SeoIssue[]>([]);
  const [sitemapUrls, setSitemapUrls] = useState<any[]>([]);
  const [newUrls, setNewUrls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedUrl, setExpandedUrl] = useState<string | null>(null);
  const [expandedIssue, setExpandedIssue] = useState<string | null>(null);
  const [urlPage, setUrlPage] = useState(0);
  const [sitemapPage, setSitemapPage] = useState(0);
  const [issuesPage, setIssuesPage] = useState(0);
  const [issueFilter, setIssueFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');
  const ITEMS_PER_PAGE = 100;

  useEffect(() => {
    loadAuditData();
  }, [auditId]);

  async function loadAuditData() {
    try {
      const [urlsRes, issuesRes, sitemapRes, foundUrlsRes] = await Promise.all([
        supabase
          .from('url_checks')
          .select('*')
          .eq('audit_id', auditId)
          .order('checked_at', { ascending: false }),
        supabase
          .from('seo_issues')
          .select('*')
          .eq('audit_id', auditId)
          .order('created_at', { ascending: false }),
        supabase
          .from('sitemap_urls')
          .select('*')
          .eq('audit_id', auditId)
          .order('discovered_at', { ascending: false }),
        supabase
          .from('found_urls')
          .select('*')
          .eq('audit_id', auditId)
          .eq('is_new', true)
      ]);

      if (urlsRes.error) throw urlsRes.error;

      setUrlChecks(urlsRes.data || []);
      setSeoIssues(issuesRes.data || []);
      setSitemapUrls(sitemapRes.data || []);
      setNewUrls(foundUrlsRes.data || []);
    } catch (error) {
      console.error('Error loading audit data:', error);
    } finally {
      setLoading(false);
    }
  }

  function getStatusColor(status: number) {
    if (status >= 200 && status < 300) return 'text-green-400';
    if (status >= 300 && status < 400) return 'text-yellow-400';
    if (status >= 400 && status < 500) return 'text-orange-400';
    if (status >= 500) return 'text-red-400';
    return 'text-gray-400';
  }

  function getStatusBgColor(status: number) {
    if (status >= 200 && status < 300) return 'bg-green-900/30 border-green-700';
    if (status >= 300 && status < 400) return 'bg-yellow-900/30 border-yellow-700';
    if (status >= 400 && status < 500) return 'bg-orange-900/30 border-orange-700';
    if (status >= 500) return 'bg-red-900/30 border-red-700';
    return 'bg-gray-900/30 border-gray-700';
  }

  const issuesBySeverity = {
    critical: seoIssues.filter(i => i.severity === 'critical').length,
    high: seoIssues.filter(i => i.severity === 'high').length,
    medium: seoIssues.filter(i => i.severity === 'medium').length,
    low: seoIssues.filter(i => i.severity === 'low').length
  };
  const totalIssues = issuesBySeverity.critical + issuesBySeverity.high + issuesBySeverity.medium + issuesBySeverity.low;
  const successCount = urlChecks.filter(u => u.http_status >= 200 && u.http_status < 300).length;

  const urlsToDisplay = urlChecks.slice(urlPage * ITEMS_PER_PAGE, (urlPage + 1) * ITEMS_PER_PAGE);
  const sitemapToDisplay = sitemapUrls.slice(sitemapPage * ITEMS_PER_PAGE, (sitemapPage + 1) * ITEMS_PER_PAGE);
  const totalUrlPages = Math.ceil(urlChecks.length / ITEMS_PER_PAGE);
  const totalSitemapPages = Math.ceil(sitemapUrls.length / ITEMS_PER_PAGE);

  const filteredIssues = issueFilter === 'all'
    ? seoIssues.filter(i => i.severity !== 'success')
    : seoIssues.filter(i => i.severity === issueFilter);
  const issuesToDisplay = filteredIssues.slice(issuesPage * ITEMS_PER_PAGE, (issuesPage + 1) * ITEMS_PER_PAGE);
  const totalIssuesPages = Math.ceil(filteredIssues.length / ITEMS_PER_PAGE);

  function getUrlForIssue(urlCheckId: string): string | undefined {
    return urlChecks.find(u => u.id === urlCheckId)?.url;
  }

  function getSeverityColor(severity: string) {
    switch (severity) {
      case 'critical': return 'text-red-400';
      case 'high': return 'text-orange-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  }

  function getSeverityBgColor(severity: string) {
    switch (severity) {
      case 'critical': return 'bg-red-900/30 border-red-700';
      case 'high': return 'bg-orange-900/30 border-orange-700';
      case 'medium': return 'bg-yellow-900/30 border-yellow-700';
      case 'low': return 'bg-blue-900/30 border-blue-700';
      default: return 'bg-gray-900/30 border-gray-700';
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-100">Результаты аудита</h1>
        <button
          onClick={() => {
            const errors = seoIssues.filter(i => i.severity !== 'success');
            const csv = [
              ['URL', 'Критичность', 'Тип', 'Код', 'Описание', 'Рекомендация', 'HTTP Статус', 'В Sitemap', 'Robots Разрешено', 'Проблемы Sitemap/Robots'].join(','),
              ...errors.map(issue => {
                const urlCheck = urlChecks.find(u => u.id === issue.url_check_id);
                return [
                  `"${(urlCheck?.url || '').replace(/"/g, '""')}"`,
                  issue.severity,
                  issue.issue_type,
                  issue.issue_code,
                  `"${issue.description.replace(/"/g, '""')}"`,
                  `"${(issue.recommendation || '').replace(/"/g, '""')}"`,
                  urlCheck?.http_status || '',
                  urlCheck?.in_sitemap ? 'Да' : 'Нет',
                  urlCheck?.robots_allowed ? 'Да' : 'Нет',
                  `"${(urlCheck?.sitemap_robots_issues || '').replace(/"/g, '""')}"`
                ].join(',');
              })
            ].join('\\n');

            const blob = new Blob(['\\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `seo-errors-${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>Экспорт ошибок CSV</span>
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <div className="text-3xl font-bold text-gray-100">{urlChecks.length}</div>
          <div className="text-sm text-gray-400 mt-1">Всего URL</div>
        </div>
        <div className="bg-gray-800 rounded-lg border border-green-700 p-6">
          <div className="text-3xl font-bold text-green-400">{successCount}</div>
          <div className="text-sm text-gray-400 mt-1">Успешных</div>
        </div>
        <div className="bg-gray-800 rounded-lg border border-red-700 p-6">
          <div className="text-3xl font-bold text-red-400">{issuesBySeverity.critical}</div>
          <div className="text-sm text-gray-400 mt-1">Критичных</div>
        </div>
        <div className="bg-gray-800 rounded-lg border border-orange-700 p-6">
          <div className="text-3xl font-bold text-orange-400">{issuesBySeverity.high}</div>
          <div className="text-sm text-gray-400 mt-1">Высоких</div>
        </div>
        <div className="bg-gray-800 rounded-lg border border-yellow-700 p-6">
          <div className="text-3xl font-bold text-yellow-400">{issuesBySeverity.medium}</div>
          <div className="text-sm text-gray-400 mt-1">Средних</div>
        </div>
        <div className="bg-gray-800 rounded-lg border border-blue-700 p-6">
          <div className="text-3xl font-bold text-blue-400">{issuesBySeverity.low}</div>
          <div className="text-sm text-gray-400 mt-1">Низких</div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg border border-gray-700">
        <div className="border-b border-gray-700">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {[
              { id: 'overview', label: 'Обзор' },
              { id: 'issues', label: 'Проблемы', count: totalIssues }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setUrlPage(0);
                  setSitemapPage(0);
                  setIssuesPage(0);
                }}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
                }`}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span className="ml-2 px-2 py-0.5 rounded-full bg-gray-700 text-gray-300 text-xs">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {newUrls.length > 0 && (
                <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-blue-200 mb-4">Новые URL</h3>
                  <p className="text-blue-300 mb-4">Обнаружено {newUrls.length} новых URL, которые не были в предыдущем аудите</p>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {newUrls.slice(0, 20).map((url) => (
                      <a
                        key={url.id}
                        href={url.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-blue-400 hover:text-blue-300 truncate"
                      >
                        {url.url}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-lg font-semibold text-gray-100 mb-4">Распределение по HTTP статусам</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { range: '2xx', label: 'Успешные', color: 'bg-green-900/30 border-green-700', count: successCount },
                    { range: '3xx', label: 'Редиректы', color: 'bg-yellow-900/30 border-yellow-700', count: urlChecks.filter(u => u.http_status >= 300 && u.http_status < 400).length },
                    { range: '4xx', label: 'Ошибки клиента', color: 'bg-orange-900/30 border-orange-700', count: urlChecks.filter(u => u.http_status >= 400 && u.http_status < 500).length },
                    { range: '5xx', label: 'Ошибки сервера', color: 'bg-red-900/30 border-red-700', count: urlChecks.filter(u => u.http_status >= 500).length }
                  ].map((item) => (
                    <div key={item.range} className={`border rounded-lg p-4 ${item.color}`}>
                      <div className="text-2xl font-bold text-gray-100">{item.count}</div>
                      <div className="text-sm text-gray-400 mt-1">{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-100 mb-4">Все просканированные URL</h3>
                <div className="space-y-2">
                  {urlsToDisplay.map((url) => (
                    <div
                      key={url.id}
                      className={`border rounded-lg ${getStatusBgColor(url.http_status)} transition-all`}
                    >
                      <button
                        onClick={() => setExpandedUrl(expandedUrl === url.id ? null : url.id)}
                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-800/50 transition-colors"
                      >
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <ChevronDown
                            className={`w-5 h-5 flex-shrink-0 transition-transform ${
                              expandedUrl === url.id ? 'transform rotate-180' : ''
                            }`}
                          />
                          <span className={`font-mono text-sm font-semibold flex-shrink-0 ${getStatusColor(url.http_status)}`}>
                            {url.http_status}
                          </span>
                          <a
                            href={url.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 truncate flex-1 text-left"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {url.url}
                          </a>
                        </div>
                      </button>

                      {expandedUrl === url.id && (
                        <div className="border-t border-gray-700 px-4 py-3 bg-gray-900/50 space-y-3">
                          {url.title && (
                            <div>
                              <div className="text-xs font-semibold text-gray-400 mb-1">Meta Title</div>
                              <div className="text-sm text-gray-300 bg-gray-800 rounded px-3 py-2">
                                {url.title}
                                {url.title_length && (
                                  <span className="text-gray-500 ml-2">({url.title_length} символов)</span>
                                )}
                              </div>
                            </div>
                          )}

                          {url.meta_description && (
                            <div>
                              <div className="text-xs font-semibold text-gray-400 mb-1">Meta Description</div>
                              <div className="text-sm text-gray-300 bg-gray-800 rounded px-3 py-2">
                                {url.meta_description}
                                {url.meta_description_length && (
                                  <span className="text-gray-500 ml-2">({url.meta_description_length} символов)</span>
                                )}
                              </div>
                            </div>
                          )}

                          {!url.meta_description && (
                            <div className="bg-red-900/30 border border-red-700 rounded px-3 py-2">
                              <div className="text-xs font-semibold text-red-400 mb-1">Meta Description отсутствует</div>
                              <div className="text-xs text-red-300">Добавьте мета-описание для улучшения SEO</div>
                            </div>
                          )}

                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                            <div className="bg-gray-800 rounded px-2 py-1">
                              <span className="text-gray-400">H1 тагов:</span>
                              <span className={`ml-2 font-semibold ${url.h1_count === 0 ? 'text-red-400' : url.h1_count === 1 ? 'text-green-400' : 'text-orange-400'}`}>
                                {url.h1_count}
                              </span>
                            </div>
                            <div className="bg-gray-800 rounded px-2 py-1">
                              <span className="text-gray-400">Время ответа:</span>
                              <span className="ml-2 font-semibold text-gray-300">{url.response_time}ms</span>
                            </div>
                            <div className="bg-gray-800 rounded px-2 py-1">
                              <span className="text-gray-400">Размер:</span>
                              <span className="ml-2 font-semibold text-gray-300">{(url.content_length / 1024).toFixed(1)}KB</span>
                            </div>
                            <div className="bg-gray-800 rounded px-2 py-1">
                              <span className="text-gray-400">Ссылок:</span>
                              <span className="ml-2 font-semibold text-gray-300">{url.internal_links}/{url.external_links}</span>
                            </div>
                            <div className="bg-gray-800 rounded px-2 py-1">
                              <span className="text-gray-400">Noindex:</span>
                              <span className={`ml-2 font-semibold ${url.has_noindex ? 'text-orange-400' : 'text-green-400'}`}>
                                {url.has_noindex ? 'Да' : 'Нет'}
                              </span>
                            </div>
                            <div className="bg-gray-800 rounded px-2 py-1">
                              <span className="text-gray-400">HTTPS:</span>
                              <span className={`ml-2 font-semibold ${url.has_https ? 'text-green-400' : 'text-red-400'}`}>
                                {url.has_https ? 'Да' : 'Нет'}
                              </span>
                            </div>
                            <div className="bg-gray-800 rounded px-2 py-1">
                              <span className="text-gray-400">Canonical:</span>
                              <span className={`ml-2 font-semibold ${url.canonical_url ? 'text-green-400' : 'text-red-400'}`}>
                                {url.canonical_url ? 'Да' : 'Нет'}
                              </span>
                            </div>
                            <div className="bg-gray-800 rounded px-2 py-1">
                              <span className="text-gray-400">Изображений без alt:</span>
                              <span className={`ml-2 font-semibold ${url.images_without_alt === 0 ? 'text-green-400' : 'text-orange-400'}`}>
                                {url.images_without_alt}
                              </span>
                            </div>
                            <div className="bg-gray-800 rounded px-2 py-1">
                              <span className="text-gray-400">Контент (слов):</span>
                              <span className={`ml-2 font-semibold ${url.content_length >= 300 ? 'text-green-400' : url.content_length >= 200 ? 'text-yellow-400' : 'text-red-400'}`}>
                                {url.content_length}
                              </span>
                            </div>
                            <div className="bg-gray-800 rounded px-2 py-1">
                              <span className="text-gray-400">В Sitemap:</span>
                              <span className={`ml-2 font-semibold ${url.in_sitemap ? 'text-green-400' : 'text-orange-400'}`}>
                                {url.in_sitemap ? 'Да' : 'Нет'}
                              </span>
                            </div>
                            <div className="bg-gray-800 rounded px-2 py-1">
                              <span className="text-gray-400">Robots разрешено:</span>
                              <span className={`ml-2 font-semibold ${url.robots_allowed ? 'text-green-400' : 'text-orange-400'}`}>
                                {url.robots_allowed ? 'Да' : 'Нет'}
                              </span>
                            </div>
                          </div>
                          {url.sitemap_robots_issues && (
                            <div className="bg-orange-900/30 border border-orange-700 rounded px-3 py-2 mt-2">
                              <div className="text-xs font-semibold text-orange-400 mb-1">Проблемы Sitemap/Robots</div>
                              <div className="text-xs text-orange-300">{url.sitemap_robots_issues}</div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {totalUrlPages > 1 && (
                  <div className="flex items-center justify-center space-x-2 mt-6">
                    <button
                      onClick={() => setUrlPage(Math.max(0, urlPage - 1))}
                      disabled={urlPage === 0}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:opacity-50 text-gray-200 rounded-lg transition-colors"
                    >
                      Назад
                    </button>
                    <div className="text-gray-400">
                      Страница {urlPage + 1} из {totalUrlPages}
                    </div>
                    <button
                      onClick={() => setUrlPage(Math.min(totalUrlPages - 1, urlPage + 1))}
                      disabled={urlPage === totalUrlPages - 1}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:opacity-50 text-gray-200 rounded-lg transition-colors"
                    >
                      Далее
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'issues' && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 border-b border-gray-700 pb-4">
                <span className="text-sm text-gray-400">Фильтр:</span>
                {[
                  { value: 'all', label: 'Все проблемы', count: totalIssues },
                  { value: 'critical', label: 'Критичные', count: issuesBySeverity.critical },
                  { value: 'high', label: 'Высокие', count: issuesBySeverity.high },
                  { value: 'medium', label: 'Средние', count: issuesBySeverity.medium },
                  { value: 'low', label: 'Низкие', count: issuesBySeverity.low }
                ].map((filter) => (
                  <button
                    key={filter.value}
                    onClick={() => {
                      setIssueFilter(filter.value as any);
                      setIssuesPage(0);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                      issueFilter === filter.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {filter.label} ({filter.count})
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                {issuesToDisplay.map((issue) => (
                  <div
                    key={issue.id}
                    className={`border rounded-lg ${getSeverityBgColor(issue.severity)} transition-all`}
                  >
                    <button
                      onClick={() => setExpandedIssue(expandedIssue === issue.id ? null : issue.id)}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-800/50 transition-colors"
                    >
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <ChevronDown
                          className={`w-5 h-5 flex-shrink-0 transition-transform ${
                            expandedIssue === issue.id ? 'transform rotate-180' : ''
                          }`}
                        />
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase flex-shrink-0 ${getSeverityColor(issue.severity)}`}>
                          {issue.severity}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-100 truncate">{issue.description}</div>
                          <div className="text-xs text-gray-400 truncate mt-1">
                            {getUrlForIssue(issue.url_check_id) || 'URL не найден'}
                          </div>
                        </div>
                      </div>
                    </button>

                    {expandedIssue === issue.id && (
                      <div className="border-t border-gray-700 px-4 py-3 bg-gray-900/50 space-y-3">
                        <div>
                          <div className="text-xs font-semibold text-gray-400 mb-1">URL</div>
                          <a
                            href={getUrlForIssue(issue.url_check_id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-400 hover:text-blue-300 break-all"
                          >
                            {getUrlForIssue(issue.url_check_id)}
                          </a>
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-gray-400 mb-1">Проблема</div>
                          <div className="text-sm text-gray-300 bg-gray-800 rounded px-3 py-2">{issue.description}</div>
                        </div>
                        {issue.recommendation && (
                          <div>
                            <div className="text-xs font-semibold text-gray-400 mb-1">Рекомендация</div>
                            <div className="text-sm text-gray-300 bg-gray-800 rounded px-3 py-2">{issue.recommendation}</div>
                          </div>
                        )}
                        <div className="flex items-center space-x-2 text-xs">
                          <span className="text-gray-400">Тип:</span>
                          <span className="text-gray-300">{issue.issue_type}</span>
                          <span className="text-gray-500">|</span>
                          <span className="text-gray-400">Код:</span>
                          <span className="font-mono text-gray-300">{issue.issue_code}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {filteredIssues.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  Нет ошибок - отлично!
                </div>
              )}

              {totalIssuesPages > 1 && (
                <div className="flex items-center justify-center space-x-2 mt-6">
                  <button
                    onClick={() => setIssuesPage(Math.max(0, issuesPage - 1))}
                    disabled={issuesPage === 0}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:opacity-50 text-gray-200 rounded-lg transition-colors"
                  >
                    Назад
                  </button>
                  <div className="text-gray-400">
                    Страница {issuesPage + 1} из {totalIssuesPages}
                  </div>
                  <button
                    onClick={() => setIssuesPage(Math.min(totalIssuesPages - 1, issuesPage + 1))}
                    disabled={issuesPage === totalIssuesPages - 1}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:opacity-50 text-gray-200 rounded-lg transition-colors"
                  >
                    Далее
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
