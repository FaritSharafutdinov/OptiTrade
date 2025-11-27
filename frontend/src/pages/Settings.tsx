import { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Play,
  Square,
  Save,
  AlertCircle,
  Shield,
  Key,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import PageTransition from '../components/PageTransition';
import { useBotStatus, useStartBot, useStopBot, useUpdateBotConfig } from '../lib/queries';
import { useQuery } from '@tanstack/react-query';
import { getRiskStats, type RiskStats } from '../lib/api';
import Skeleton from '../components/Skeleton';

const API_KEY = import.meta.env.VITE_ADMIN_API_KEY || 'devkey';

export default function Settings() {
  const { data: botStatus, isLoading } = useBotStatus();
  const startBot = useStartBot();
  const stopBot = useStopBot();
  const updateConfig = useUpdateBotConfig();

  // API Key management (stored in localStorage)
  const [apiKey, setApiKey] = useState<string>(() => {
    const stored = localStorage.getItem('api_key');
    return stored || API_KEY;
  });

  // Bot configuration
  const [mode, setMode] = useState<'paper' | 'live'>('paper');
  const [maxPositionSize, setMaxPositionSize] = useState<string>('');
  const [riskPerTrade, setRiskPerTrade] = useState<string>('');
  const [symbols, setSymbols] = useState<string>('');

  // Risk management settings
  const [riskLimits, setRiskLimits] = useState({
    stopLossPercent: '',
    takeProfitPercent: '',
    maxDailyLoss: '',
    maxPositionSizePercent: '',
  });

  // Load risk stats
  const { data: riskStats, isLoading: riskStatsLoading } = useQuery<RiskStats>({
    queryKey: ['risk-stats'],
    queryFn: getRiskStats,
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Load current risk limits from API when available
  useEffect(() => {
    if (riskStats?.limits) {
      setRiskLimits({
        stopLossPercent: riskStats.limits.stop_loss_percent != null
          ? (riskStats.limits.stop_loss_percent * 100).toFixed(2)
          : '',
        takeProfitPercent: riskStats.limits.take_profit_percent != null
          ? (riskStats.limits.take_profit_percent * 100).toFixed(2)
          : '',
        maxDailyLoss: riskStats.limits.max_daily_loss != null
          ? (riskStats.limits.max_daily_loss * 100).toFixed(2)
          : '',
        maxPositionSizePercent: riskStats.limits.max_position_size != null
          ? (riskStats.limits.max_position_size * 100).toFixed(2)
          : '',
      });
    }
  }, [riskStats]);

  const handleSaveApiKey = () => {
    localStorage.setItem('api_key', apiKey);
    alert('API Key saved to localStorage. Refresh the page to apply.');
  };

  const currentApiKey = apiKey || API_KEY;

  const handleStart = () => {
    startBot.mutate({ request: { mode }, apiKey: currentApiKey });
  };

  const handleStop = () => {
    stopBot.mutate(currentApiKey);
  };

  const handleUpdateConfig = () => {
    const config: {
      mode?: string;
      max_position_size?: number;
      risk_per_trade?: number;
      symbols?: string[];
      stop_loss_percent?: number;
      take_profit_percent?: number;
      max_daily_loss?: number;
    } = {};

    if (mode) config.mode = mode;
    if (maxPositionSize) config.max_position_size = parseFloat(maxPositionSize);
    if (riskPerTrade) config.risk_per_trade = parseFloat(riskPerTrade);
    if (symbols) {
      config.symbols = symbols
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
    if (riskLimits.stopLossPercent) {
      config.stop_loss_percent = parseFloat(riskLimits.stopLossPercent) / 100;
    }
    if (riskLimits.takeProfitPercent) {
      config.take_profit_percent = parseFloat(riskLimits.takeProfitPercent) / 100;
    }
    if (riskLimits.maxDailyLoss) {
      config.max_daily_loss = parseFloat(riskLimits.maxDailyLoss) / 100;
    }

    updateConfig.mutate({ config, apiKey: currentApiKey });
  };

  return (
    <PageTransition className="flex-1 bg-slate-50 p-8 overflow-auto dark:bg-[#0a0f1e]">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2 dark:text-white">Agent Settings</h1>
        <p className="text-slate-500 dark:text-gray-400">
          Configuration of OptiTrade trading agent parameters
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bot Control */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 dark:bg-[#141b2d] dark:border-gray-800">
          <div className="flex items-center gap-3 mb-6">
            <SettingsIcon className="w-6 h-6 text-blue-600 dark:text-blue-500" />
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Bot Control</h2>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg dark:bg-gray-800/50">
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-gray-300">Status</p>
                  <p className="text-lg font-semibold text-slate-900 dark:text-white">
                    {botStatus?.running ? (
                      <span className="text-green-600 dark:text-green-500">Running</span>
                    ) : (
                      <span className="text-slate-500 dark:text-gray-400">Stopped</span>
                    )}
                  </p>
                </div>
                <div className="flex gap-2">
                  {botStatus?.running ? (
                    <button
                      onClick={handleStop}
                      disabled={stopBot.isPending}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Square className="w-4 h-4" />
                      Stop
                    </button>
                  ) : (
                    <button
                      onClick={handleStart}
                      disabled={startBot.isPending}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Play className="w-4 h-4" />
                      Start
                    </button>
                  )}
                </div>
              </div>

              {botStatus?.mode && (
                <div className="p-4 bg-blue-50 rounded-lg dark:bg-blue-900/20">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Current mode: <span className="font-semibold">{botStatus.mode}</span>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* API Key Management */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 dark:bg-[#141b2d] dark:border-gray-800">
          <div className="flex items-center gap-3 mb-6">
            <Key className="w-6 h-6 text-yellow-600 dark:text-yellow-500" />
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">API Key</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-gray-300">
                Admin API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter API key"
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 dark:bg-gray-800 dark:text-white dark:border-gray-700 dark:placeholder-gray-500 font-mono text-sm"
              />
              <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
                Stored in browser localStorage. Default: {API_KEY}
              </p>
            </div>

            <button
              onClick={handleSaveApiKey}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition-colors"
            >
              <Key className="w-4 h-4" />
              Save API Key
            </button>

            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-900/20 dark:border-blue-800">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                <strong>Note:</strong> For Live Trading mode, exchange API keys (Binance, Bybit, etc.) must be configured in the backend <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">.env</code> file:
                <br />
                <code className="text-xs mt-1 block">BINANCE_API_KEY=your_key</code>
                <code className="text-xs block">BINANCE_API_SECRET=your_secret</code>
              </p>
            </div>
          </div>
        </div>

        {/* Configuration */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 dark:bg-[#141b2d] dark:border-gray-800">
          <div className="flex items-center gap-3 mb-6">
            <SettingsIcon className="w-6 h-6 text-blue-600 dark:text-blue-500" />
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Configuration</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-gray-300">
                Trading Mode
              </label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as 'paper' | 'live')}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 dark:bg-gray-800 dark:text-white dark:border-gray-700"
              >
                <option value="paper">Paper Trading</option>
                <option value="live">Live Trading</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-gray-300">
                Max Position Size ($)
              </label>
              <input
                type="number"
                value={maxPositionSize}
                onChange={(e) => setMaxPositionSize(e.target.value)}
                placeholder="e.g., 1000"
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 dark:bg-gray-800 dark:text-white dark:border-gray-700 dark:placeholder-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-gray-300">
                Risk Per Trade (%)
              </label>
              <input
                type="number"
                value={riskPerTrade}
                onChange={(e) => setRiskPerTrade(e.target.value)}
                placeholder="e.g., 2"
                step="0.1"
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 dark:bg-gray-800 dark:text-white dark:border-gray-700 dark:placeholder-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-gray-300">
                Trading Symbols (comma-separated)
              </label>
              <input
                type="text"
                value={symbols}
                onChange={(e) => setSymbols(e.target.value)}
                placeholder="e.g., BTC, ETH, SOL"
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 dark:bg-gray-800 dark:text-white dark:border-gray-700 dark:placeholder-gray-500"
              />
            </div>

            <button
              onClick={handleUpdateConfig}
              disabled={updateConfig.isPending}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              Save Configuration
            </button>
          </div>
        </div>

        {/* Risk Management */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 dark:bg-[#141b2d] dark:border-gray-800">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-6 h-6 text-red-600 dark:text-red-500" />
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Risk Management</h2>
          </div>

          {riskStatsLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <>
              {/* Current Risk Stats */}
              {riskStats && riskStats.daily_stats && (
                <div className="mb-6 space-y-2 p-4 bg-slate-50 rounded-lg dark:bg-gray-800/50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-gray-400">Daily P&L:</span>
                    <span
                      className={`text-sm font-semibold ${
                        (riskStats.daily_stats?.daily_pnl ?? 0) >= 0
                          ? 'text-green-600 dark:text-green-500'
                          : 'text-red-600 dark:text-red-500'
                      }`}
                    >
                      ${(riskStats.daily_stats?.daily_pnl ?? 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-gray-400">Trades Today:</span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      {riskStats.daily_stats?.trades_today ?? 0}
                    </span>
                  </div>
                  {riskStats.should_stop_trading && (
                    <div className="flex items-center gap-2 p-2 bg-red-50 rounded dark:bg-red-900/20">
                      <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-500" />
                      <span className="text-xs text-red-700 dark:text-red-400">
                        Trading stopped due to risk limits
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-gray-300">
                    Stop Loss (%)
                  </label>
                  <input
                    type="number"
                    value={riskLimits.stopLossPercent}
                    onChange={(e) =>
                      setRiskLimits({ ...riskLimits, stopLossPercent: e.target.value })
                    }
                    placeholder="e.g., 2"
                    step="0.1"
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 dark:bg-gray-800 dark:text-white dark:border-gray-700 dark:placeholder-gray-500"
                  />
                  <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
                    {riskStats?.limits?.stop_loss_percent != null
                      ? `Current: ${(riskStats.limits.stop_loss_percent * 100).toFixed(2)}%`
                      : 'Percentage below entry price for stop loss'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-gray-300">
                    Take Profit (%)
                  </label>
                  <input
                    type="number"
                    value={riskLimits.takeProfitPercent}
                    onChange={(e) =>
                      setRiskLimits({ ...riskLimits, takeProfitPercent: e.target.value })
                    }
                    placeholder="e.g., 4"
                    step="0.1"
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 dark:bg-gray-800 dark:text-white dark:border-gray-700 dark:placeholder-gray-500"
                  />
                  <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
                    {riskStats?.limits?.take_profit_percent != null
                      ? `Current: ${(riskStats.limits.take_profit_percent * 100).toFixed(2)}%`
                      : 'Percentage above entry price for take profit'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-gray-300">
                    Max Daily Loss (%)
                  </label>
                  <input
                    type="number"
                    value={riskLimits.maxDailyLoss}
                    onChange={(e) =>
                      setRiskLimits({ ...riskLimits, maxDailyLoss: e.target.value })
                    }
                    placeholder="e.g., 5"
                    step="0.1"
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 dark:bg-gray-800 dark:text-white dark:border-gray-700 dark:placeholder-gray-500"
                  />
                  <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
                    {riskStats?.limits?.max_daily_loss != null
                      ? `Current: ${(riskStats.limits.max_daily_loss * 100).toFixed(2)}% of initial balance`
                      : 'Maximum daily loss before stopping trading'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-gray-300">
                    Max Position Size (%)
                  </label>
                  <input
                    type="number"
                    value={riskLimits.maxPositionSizePercent}
                    onChange={(e) =>
                      setRiskLimits({ ...riskLimits, maxPositionSizePercent: e.target.value })
                    }
                    placeholder="e.g., 10"
                    step="0.1"
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 dark:bg-gray-800 dark:text-white dark:border-gray-700 dark:placeholder-gray-500"
                  />
                  <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
                    {riskStats?.limits?.max_position_size != null
                      ? `Current: ${(riskStats.limits.max_position_size * 100).toFixed(2)}% of equity`
                      : 'Maximum position size as percentage of total equity'}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

    </PageTransition>
  );
}
