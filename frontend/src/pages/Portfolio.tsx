import { useQueryClient } from '@tanstack/react-query';
import { DollarSign, TrendingUp, TrendingDown, PieChart, RefreshCw } from 'lucide-react';
import StatCard from '../components/StatCard';
import { usePortfolioData } from '../lib/queries';
import type { PortfolioAsset } from '../lib/api';
import PageTransition from '../components/PageTransition';
import Skeleton from '../components/Skeleton';

function getAssetColor(symbol: string): string {
  const colors: Record<string, string> = {
    BTC: 'bg-orange-500',
    ETH: 'bg-purple-500',
    SOL: 'bg-cyan-500',
    AAPL: 'bg-gray-500',
    TSLA: 'bg-red-500',
  };
  return colors[symbol] || 'bg-blue-500';
}

export default function PortfolioPage() {
  const { data: portfolioData, isLoading } = usePortfolioData();
  const queryClient = useQueryClient();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['portfolio-data'] });
  };

  return (
    <PageTransition className="flex-1 bg-slate-50 p-8 overflow-auto dark:bg-[#0a0f1e]">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2 dark:text-white">Portfolio</h1>
          <p className="text-slate-500 dark:text-gray-400">
            Asset management and capital allocation
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Value"
          value={
            portfolioData
              ? `$${portfolioData.total_value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
              : '—'
          }
          subtitle={
            portfolioData
              ? `${((portfolioData.free_cash / portfolioData.total_value) * 100).toFixed(1)}% free cash`
              : 'Loading...'
          }
          icon={DollarSign}
          trend="up"
          isLoading={isLoading}
        />
        <StatCard
          title="Number of Assets"
          value={portfolioData ? `${portfolioData.assets_count}` : '—'}
          subtitle={portfolioData ? `${portfolioData.assets.length} positions` : 'Loading...'}
          icon={PieChart}
          isLoading={isLoading}
        />
        <StatCard
          title="Unrealized P&L"
          value={
            portfolioData
              ? `$${portfolioData.unrealized_pnl.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
              : '—'
          }
          subtitle={
            portfolioData && portfolioData.total_value > 0
              ? `${((portfolioData.unrealized_pnl / (portfolioData.total_value - portfolioData.unrealized_pnl)) * 100).toFixed(2)}%`
              : '—'
          }
          icon={TrendingUp}
          trend={portfolioData && portfolioData.unrealized_pnl >= 0 ? 'up' : 'down'}
          isLoading={isLoading}
        />
        <StatCard
          title="Available Funds"
          value={
            portfolioData
              ? `$${portfolioData.free_cash.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
              : '—'
          }
          subtitle={
            portfolioData
              ? `${((portfolioData.free_cash / portfolioData.total_value) * 100).toFixed(1)}% of portfolio`
              : 'Loading...'
          }
          icon={DollarSign}
          isLoading={isLoading}
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 dark:bg-[#141b2d] dark:border-gray-800">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-1 dark:text-white">
            Portfolio Assets
          </h2>
          <p className="text-slate-500 text-sm dark:text-gray-400">
            Detailed overview of all assets
          </p>
        </div>

        <div className="overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-gray-800">
                <th className="text-left py-4 px-4 text-slate-500 text-sm font-medium dark:text-gray-400">
                  Asset
                </th>
                <th className="text-right py-4 px-4 text-slate-500 text-sm font-medium dark:text-gray-400">
                  Quantity
                </th>
                <th className="text-right py-4 px-4 text-slate-500 text-sm font-medium dark:text-gray-400">
                  Value
                </th>
                <th className="text-right py-4 px-4 text-slate-500 text-sm font-medium dark:text-gray-400">
                  Change
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-100 dark:border-gray-800/50">
                    <td className="py-5 px-4">
                      <Skeleton className="h-10 w-32" />
                    </td>
                    <td className="py-5 px-4 text-right">
                      <Skeleton className="h-4 w-16 ml-auto" />
                    </td>
                    <td className="py-5 px-4 text-right">
                      <Skeleton className="h-4 w-20 ml-auto" />
                    </td>
                    <td className="py-5 px-4 text-right">
                      <Skeleton className="h-4 w-16 ml-auto" />
                    </td>
                  </tr>
                ))
              ) : !portfolioData || portfolioData.assets.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500 dark:text-gray-400">
                    No assets in portfolio
                  </td>
                </tr>
              ) : (
                portfolioData.assets.map((asset: PortfolioAsset) => (
                  <tr
                    key={asset.symbol}
                    className="border-b border-slate-100 hover:bg-slate-50 transition-colors dark:border-gray-800/50 dark:hover:bg-gray-800/30"
                  >
                    <td className="py-5 px-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 ${getAssetColor(asset.symbol)} rounded-full flex items-center justify-center text-white`}
                        >
                          <span className="font-bold text-sm">{asset.symbol[0]}</span>
                        </div>
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">
                            {asset.symbol}
                          </p>
                          <p className="text-sm text-slate-500 dark:text-gray-400">{asset.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-5 px-4 text-right">
                      <p className="font-medium text-slate-900 dark:text-white">
                        {asset.quantity.toLocaleString()}
                      </p>
                    </td>
                    <td className="py-5 px-4 text-right">
                      <p className="font-medium text-slate-900 dark:text-white">
                        ${asset.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </p>
                    </td>
                    <td className="py-5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {asset.change_percent >= 0 ? (
                          <>
                            <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-500" />
                            <span className="font-medium text-green-600 dark:text-green-500">
                              +{asset.change_percent.toFixed(2)}%
                            </span>
                          </>
                        ) : (
                          <>
                            <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-500" />
                            <span className="font-medium text-red-600 dark:text-red-500">
                              {asset.change_percent.toFixed(2)}%
                            </span>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PageTransition>
  );
}
