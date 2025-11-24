import { useState, useEffect } from 'react';
import { Plus, Trash2, AlertCircle, Download } from 'lucide-react';
import { supabase, ExclusionRule } from '../lib/supabase';

interface ExclusionManagerProps {
  auditId?: string;
  onExclusionsUpdated?: () => void;
}

export default function ExclusionManager({ auditId, onExclusionsUpdated }: ExclusionManagerProps) {
  const [exclusions, setExclusions] = useState<ExclusionRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPattern, setNewPattern] = useState('');
  const [newReason, setNewReason] = useState('');
  const [siteUrl, setSiteUrl] = useState('https://atlantpro24.ru');

  useEffect(() => {
    loadExclusions();
  }, [auditId]);

  async function loadExclusions() {
    try {
      const { data, error } = await supabase
        .from('exclusion_rules')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setExclusions(data || []);
    } catch (error) {
      console.error('Error loading exclusions:', error);
    } finally {
      setLoading(false);
    }
  }

  async function addExclusion() {
    if (!newPattern.trim()) return;

    try {
      const { data, error } = await supabase
        .from('exclusion_rules')
        .insert({
          site_url: siteUrl,
          url_pattern: newPattern,
          reason: newReason,
          exclude_from_sitemap: true
        })
        .select()
        .single();

      if (error) throw error;

      setExclusions([data, ...exclusions]);
      setNewPattern('');
      setNewReason('');

      if (onExclusionsUpdated) {
        onExclusionsUpdated();
      }
    } catch (error) {
      console.error('Error adding exclusion:', error);
    }
  }

  async function removeExclusion(id: string) {
    try {
      const { error } = await supabase
        .from('exclusion_rules')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setExclusions(exclusions.filter(e => e.id !== id));

      if (onExclusionsUpdated) {
        onExclusionsUpdated();
      }
    } catch (error) {
      console.error('Error removing exclusion:', error);
    }
  }

  async function exportExclusionsJSON() {
    const exportData = exclusions.map(e => ({
      url_pattern: e.url_pattern,
      reason: e.reason,
      added_at: e.created_at,
      exclude_from_sitemap: e.exclude_from_sitemap
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sitemap-exclusions.json';
    a.click();
  }

  async function exportExclusionsCSV() {
    const csv = [
      ['URL Pattern', 'Reason', 'Added At', 'Exclude From Sitemap'].join(','),
      ...exclusions.map(e => [
        `"${e.url_pattern.replace(/"/g, '""')}"`,
        `"${(e.reason || '').replace(/"/g, '""')}"`,
        new Date(e.created_at).toLocaleString('ru-RU'),
        e.exclude_from_sitemap ? 'Да' : 'Нет'
      ].join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `exclusions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-900/50 border border-blue-600 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-200">
            <p className="font-medium mb-1">Об исключениях</p>
            <p>URL, соответствующие этим шаблонам, будут исключены из генерации sitemap. Используйте это для удаления страниц с ошибками 404, директивами noindex или временного контента.</p>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-100 mb-4">Добавить новое исключение</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              URL шаблон
            </label>
            <input
              type="text"
              value={newPattern}
              onChange={(e) => setNewPattern(e.target.value)}
              placeholder="/admin/ или https://example.com/test/"
              className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Причина (необязательно)
            </label>
            <input
              type="text"
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
              placeholder="Ошибка 404, директива noindex, и т.д."
              className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-100"
            />
          </div>
          <button
            onClick={addExclusion}
            disabled={!newPattern.trim()}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Добавить исключение</span>
          </button>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700">
        <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-100">
            Текущие исключения ({exclusions.length})
          </h3>
          {exclusions.length > 0 && (
            <div className="flex items-center space-x-2">
              <button
                onClick={exportExclusionsCSV}
                className="flex items-center space-x-1 px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors"
              >
                <Download className="w-3 h-3" />
                <span>CSV</span>
              </button>
              <button
                onClick={exportExclusionsJSON}
                className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors"
              >
                JSON
              </button>
            </div>
          )}
        </div>
        <div className="divide-y divide-gray-700">
          {exclusions.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-400">
              Исключения не определены. Добавьте шаблоны для исключения из генерации sitemap.
            </div>
          ) : (
            exclusions.map((exclusion) => (
              <div
                key={exclusion.id}
                className="px-6 py-4 hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-mono text-sm font-medium text-gray-100">
                      {exclusion.url_pattern}
                    </div>
                    {exclusion.reason && (
                      <div className="text-sm text-gray-400 mt-1">
                        {exclusion.reason}
                      </div>
                    )}
                    <div className="text-xs text-gray-500 mt-1">
                      Добавлено {new Date(exclusion.created_at).toLocaleString('ru-RU', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                  <button
                    onClick={() => removeExclusion(exclusion.id)}
                    className="ml-4 p-2 text-red-400 hover:bg-red-900/50 rounded-lg transition-colors"
                    title="Удалить исключение"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {exclusions.length > 0 && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-100 mb-2">Инструкция по использованию</h4>
          <ol className="text-sm text-gray-300 space-y-1 list-decimal list-inside">
            <li>Экспортируйте файл JSON с исключениями, используя кнопку выше</li>
            <li>Загрузите его на сервер по пути <code className="bg-gray-900 px-1 py-0.5 rounded text-blue-400">/var/www/.../sitemap-exclusions.json</code></li>
            <li>Запустите генератор sitemap: <code className="bg-gray-900 px-1 py-0.5 rounded text-blue-400">php sitemap-generator-improved.php --full</code></li>
            <li>Генератор автоматически пропустит исключенные URL</li>
          </ol>
        </div>
      )}
    </div>
  );
}
