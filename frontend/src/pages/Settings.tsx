import { useState } from 'react';
import { Settings as SettingsIcon, Play, Square, Save, AlertCircle } from 'lucide-react';
import PageTransition from '../components/PageTransition';
import { useBotStatus, useStartBot, useStopBot, useUpdateBotConfig } from '../lib/queries';
import Skeleton from '../components/Skeleton';

const API_KEY = import.meta.env.VITE_ADMIN_API_KEY || 'devkey';

export default function Settings() {
  const { data: botStatus, isLoading } = useBotStatus();
  const startBot = useStartBot();
  const stopBot = useStopBot();
  const updateConfig = useUpdateBotConfig();

  const [mode, setMode] = useState<'paper' | 'live'>('paper');
  const [maxPositionSize, setMaxPositionSize] = useState<string>('');
  const [riskPerTrade, setRiskPerTrade] = useState<string>('');
  const [symbols, setSymbols] = useState<string>('');

  const handleStart = () => {
    startBot.mutate({ request: { mode }, apiKey: API_KEY });
  };

  const handleStop = () => {
    stopBot.mutate(API_KEY);
  };

  const handleUpdateConfig = () => {
    const config: {
      mode?: string;
      max_position_size?: number;
      risk_per_trade?: number;
      symbols?: string[];
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

    updateConfig.mutate({ config, apiKey: API_KEY });
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
                Max Position Size
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
      </div>

      {!API_KEY || API_KEY === 'devkey' ? (
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg dark:bg-yellow-900/20 dark:border-yellow-800 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
              API Key Notice
            </p>
            <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
              Using default API key. Set VITE_ADMIN_API_KEY in your .env file for production use.
            </p>
          </div>
        </div>
      ) : null}
    </PageTransition>
  );
}
