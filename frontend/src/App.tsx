import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './components/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Portfolio from './pages/Portfolio';
import MarketAnalysis from './pages/MarketAnalysis';
import TradeHistory from './pages/TradeHistory';
import Backtesting from './pages/Backtesting';
import Settings from './pages/Settings';
import Login from './pages/Login';

function AppLayout() {
  return (
    <div className="flex h-screen bg-[#0a0f1e] overflow-hidden">
      <Sidebar />
      <Routes>
        <Route path="/dashboard" element={<Dashboard onLogout={() => window.location.reload()} />} />
        <Route path="/portfolio" element={<Portfolio />} />
        <Route path="/analysis" element={<MarketAnalysis />} />
        <Route path="/history" element={<TradeHistory />} />
        <Route path="/backtesting" element={<Backtesting />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </div>
  );
}

function AppContent() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login onSuccess={() => window.location.reload()} />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
