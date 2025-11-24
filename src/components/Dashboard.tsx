import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Clock, RefreshCw, TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react';
import { supabase, Audit } from '../lib/supabase';

const statusLabels = {
  pending: 'Ожидание',
  running: 'Выполняется',
  completed: 'Завершен',
  failed: 'Ошибка'
};

interface DashboardProps {
  onSelectAudit: (auditId: string) => void;
}

interface AuditStats {
  totalUrls: number;
  successUrls: number;
  criticalIssues: number;
  highIssues: number;
  mediumIssues: number;
  lowIssues: number;
  noMetaDesc: number;
  noH1: number;
  missingCanonical: number;
  imagesWithoutAlt: number;
  thinContent: number;
  noSchema: number;
}

export default function Dashboard({ onSelectAudit }: DashboardProps) {
  const [audits, setAudits] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(true);
  const [latestStats, setLatestStats] = useState<AuditStats | null>(null);
  const [previousStats, setPreviousStats] = useState<AuditStats | null>(null);

  useEffect(() => {
    loadAudits();
    loadStats();
  }, []);

  async function loadAudits() {
    try {
      const { data, error } = await supabase
        .from('audits')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setAudits(data || []);
    } catch (error) {
      console.error('Error loading audits:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    try {
      const { data: completedAudits } = await supabase
        .from('audits')
        .select('id')
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(2);

      if (!completedAudits || completedAudits.length === 0) return;

      const latestAuditId = completedAudits[0].id;
      const previousAuditId = completedAudits.length > 1 ? completedAudits[1].id : null;

      const latest = await getAuditStats(latestAuditId);
      setLatestStats(latest);

      if (previousAuditId) {
        const previous = await getAuditStats(previousAuditId);
        setPreviousStats(previous);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  async function getAuditStats(auditId: string): Promise<AuditStats> {
    const [urlsRes, issuesRes] = await Promise.all([
      supabase.from('url_checks').select('*').eq('audit_id', auditId),
      supabase.from('seo_issues').select('*').eq('audit_id', auditId)
    ]);

    const urls = urlsRes.data || [];
    const issues = issuesRes.data || [];

    return {
      totalUrls: urls.length,
      successUrls: urls.filter(u => u.http_status >= 200 && u.http_status < 300).length,
      criticalIssues: issues.filter(i => i.severity === 'critical').length,
      highIssues: issues.filter(i => i.severity === 'high').length,
      mediumIssues: issues.filter(i => i.severity === 'medium').length,
      lowIssues: issues.filter(i => i.severity === 'low').length,
      noMetaDesc: issues.filter(i => i.issue_code === 'missing_meta_description').length,
      noH1: issues.filter(i => i.issue_code === 'missing_h1').length,
      missingCanonical: issues.filter(i => i.issue_code === 'missing_canonical').length,
      imagesWithoutAlt: issues.filter(i => i.issue_code === 'images_without_alt').length,
      thinContent: issues.filter(i => i.issue_code === 'thin_content').length,
      noSchema: issues.filter(i => i.issue_code === 'no_schema_markup').length
    };
  }

  function getTrend(current: number, previous: number | undefined) {
    if (previous === undefined) return { icon: Minus, color: 'text-gray-400', text: '' };
    if (current < previous) return { icon: TrendingDown, color: 'text-green-400', text: `-${previous - current}` };
    if (current > previous) return { icon: TrendingUp, color: 'text-red-400', text: `+${current - previous}` };
    return { icon: Minus, color: 'text-gray-400', text: '=' };
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'running':
        return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'completed':
        return 'bg-green-900/50 text-green-300 border border-green-600';
      case 'running':
        return 'bg-blue-900/50 text-blue-300 border border-blue-600';
      case 'failed':
        return 'bg-red-900/50 text-red-300 border border-red-600';
      default:
        return 'bg-gray-700 text-gray-300 border border-gray-600';
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center space-y-4">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
          <div className="text-gray-400">Загрузка...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {latestStats && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-blue-900/30 to-gray-800 rounded-lg shadow-lg border border-blue-700 p-6">
            <div className="flex items-center space-x-3 mb-6">
              <BarChart3 className="w-6 h-6 text-blue-400" />
              <h2 className="text-xl font-semibold text-gray-100">Общая аналитика</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Критические</span>
                  {previousStats && (
                    <div className="flex items-center space-x-1 text-xs">
                      {(() => {
                        const trend = getTrend(latestStats.criticalIssues, previousStats.criticalIssues);
                        return <><trend.icon className={`w-3 h-3 ${trend.color}`} /><span className={trend.color}>{trend.text}</span></>;
                      })()}
                    </div>
                  )}
                </div>
                <div className="text-2xl font-bold text-red-400">{latestStats.criticalIssues}</div>
              </div>
              <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Высокие</span>
                  {previousStats && (
                    <div className="flex items-center space-x-1 text-xs">
                      {(() => {
                        const trend = getTrend(latestStats.highIssues, previousStats.highIssues);
                        return <><trend.icon className={`w-3 h-3 ${trend.color}`} /><span className={trend.color}>{trend.text}</span></>;
                      })()}
                    </div>
                  )}
                </div>
                <div className="text-2xl font-bold text-orange-400">{latestStats.highIssues}</div>
              </div>
              <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Средние</span>
                  {previousStats && (
                    <div className="flex items-center space-x-1 text-xs">
                      {(() => {
                        const trend = getTrend(latestStats.mediumIssues, previousStats.mediumIssues);
                        return <><trend.icon className={`w-3 h-3 ${trend.color}`} /><span className={trend.color}>{trend.text}</span></>;
                      })()}
                    </div>
                  )}
                </div>
                <div className="text-2xl font-bold text-yellow-400">{latestStats.mediumIssues}</div>
              </div>
              <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Низкие</span>
                  {previousStats && (
                    <div className="flex items-center space-x-1 text-xs">
                      {(() => {
                        const trend = getTrend(latestStats.lowIssues, previousStats.lowIssues);
                        return <><trend.icon className={`w-3 h-3 ${trend.color}`} /><span className={trend.color}>{trend.text}</span></>;
                      })()}
                    </div>
                  )}
                </div>
                <div className="text-2xl font-bold text-blue-400">{latestStats.lowIssues}</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Без meta description</span>
                {previousStats && (
                  <div className="flex items-center space-x-1 text-xs">
                    {(() => {
                      const trend = getTrend(latestStats.noMetaDesc, previousStats.noMetaDesc);
                      return <><trend.icon className={`w-3 h-3 ${trend.color}`} /><span className={trend.color}>{trend.text}</span></>;
                    })()}
                  </div>
                )}
              </div>
              <div className="text-xl font-bold text-orange-400">{latestStats.noMetaDesc}</div>
            </div>
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Без H1</span>
                {previousStats && (
                  <div className="flex items-center space-x-1 text-xs">
                    {(() => {
                      const trend = getTrend(latestStats.noH1, previousStats.noH1);
                      return <><trend.icon className={`w-3 h-3 ${trend.color}`} /><span className={trend.color}>{trend.text}</span></>;
                    })()}
                  </div>
                )}
              </div>
              <div className="text-xl font-bold text-orange-400">{latestStats.noH1}</div>
            </div>
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Без canonical</span>
                {previousStats && (
                  <div className="flex items-center space-x-1 text-xs">
                    {(() => {
                      const trend = getTrend(latestStats.missingCanonical, previousStats.missingCanonical);
                      return <><trend.icon className={`w-3 h-3 ${trend.color}`} /><span className={trend.color}>{trend.text}</span></>;
                    })()}
                  </div>
                )}
              </div>
              <div className="text-xl font-bold text-yellow-400">{latestStats.missingCanonical}</div>
            </div>
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Изображения без alt</span>
                {previousStats && (
                  <div className="flex items-center space-x-1 text-xs">
                    {(() => {
                      const trend = getTrend(latestStats.imagesWithoutAlt, previousStats.imagesWithoutAlt);
                      return <><trend.icon className={`w-3 h-3 ${trend.color}`} /><span className={trend.color}>{trend.text}</span></>;
                    })()}
                  </div>
                )}
              </div>
              <div className="text-xl font-bold text-yellow-400">{latestStats.imagesWithoutAlt}</div>
            </div>
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Тонкий контент</span>
                {previousStats && (
                  <div className="flex items-center space-x-1 text-xs">
                    {(() => {
                      const trend = getTrend(latestStats.thinContent, previousStats.thinContent);
                      return <><trend.icon className={`w-3 h-3 ${trend.color}`} /><span className={trend.color}>{trend.text}</span></>;
                    })()}
                  </div>
                )}
              </div>
              <div className="text-xl font-bold text-yellow-400">{latestStats.thinContent}</div>
            </div>
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Без schema.org</span>
                {previousStats && (
                  <div className="flex items-center space-x-1 text-xs">
                    {(() => {
                      const trend = getTrend(latestStats.noSchema, previousStats.noSchema);
                      return <><trend.icon className={`w-3 h-3 ${trend.color}`} /><span className={trend.color}>{trend.text}</span></>;
                    })()}
                  </div>
                )}
              </div>
              <div className="text-xl font-bold text-yellow-400">{latestStats.noSchema}</div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-700 bg-gray-800/50">
          <h2 className="text-lg font-semibold text-gray-100">История аудитов</h2>
        </div>
        <div className="divide-y divide-gray-700">
          {audits.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-400">
              Нет аудитов. Создайте первый аудит для начала работы.
            </div>
          ) : (
            audits.map((audit) => (
              <div
                key={audit.id}
                className="px-6 py-4 hover:bg-gray-700/50 transition-colors cursor-pointer"
                onClick={() => onSelectAudit(audit.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {getStatusIcon(audit.status)}
                    <div>
                      <div className="font-medium text-gray-100">{audit.site_url}</div>
                      <div className="text-sm text-gray-400">
                        {new Date(audit.started_at).toLocaleString('ru-RU', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-sm text-gray-300">
                      {audit.urls_checked} / {audit.total_urls} URL проверено
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(audit.status)}`}>
                      {statusLabels[audit.status as keyof typeof statusLabels] || audit.status}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
