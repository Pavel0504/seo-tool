import { useState, useEffect } from 'react';
import { RefreshCw, Copy, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function RobotsViewer() {
  const [robotsContent, setRobotsContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const SITE_URL = 'https://atlantpro24.ru';

  useEffect(() => {
    loadRobots();
  }, []);

  async function loadRobots() {
    try {
      const { data, error } = await supabase
        .from('stored_robots')
        .select('*')
        .eq('site_url', SITE_URL)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setRobotsContent(data.content);
        setLastUpdate(data.fetched_at);
      }
    } catch (error) {
      console.error('Error loading robots.txt:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updateRobots() {
    setUpdating(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/update-robots`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          site_url: SITE_URL,
          robots_txt_url: `${SITE_URL}/robots.txt`,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update robots.txt');
      }

      await loadRobots();
    } catch (error) {
      console.error('Error updating robots.txt:', error);
      alert('Ошибка обновления robots.txt');
    } finally {
      setUpdating(false);
    }
  }

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(robotsContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  }

  const lines = robotsContent.split('\n');
  const userAgents = lines.filter(line => line.trim().toLowerCase().startsWith('user-agent:')).length;
  const disallows = lines.filter(line => line.trim().toLowerCase().startsWith('disallow:')).length;
  const sitemaps = lines.filter(line => line.trim().toLowerCase().startsWith('sitemap:')).length;

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
          <h1 className="text-3xl font-bold text-gray-100">Robots.txt</h1>
          {lastUpdate && (
            <p className="text-sm text-gray-400 mt-1">
              Последнее обновление: {new Date(lastUpdate).toLocaleString('ru-RU')}
            </p>
          )}
        </div>
        <button
          onClick={updateRobots}
          disabled={updating}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${updating ? 'animate-spin' : ''}`} />
          <span>{updating ? 'Обновление...' : 'Обновить Robots.txt'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
          <div className="text-2xl font-bold text-gray-100">{lines.length}</div>
          <div className="text-sm text-gray-400 mt-1">Всего строк</div>
        </div>
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
          <div className="text-2xl font-bold text-blue-400">{userAgents}</div>
          <div className="text-sm text-gray-400 mt-1">User-agent</div>
        </div>
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
          <div className="text-2xl font-bold text-orange-400">{disallows}</div>
          <div className="text-sm text-gray-400 mt-1">Disallow</div>
        </div>
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
          <div className="text-2xl font-bold text-green-400">{sitemaps}</div>
          <div className="text-sm text-gray-400 mt-1">Sitemap</div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700">
        <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-100">Содержимое</h2>
          <button
            onClick={copyToClipboard}
            className="flex items-center space-x-2 px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors text-sm"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                <span>Скопировано</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Копировать</span>
              </>
            )}
          </button>
        </div>
        <div className="p-6">
          {robotsContent ? (
            <pre className="bg-gray-900 rounded-lg p-4 overflow-x-auto text-sm text-gray-300 font-mono border border-gray-700">
              {robotsContent}
            </pre>
          ) : (
            <div className="text-center py-12 text-gray-400">
              Robots.txt не найден или не загружен
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
