import { useState, useMemo } from 'react';
import { BarChart3, Play, Calendar, DollarSign, Settings, TrendingUp } from 'lucide-react';
import PageTransition from '../components/PageTransition';
import { useBacktests, useRunBacktest } from '../lib/queries';
import { useModels } from '../lib/queries';
import Skeleton from '../components/Skeleton';
import type { Backtest } from '../lib/api';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

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
  const { data: modelsData } = useModels();
  const runBacktest = useRunBacktest();
  const [isRunning, setIsRunning] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('ppo');
  const [showConfig, setShowConfig] = useState(false);
  const [selectedForComparison, setSelectedForComparison] = useState<Set<number>>(new Set());

  const availableModels = modelsData?.available_models || [];
  const activeModel = modelsData?.active_model?.toLowerCase() || 'ppo';

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
          symbols: ['BTC'],
          strategy_params: {
            model_type: selectedModel.toLowerCase(),
          },
        },
        apiKey: API_KEY,
      });
    } finally {
      setIsRunning(false);
    }
  };

  // Prepare comparison chart data
  const comparisonChartData = useMemo(() => {
    if (selectedForComparison.size === 0 || !backtests) return [];

    const selectedBacktests = backtests.filter((bt) => selectedForComparison.has(bt.id));
    
    // Find the longest equity curve to use as the base length
    let maxLength = 0;
    selectedBacktests.forEach((bt) => {
      if (bt.equity_curve && bt.equity_curve.length > maxLength) {
        maxLength = bt.equity_curve.length;
      }
    });

    if (maxLength === 0) return [];

    // Normalize all equity curves to the same length and create chart data points
    const chartData: Array<Record<string, number | string>> = [];
    
    for (let i = 0; i < maxLength; i++) {
      const dataPoint: Record<string, number | string> = {
        step: i + 1,
      };

      selectedBacktests.forEach((bt) => {
        if (bt.equity_curve && bt.equity_curve.length > 0) {
          // Interpolate or use last value if needed
          const index = Math.floor((i / (maxLength - 1)) * (bt.equity_curve.length - 1));
          const modelType = ((bt.params.strategy_params as any)?.model_type || 
                            bt.params.model_type || 
                            'PPO').toUpperCase();
          dataPoint[`Backtest #${bt.id} (${modelType})`] = bt.equity_curve[index];
        }
      });

      chartData.push(dataPoint);
    }

    return chartData;
  }, [backtests, selectedForComparison]);

  const toggleComparison = (backtestId: number) => {
    const newSet = new Set(selectedForComparison);
    if (newSet.has(backtestId)) {
      newSet.delete(backtestId);
    } else {
      newSet.add(backtestId);
      if (newSet.size > 5) {
        // Limit to 5 backtests for comparison
        const firstId = Array.from(newSet)[0];
        newSet.delete(firstId);
      }
    }
    setSelectedForComparison(newSet);
  };

  return (
    <PageTransition className="flex-1 bg-slate-50 p-8 overflow-auto dark:bg-[#0a0f1e]">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2 dark:text-white">Backtesting</h1>
            <p className="text-slate-500 dark:text-gray-400">Testing strategies on historical data</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="bg-slate-200 hover:bg-slate-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-slate-900 dark:text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>
            <button
              onClick={handleRunBacktest}
              disabled={isRunning || runBacktest.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="w-4 h-4" />
              {isRunning || runBacktest.isPending ? 'Running...' : 'Run New Backtest'}
            </button>
          </div>
        </div>

        {showConfig && (
          <div className="bg-white dark:bg-[#141b2d] border border-slate-200 dark:border-gray-800 rounded-xl p-4 mb-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Backtest Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-gray-300 mb-2">
                  Model Type
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {availableModels
                    .filter((m) => m.available)
                    .map((model) => (
                      <option key={model.type} value={model.type.toLowerCase()}>
                        {model.type} {model.active ? '(Active)' : ''}
                      </option>
                    ))}
                </select>
                <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
                  Currently active: {activeModel.toUpperCase()}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Comparison Chart */}
        {comparisonChartData.length > 0 && (
          <div className="bg-white dark:bg-[#141b2d] border border-slate-200 dark:border-gray-800 rounded-xl p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Backtest Comparison
              </h2>
              <button
                onClick={() => setSelectedForComparison(new Set())}
                className="text-sm text-slate-500 hover:text-slate-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Clear Selection
              </button>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={comparisonChartData}>
                  <CartesianGrid strokeDasharray="4 4" stroke="#374151" />
                  <XAxis 
                    dataKey="step" 
                    stroke="#9ca3af"
                    label={{ value: 'Step', position: 'insideBottom', offset: -5, style: { fill: '#9ca3af' } }}
                  />
                  <YAxis 
                    stroke="#9ca3af"
                    label={{ value: 'Equity ($)', angle: -90, position: 'insideLeft', style: { fill: '#9ca3af' } }}
                    tickFormatter={(value) => `$${value.toLocaleString()}`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1f2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Legend />
                  {Array.from(selectedForComparison).map((backtestId) => {
                    const backtest = backtests?.find((bt) => bt.id === backtestId);
                    if (!backtest) return null;
                    const modelType = ((backtest.params.strategy_params as any)?.model_type || 
                                     backtest.params.model_type || 
                                     'PPO').toUpperCase();
                    const color = `hsl(${(backtestId * 137.5) % 360}, 70%, 50%)`;
                    return (
                      <Line
                        key={backtestId}
                        type="monotone"
                        dataKey={`Backtest #${backtestId} (${modelType})`}
                        stroke={color}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
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
          {backtests.map((backtest: Backtest) => {
            const modelType = ((backtest.params.strategy_params as any)?.model_type || 
                             backtest.params.model_type || 
                             'PPO').toUpperCase();
            const isSelected = selectedForComparison.has(backtest.id);
            const equityChartData = backtest.equity_curve
              ? backtest.equity_curve.map((equity, index) => ({
                  step: index + 1,
                  equity: equity,
                }))
              : [];

            return (
              <div
                key={backtest.id}
                className={`bg-white border rounded-xl p-6 dark:bg-[#141b2d] dark:border-gray-800 hover:shadow-lg transition-all ${
                  isSelected ? 'border-blue-500 dark:border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200'
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                        Backtest #{backtest.id}
                      </h3>
                      <button
                        onClick={() => toggleComparison(backtest.id)}
                        className={`text-xs px-2 py-1 rounded ${
                          isSelected
                            ? 'bg-blue-500 text-white'
                            : 'bg-slate-200 dark:bg-gray-700 text-slate-700 dark:text-gray-300 hover:bg-slate-300 dark:hover:bg-gray-600'
                        }`}
                        title={isSelected ? 'Remove from comparison' : 'Add to comparison'}
                      >
                        {isSelected ? '✓ Selected' : '+ Compare'}
                      </button>
                    </div>
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

                {/* Equity Curve Chart */}
                {equityChartData.length > 0 && (
                  <div className="mb-4 p-4 bg-slate-50 dark:bg-[#0f172a] rounded-lg">
                    <h4 className="text-sm font-medium text-slate-700 dark:text-gray-300 mb-3">
                      Equity Curve
                    </h4>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={equityChartData}>
                          <CartesianGrid strokeDasharray="4 4" stroke="#374151" />
                          <XAxis 
                            dataKey="step" 
                            stroke="#9ca3af"
                            fontSize={12}
                          />
                          <YAxis 
                            stroke="#9ca3af"
                            fontSize={12}
                            tickFormatter={(value) => `$${value.toLocaleString()}`}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#1f2937', 
                              border: '1px solid #374151',
                              borderRadius: '8px',
                            }}
                            formatter={(value: number) => formatCurrency(value)}
                            labelFormatter={(label) => `Step ${label}`}
                          />
                          <Line
                            type="monotone"
                            dataKey="equity"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 4 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

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
                    <div className="text-xs text-slate-500 dark:text-gray-400 mb-1">Model</div>
                    <div className="text-sm font-medium text-slate-700 dark:text-gray-300">
                      {modelType}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PageTransition>
  );
}
