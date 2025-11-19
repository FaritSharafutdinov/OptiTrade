import { useState } from 'react';
import { RotateCcw, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import PageTransition from '../components/PageTransition';
import { useRecentTrades } from '../lib/queries';
import Skeleton from '../components/Skeleton';
import type { TradeRecord } from '../lib/api';
import { useQueryClient } from '@tanstack/react-query';

function formatTimestamp(timestamp: string) {
  return new Date(timestamp).toLocaleString('en-US', { hour12: false });
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);
}

function tradeColor(action: string) {
  const normalized = action.toUpperCase();
  if (normalized === 'BUY') return 'text-green-600 dark:text-green-500';
  if (normalized === 'SELL') return 'text-red-600 dark:text-red-500';
  return 'text-slate-500 dark:text-gray-400';
}

const API_KEY = import.meta.env.VITE_ADMIN_API_KEY || 'devkey';

export default function TradeHistory() {
  const [selectedSymbol, setSelectedSymbol] = useState<string | undefined>();
  const { data: trades, isLoading } = useRecentTrades(100, 0, selectedSymbol);
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);

  const uniqueSymbols = Array.from(new Set(trades?.map((t) => t.symbol) || []));

  const handleGenerateDemo = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'}/trades/generate-demo`,
        {
          method: 'POST',
          headers: {
            'X-API-Key': API_KEY,
            'Content-Type': 'application/json',
          },
        }
      );
      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ['recent-trades'] });
      }
    } catch (error) {
      console.error('Failed to generate demo trades:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <PageTransition className="flex-1 bg-slate-50 p-8 overflow-auto dark:bg-[#0a0f1e]">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2 dark:text-white">Trade History</h1>
          <p className="text-slate-500 dark:text-gray-400">
            Complete history of all agent trading operations
            {trades && trades.length > 0 && ` • ${trades.length} trades`}
          </p>
        </div>
        {uniqueSymbols.length > 0 && (
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedSymbol(undefined)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                !selectedSymbol
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-700 border border-slate-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
              }`}
            >
              All
            </button>
            {uniqueSymbols.map((symbol) => (
              <button
                key={symbol}
                onClick={() => setSelectedSymbol(symbol)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedSymbol === symbol
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-700 border border-slate-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
                }`}
              >
                {symbol}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl dark:bg-[#141b2d] dark:border-gray-800 overflow-hidden">
        {isLoading ? (
          <div className="p-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="mb-4">
                <Skeleton className="h-16 w-full" />
              </div>
            ))}
          </div>
        ) : !trades || trades.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12">
            <RotateCcw className="w-20 h-20 text-slate-400 mb-6" />
            <p className="text-lg text-slate-700 mb-2 dark:text-gray-300">No trades found</p>
            <p className="text-sm text-slate-500 dark:text-gray-400 mb-6">
              {selectedSymbol ? `No trades for ${selectedSymbol}` : 'No trading history available'}
            </p>
            {!selectedSymbol && (
              <button
                onClick={handleGenerateDemo}
                disabled={isGenerating}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                {isGenerating ? 'Generating...' : 'Generate Demo Trades'}
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-gray-800">
                  <th className="text-left py-4 px-6 text-slate-500 text-sm font-medium dark:text-gray-400">
                    Time
                  </th>
                  <th className="text-left py-4 px-6 text-slate-500 text-sm font-medium dark:text-gray-400">
                    Symbol
                  </th>
                  <th className="text-left py-4 px-6 text-slate-500 text-sm font-medium dark:text-gray-400">
                    Action
                  </th>
                  <th className="text-right py-4 px-6 text-slate-500 text-sm font-medium dark:text-gray-400">
                    Price
                  </th>
                  <th className="text-right py-4 px-6 text-slate-500 text-sm font-medium dark:text-gray-400">
                    Size
                  </th>
                  <th className="text-right py-4 px-6 text-slate-500 text-sm font-medium dark:text-gray-400">
                    P&L
                  </th>
                </tr>
              </thead>
              <tbody>
                {trades.map((trade: TradeRecord) => (
                  <tr
                    key={trade.id}
                    className="border-b border-slate-100 hover:bg-slate-50 transition-colors dark:border-gray-800/50 dark:hover:bg-gray-800/30"
                  >
                    <td className="py-4 px-6 text-slate-700 dark:text-gray-300 text-sm">
                      {formatTimestamp(trade.timestamp)}
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-medium text-slate-900 dark:text-white">
                        {trade.symbol}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`font-semibold ${tradeColor(trade.action)}`}>
                        {trade.action}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right text-slate-900 dark:text-white font-medium">
                      {formatCurrency(trade.price)}
                    </td>
                    <td className="py-4 px-6 text-right text-slate-900 dark:text-white font-medium">
                      {trade.size.toLocaleString()}
                    </td>
                    <td className="py-4 px-6 text-right">
                      {typeof trade.pnl === 'number' ? (
                        <div className="flex items-center justify-end gap-1">
                          {trade.pnl >= 0 ? (
                            <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-500" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-500" />
                          )}
                          <span
                            className={`font-semibold ${
                              trade.pnl >= 0
                                ? 'text-green-600 dark:text-green-500'
                                : 'text-red-600 dark:text-red-500'
                            }`}
                          >
                            {formatCurrency(trade.pnl)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 dark:text-gray-500">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
