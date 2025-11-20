import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider } from './components/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import { ThemeProvider } from './components/ThemeProvider';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Portfolio = lazy(() => import('./pages/Portfolio'));
const MarketAnalysis = lazy(() => import('./pages/MarketAnalysis'));
const TradeHistory = lazy(() => import('./pages/TradeHistory'));
const Backtesting = lazy(() => import('./pages/Backtesting'));
const Settings = lazy(() => import('./pages/Settings'));
const Login = lazy(() => import('./pages/Login'));

function AppLayout() {
  const location = useLocation();
  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#0a0f1e] overflow-hidden">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <Sidebar />
      <main id="main-content" className="flex-1 overflow-auto bg-slate-50 dark:bg-[#0a0f1e]">
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center text-gray-400">Loading...</div>
          }
        >
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/portfolio" element={<Portfolio />} />
              <Route path="/analysis" element={<MarketAnalysis />} />
              <Route path="/history" element={<TradeHistory />} />
              <Route path="/backtesting" element={<Backtesting />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </AnimatePresence>
        </Suspense>
      </main>
    </div>
  );
}

function AppContent() {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center text-gray-400">
            Loading...
          </div>
        }
      >
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
      <ThemeProvider>
        <AuthProvider>
          <>
            <AppContent />
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                className:
                  'bg-white text-slate-900 border border-slate-200 dark:bg-[#1f2937] dark:text-white dark:border-gray-700',
              }}
            />
          </>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
