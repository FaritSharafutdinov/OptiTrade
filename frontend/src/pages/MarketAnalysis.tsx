import { TrendingUp, ArrowUpRight, ArrowDownRight, Activity, DollarSign } from 'lucide-react';
import PageTransition from '../components/PageTransition';
import { useMarketAnalysis } from '../lib/queries';
import Skeleton from '../components/Skeleton';

function getSignalColor(type: string) {
  switch (type) {
    case 'bullish':
      return {
        border: 'border-green-200 bg-green-50 dark:border-green-600 dark:bg-green-600/10',
        iconBg: 'bg-green-100 dark:bg-green-600/20',
        icon: 'text-green-600 dark:text-green-500',
      };
    case 'volatility':
      return {
        border: 'border-yellow-200 bg-yellow-50 dark:border-yellow-600 dark:bg-yellow-600/10',
        iconBg: 'bg-yellow-100 dark:bg-yellow-600/20',
        icon: 'text-yellow-500',
      };
    case 'entry':
      return {
        border: 'border-blue-200 bg-blue-50 dark:border-blue-600 dark:bg-blue-600/10',
        iconBg: 'bg-blue-100 dark:bg-blue-600/20',
        icon: 'text-blue-500',
      };
    default:
      return {
        border: 'border-blue-200 bg-blue-50 dark:border-blue-600 dark:bg-blue-600/10',
        iconBg: 'bg-blue-100 dark:bg-blue-600/20',
        icon: 'text-blue-500',
      };
  }
}

function getSignalIcon(type: string) {
  switch (type) {
    case 'bullish':
      return ArrowUpRight;
    case 'volatility':
      return Activity;
    case 'entry':
      return TrendingUp;
    default:
      return Activity;
  }
}

export default function MarketAnalysis() {
  const { data: marketData, isLoading } = useMarketAnalysis();

  return (
    <PageTransition className="flex-1 bg-slate-50 p-8 overflow-auto dark:bg-[#0a0f1e]">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2 dark:text-white">Market Analysis</h1>
        <p className="text-slate-500 dark:text-gray-400">Market data monitoring and trading opportunities</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white border border-slate-200 rounded-xl p-6 dark:bg-[#141b2d] dark:border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-500 dark:text-gray-400">Market Cap</h3>
            <DollarSign className="w-5 h-5 text-blue-500" />
          </div>
          {isLoading ? (
            <Skeleton className="h-8 w-32 mb-2" />
          ) : (
            <>
              <p className="text-2xl font-semibold text-slate-900 mb-2 dark:text-white">
                {marketData?.market_cap || '$2.45T'}
              </p>
              <p className="text-sm text-green-600 dark:text-green-500">
                +{marketData?.market_cap_change || 3.2}% in 24h
              </p>
            </>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 dark:bg-[#141b2d] dark:border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-500 dark:text-gray-400">24h Trading Volume</h3>
            <Activity className="w-5 h-5 text-green-500" />
          </div>
          {isLoading ? (
            <Skeleton className="h-8 w-32 mb-2" />
          ) : (
            <>
              <p className="text-2xl font-semibold text-slate-900 mb-2 dark:text-white">
                {marketData?.trading_volume_24h || '$156.8B'}
              </p>
              <p className="text-sm text-green-600 dark:text-green-500">
                +{marketData?.trading_volume_change || 12.5}% in 24h
              </p>
            </>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 dark:bg-[#141b2d] dark:border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-500 dark:text-gray-400">BTC Dominance</h3>
            <TrendingUp className="w-5 h-5 text-orange-500" />
          </div>
          {isLoading ? (
            <Skeleton className="h-8 w-32 mb-2" />
          ) : (
            <>
              <p className="text-2xl font-semibold text-slate-900 mb-2 dark:text-white">
                {marketData?.btc_dominance || 52.3}%
              </p>
              <p className={`text-sm ${(marketData?.btc_dominance_change || -0.8) >= 0 ? 'text-green-600 dark:text-green-500' : 'text-slate-500 dark:text-gray-400'}`}>
                {(marketData?.btc_dominance_change || -0.8) >= 0 ? '+' : ''}
                {marketData?.btc_dominance_change || -0.8}% in 24h
              </p>
            </>
          )}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 dark:bg-[#141b2d] dark:border-gray-800">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-1 dark:text-white">Top Assets</h2>
          <p className="text-sm text-slate-500 dark:text-gray-400">Current prices and changes</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(marketData?.assets || []).map((asset) => (
              <div
                key={asset.symbol}
                className="rounded-lg border border-slate-200 bg-slate-50 p-5 transition-colors hover:bg-slate-100 dark:border-gray-700 dark:bg-gray-800/40 dark:hover:bg-gray-800/60"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-lg font-semibold text-slate-900 mb-1 dark:text-white">{asset.symbol}</p>
                    <p className="text-sm text-slate-500 dark:text-gray-400">Vol: {asset.volume}</p>
                  </div>
                  {asset.trend === 'up' ? (
                    <ArrowUpRight className="w-5 h-5 text-green-500" />
                  ) : (
                    <ArrowDownRight className="w-5 h-5 text-red-500" />
                  )}
                </div>
                <div className="flex justify-between items-end">
                  <p className="text-xl font-bold text-slate-900 dark:text-white">
                    ${asset.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </p>
                  <p
                    className={`text-sm font-medium ${
                      asset.change > 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'
                    }`}
                  >
                    {asset.change > 0 ? '+' : ''}
                    {asset.change}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 bg-white border border-slate-200 rounded-xl p-6 dark:bg-[#141b2d] dark:border-gray-800">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-1 dark:text-white">Market Signals</h2>
          <p className="text-sm text-slate-500 dark:text-gray-400">AI analysis of trading opportunities</p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {(marketData?.signals || []).map((signal, index) => {
              const colors = getSignalColor(signal.type);
              const Icon = getSignalIcon(signal.type);
              return (
                <div key={index} className={`flex items-start gap-4 p-4 rounded-lg border ${colors.border}`}>
                  <div className={`w-10 h-10 rounded-lg ${colors.iconBg} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${colors.icon}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-slate-900 mb-1 dark:text-white">{signal.title}</h3>
                    <p className="text-sm text-slate-500 dark:text-gray-400">{signal.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
