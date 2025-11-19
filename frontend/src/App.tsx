import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './components/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Portfolio = lazy(() => import('./pages/Portfolio'));
const MarketAnalysis = lazy(() => import('./pages/MarketAnalysis'));
const TradeHistory = lazy(() => import('./pages/TradeHistory'));
const Backtesting = lazy(() => import('./pages/Backtesting'));
const Settings = lazy(() => import('./pages/Settings'));
const Login = lazy(() => import('./pages/Login'));

function AppLayout() {
  return (
    <div className="flex h-screen bg-[#0a0f1e] overflow-hidden">
      <a href="#main-content" className="skip-link">
        Перейти к основному контенту
      </a>
      <Sidebar />
      <main id="main-content" className="flex-1 overflow-auto">
        <Suspense fallback={<div className="flex h-full items-center justify-center text-gray-400">Загрузка...</div>}>
          <Routes>
            <Route path="/dashboard" element={<Dashboard onLogout={() => window.location.reload()} />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/analysis" element={<MarketAnalysis />} />
            <Route path="/history" element={<TradeHistory />} />
            <Route path="/backtesting" element={<Backtesting />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}

function AppContent() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-gray-400">Загрузка...</div>}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <>
          <AppContent />
          <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
        </>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
