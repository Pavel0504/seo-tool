import { useState, useEffect } from 'react';
import { BarChart3, Play, FileText, Settings, Map, Shield, LogOut } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import NewAudit from './components/NewAudit';
import AuditResults from './components/AuditResults';
import ExclusionManager from './components/ExclusionManager';
import SitemapViewer from './components/SitemapViewer';
import RobotsViewer from './components/RobotsViewer';

type View = 'dashboard' | 'new-audit' | 'results' | 'exclusions' | 'sitemap' | 'robots';

function AppContent() {
  const { isAuthenticated, logout } = useAuth();
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [selectedAuditId, setSelectedAuditId] = useState<string>('');

  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/audit/')) {
      const auditId = path.split('/audit/')[1];
      if (auditId) {
        setSelectedAuditId(auditId);
        setCurrentView('results');
      }
    }
  }, []);

  function navigateToResults(auditId: string) {
    setSelectedAuditId(auditId);
    setCurrentView('results');
    window.history.pushState({}, '', `/audit/${auditId}`);
  }

  function navigate(view: View) {
    setCurrentView(view);
    if (view === 'dashboard') {
      window.history.pushState({}, '', '/');
    }
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <nav className="bg-gray-800 border-b border-gray-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-8 h-8 text-blue-500" />
              <h1 className="text-xl font-bold text-gray-100">SEO Аудит</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('dashboard')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  currentView === 'dashboard'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Аудиты</span>
              </button>
              <button
                onClick={() => navigate('sitemap')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  currentView === 'sitemap'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                <Map className="w-4 h-4" />
                <span>Sitemap</span>
              </button>
              <button
                onClick={() => navigate('robots')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  currentView === 'robots'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                <Shield className="w-4 h-4" />
                <span>Robots</span>
              </button>
              <button
                onClick={() => navigate('exclusions')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  currentView === 'exclusions'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span>Исключения</span>
              </button>
              <button
                onClick={() => navigate('new-audit')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  currentView === 'new-audit'
                    ? 'bg-green-600 text-white'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                <Play className="w-4 h-4" />
                <span>Новый аудит</span>
              </button>
              <button
                onClick={logout}
                className="flex items-center space-x-2 px-4 py-2 text-gray-300 hover:bg-gray-700 rounded-lg transition-colors"
                title="Выйти"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentView === 'dashboard' && <Dashboard onSelectAudit={navigateToResults} />}
        {currentView === 'new-audit' && <NewAudit />}
        {currentView === 'exclusions' && <ExclusionManager />}
        {currentView === 'sitemap' && <SitemapViewer />}
        {currentView === 'robots' && <RobotsViewer />}
        {currentView === 'results' && selectedAuditId && <AuditResults auditId={selectedAuditId} />}
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
