import { useEffect, useState } from 'react';
import { Loader } from 'lucide-react';
import { AuthProvider, useAuth } from './components/AuthContext';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Portfolio from './pages/Portfolio';
import MarketAnalysis from './pages/MarketAnalysis';
import TradeHistory from './pages/TradeHistory';
import Backtesting from './pages/Backtesting';
import Settings from './pages/Settings';
import Login from './pages/Login';

function AppContent() {
  const { user, loading, authenticated } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onLogout={() => window.location.reload()} />;
      case 'portfolio':
        return <Portfolio />;
      case 'analysis':
        return <MarketAnalysis />;
      case 'history':
        return <TradeHistory />;
      case 'backtesting':
        return <Backtesting />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard onLogout={() => window.location.reload()} />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return <Login onSuccess={() => window.location.reload()} />;
  }

  return (
    <div className="flex h-screen bg-[#0a0f1e] overflow-hidden">
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
      {renderPage()}
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
