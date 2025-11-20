import { useState } from 'react';
import { BarChart3, Play, Calendar, DollarSign } from 'lucide-react';
import PageTransition from '../components/PageTransition';
import { useBacktests, useRunBacktest } from '../lib/queries';
import Skeleton from '../components/Skeleton';
import type { Backtest } from '../lib/api';

const API_KEY = import.meta.env.VITE_ADMIN_API_KEY || 'devkey';

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);
}

export default function Backtesting() {
  const { data: backtests, isLoading } = useBacktests(20, 0);
  const runBacktest = useRunBacktest();
  const [isRunning, setIsRunning] = useState(false);

  const handleRunBacktest = async () => {
    setIsRunning(true);
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 3); // 3 months back

    try {
      await runBacktest.mutateAsync({
        request: {
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          initial_balance: 10000,
          symbols: ['BTC', 'ETH', 'SOL'],
        },
        apiKey: API_KEY,
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <PageTransition className="flex-1 bg-slate-50 p-8 overflow-auto dark:bg-[#0a0f1e]">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2 dark:text-white">Backtesting</h1>
          <p className="text-slate-500 dark:text-gray-400">Testing strategies on historical data</p>
        </div>
        <button
          onClick={handleRunBacktest}
          disabled={isRunning || runBacktest.isPending}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Play className="w-4 h-4" />
          {isRunning || runBacktest.isPending ? 'Running...' : 'Run New Backtest'}
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-white border border-slate-200 rounded-xl p-6 dark:bg-[#141b2d] dark:border-gray-800"
            >
              <Skeleton className="h-6 w-48 mb-4" />
              <div className="grid grid-cols-4 gap-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : !backtests || backtests.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-12 dark:border-gray-800 dark:bg-[#141b2d]">
          <BarChart3 className="w-20 h-20 text-slate-400 mb-6" />
          <p className="text-lg text-slate-700 mb-2 dark:text-gray-300">No backtest results yet</p>
          <p className="text-sm text-slate-500 dark:text-gray-400 mb-6">
            Run your first backtest to see strategy performance
          </p>
          <button
            onClick={handleRunBacktest}
            disabled={isRunning || runBacktest.isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            Run Backtest
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {backtests.map((backtest: Backtest) => (
            <div
              key={backtest.id}
              className="bg-white border border-slate-200 rounded-xl p-6 dark:bg-[#141b2d] dark:border-gray-800 hover:shadow-lg transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
                    Backtest #{backtest.id}
                  </h3>
                  <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {formatDate(backtest.created_at)}
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4" />
                      Initial: {formatCurrency(backtest.params.initial_balance)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className={`text-2xl font-bold ${
                      (backtest.metrics.total_return_pct ?? 0) >= 0
                        ? 'text-green-600 dark:text-green-500'
                        : 'text-red-600 dark:text-red-500'
                    }`}
                  >
                    {(backtest.metrics.total_return_pct ?? 0) >= 0 ? '+' : ''}
                    {(backtest.metrics.total_return_pct ?? 0).toFixed(2)}%
                  </div>
                  <div className="text-sm text-slate-500 dark:text-gray-400">
                    {formatCurrency(backtest.metrics.total_return ?? 0)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-200 dark:border-gray-800">
                <div>
                  <div className="text-xs text-slate-500 dark:text-gray-400 mb-1">
                    Final Balance
                  </div>
                  <div className="text-lg font-semibold text-slate-900 dark:text-white">
                    {formatCurrency(backtest.metrics.final_balance ?? 0)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 dark:text-gray-400 mb-1">Sharpe Ratio</div>
                  <div className="text-lg font-semibold text-slate-900 dark:text-white">
                    {(backtest.metrics.sharpe_ratio ?? 0).toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 dark:text-gray-400 mb-1">Win Rate</div>
                  <div className="text-lg font-semibold text-slate-900 dark:text-white">
                    {(backtest.metrics.win_rate ?? 0).toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 dark:text-gray-400 mb-1">Total Trades</div>
                  <div className="text-lg font-semibold text-slate-900 dark:text-white">
                    {backtest.metrics.total_trades ?? 0}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 dark:text-gray-400 mb-1">Max Drawdown</div>
                  <div className="text-lg font-semibold text-red-600 dark:text-red-500">
                    {(backtest.metrics.max_drawdown ?? 0).toFixed(2)}%
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 dark:text-gray-400 mb-1">
                    Profit Factor
                  </div>
                  <div className="text-lg font-semibold text-slate-900 dark:text-white">
                    {(backtest.metrics.profit_factor ?? 0).toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 dark:text-gray-400 mb-1">Period</div>
                  <div className="text-sm font-medium text-slate-700 dark:text-gray-300">
                    {formatDate(backtest.params.start_date)} -{' '}
                    {formatDate(backtest.params.end_date)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 dark:text-gray-400 mb-1">Symbols</div>
                  <div className="text-sm font-medium text-slate-700 dark:text-gray-300">
                    {backtest.params.symbols?.join(', ') || 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageTransition>
  );
}
