import { useState, useEffect } from 'react';
import { RefreshCw, Search, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface SitemapEntry {
  id: string;
  site_url: string;
  category: string;
  url: string;
  lastmod?: string;
  priority?: string;
  changefreq?: string;
  updated_at: string;
}

export default function SitemapViewer() {
  const [sitemapData, setSitemapData] = useState<SitemapEntry[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const ITEMS_PER_PAGE = 100;
  const SITE_URL = 'https://atlantpro24.ru';

  useEffect(() => {
    loadSitemap();
  }, []);

  async function loadSitemap() {
    try {
      const { data, error } = await supabase
        .from('stored_sitemaps')
        .select('*')
        .eq('site_url', SITE_URL)
        .order('category', { ascending: true })
        .order('url', { ascending: true });

      if (error) throw error;
      setSitemapData(data || []);

      if (data && data.length > 0) {
        setLastUpdate(data[0].updated_at);
      }
    } catch (error) {
      console.error('Error loading sitemap:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updateSitemap() {
    setUpdating(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/update-sitemap`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          site_url: SITE_URL,
          sitemap_xml_url: `${SITE_URL}/sitemap.xml`,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update sitemap');
      }

      await loadSitemap();
    } catch (error) {
      console.error('Error updating sitemap:', error);
      alert('Ошибка обновления sitemap');
    } finally {
      setUpdating(false);
    }
  }

  const categories = ['all', ...Array.from(new Set(sitemapData.map(item => item.category)))];

  const filteredData = sitemapData.filter(item => {
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    const matchesSearch = searchQuery === '' || item.url.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const paginatedData = filteredData.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(0);
  }, [activeCategory, searchQuery]);

  const stats = {
    total: sitemapData.length,
    byCategory: categories.filter(c => c !== 'all').reduce((acc, cat) => {
      acc[cat] = sitemapData.filter(item => item.category === cat).length;
      return acc;
    }, {} as Record<string, number>),
  };

  function exportCSV() {
    const csv = [
      ['Category', 'URL', 'Last Modified', 'Priority', 'Change Frequency'].join(','),
      ...filteredData.map(item => [
        item.category,
        item.url,
        item.lastmod || '',
        item.priority || '',
        item.changefreq || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sitemap-${activeCategory}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-100">Sitemap</h1>
          {lastUpdate && (
            <p className="text-sm text-gray-400 mt-1">
              Последнее обновление: {new Date(lastUpdate).toLocaleString('ru-RU')}
            </p>
          )}
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={exportCSV}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Экспорт CSV</span>
          </button>
          <button
            onClick={updateSitemap}
            disabled={updating}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${updating ? 'animate-spin' : ''}`} />
            <span>{updating ? 'Обновление...' : 'Обновить Sitemap'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
          <div className="text-2xl font-bold text-gray-100">{stats.total}</div>
          <div className="text-sm text-gray-400 mt-1">Всего URL</div>
        </div>
        {Object.entries(stats.byCategory).slice(0, 4).map(([cat, count]) => (
          <div key={cat} className="bg-gray-800 rounded-lg border border-gray-700 p-4">
            <div className="text-2xl font-bold text-blue-400">{count}</div>
            <div className="text-sm text-gray-400 mt-1 capitalize">{cat}</div>
          </div>
        ))}
      </div>

      <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700">
        <div className="p-6 border-b border-gray-700 space-y-4">
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по URL..."
                className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-100"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2 overflow-x-auto">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  activeCategory === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {cat === 'all' ? 'Все' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                {cat !== 'all' && ` (${stats.byCategory[cat] || 0})`}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-900 text-gray-300 text-xs uppercase">
              <tr>
                <th className="px-6 py-3 text-left">Категория</th>
                <th className="px-6 py-3 text-left">URL</th>
                <th className="px-6 py-3 text-left">Изменено</th>
                <th className="px-6 py-3 text-left">Приоритет</th>
                <th className="px-6 py-3 text-left">Частота</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {paginatedData.map((item) => (
                <tr key={item.id} className="hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-300 capitalize">{item.category}</td>
                  <td className="px-6 py-4 text-sm">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 truncate block max-w-md"
                    >
                      {item.url}
                    </a>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">{item.lastmod || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-400">{item.priority || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-400">{item.changefreq || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredData.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              Нет данных для отображения
            </div>
          )}
          {totalPages > 1 && (
            <div className="flex items-center justify-center space-x-2 py-4 border-t border-gray-700">
              <button
                onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                disabled={currentPage === 0}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:opacity-50 text-gray-200 rounded-lg transition-colors"
              >
                Назад
              </button>
              <div className="text-gray-400">
                Страница {currentPage + 1} из {totalPages}
              </div>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                disabled={currentPage === totalPages - 1}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:opacity-50 text-gray-200 rounded-lg transition-colors"
              >
                Далее
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
