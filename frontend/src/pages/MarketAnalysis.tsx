import { TrendingUp, ArrowUpRight, ArrowDownRight, Activity, DollarSign } from 'lucide-react';

export default function MarketAnalysis() {
  const marketData = [
    { symbol: 'BTC/USD', price: 43250, change: 5.2, volume: '28.5B', trend: 'up' },
    { symbol: 'ETH/USD', price: 2280, change: -2.1, volume: '12.3B', trend: 'down' },
    { symbol: 'SOL/USD', price: 102.3, change: 8.5, volume: '2.1B', trend: 'up' },
    { symbol: 'AAPL', price: 178.25, change: 1.2, volume: '45.2B', trend: 'up' },
    { symbol: 'TSLA', price: 242.8, change: -3.4, volume: '32.8B', trend: 'down' },
    { symbol: 'NVDA', price: 495.2, change: 4.7, volume: '38.5B', trend: 'up' },
  ];

  return (
    <div className="flex-1 bg-[#0a0f1e] p-8 overflow-auto">
      <div className="mb-8">
        <h1 className="text-white text-3xl font-bold mb-2">Анализ Рынка</h1>
        <p className="text-gray-400">Мониторинг рыночных данных и торговых возможностей</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-[#141b2d] border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-400 text-sm font-medium">Рыночная Капитализация</h3>
            <DollarSign className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-white text-2xl font-semibold mb-2">$2.45T</p>
          <p className="text-green-500 text-sm">+3.2% за 24ч</p>
        </div>

        <div className="bg-[#141b2d] border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-400 text-sm font-medium">Объем Торгов 24ч</h3>
            <Activity className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-white text-2xl font-semibold mb-2">$156.8B</p>
          <p className="text-green-500 text-sm">+12.5% за 24ч</p>
        </div>

        <div className="bg-[#141b2d] border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-400 text-sm font-medium">BTC Доминация</h3>
            <TrendingUp className="w-5 h-5 text-orange-500" />
          </div>
          <p className="text-white text-2xl font-semibold mb-2">52.3%</p>
          <p className="text-gray-400 text-sm">-0.8% за 24ч</p>
        </div>
      </div>

      <div className="bg-[#141b2d] border border-gray-800 rounded-xl p-6">
        <div className="mb-6">
          <h2 className="text-white text-lg font-semibold mb-1">Топ Активы</h2>
          <p className="text-gray-400 text-sm">Актуальные цены и изменения</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {marketData.map((asset) => (
            <div
              key={asset.symbol}
              className="bg-gray-800/30 border border-gray-700 rounded-lg p-5 hover:bg-gray-800/50 transition-colors"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-white font-semibold text-lg mb-1">{asset.symbol}</p>
                  <p className="text-gray-400 text-sm">Vol: {asset.volume}</p>
                </div>
                {asset.trend === 'up' ? (
                  <ArrowUpRight className="w-5 h-5 text-green-500" />
                ) : (
                  <ArrowDownRight className="w-5 h-5 text-red-500" />
                )}
              </div>
              <div className="flex justify-between items-end">
                <p className="text-white text-xl font-bold">${asset.price.toLocaleString()}</p>
                <p className={`text-sm font-medium ${asset.change > 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {asset.change > 0 ? '+' : ''}{asset.change}%
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 bg-[#141b2d] border border-gray-800 rounded-xl p-6">
        <div className="mb-6">
          <h2 className="text-white text-lg font-semibold mb-1">Рыночные Сигналы</h2>
          <p className="text-gray-400 text-sm">AI-анализ торговых возможностей</p>
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-4 p-4 rounded-lg border border-green-600 bg-green-600/10">
            <div className="w-10 h-10 rounded-lg bg-green-600/20 flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5 text-green-500" />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-medium mb-1">Сильный бычий сигнал</h3>
              <p className="text-gray-400 text-sm">SOL показывает восходящий тренд с высокой вероятностью продолжения роста (87%)</p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 rounded-lg border border-yellow-600 bg-yellow-600/10">
            <div className="w-10 h-10 rounded-lg bg-yellow-600/20 flex items-center justify-center">
              <Activity className="w-5 h-5 text-yellow-500" />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-medium mb-1">Повышенная волатильность</h3>
              <p className="text-gray-400 text-sm">BTC входит в зону высокой волатильности - рекомендуется осторожность</p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 rounded-lg border border-blue-600 bg-blue-600/10">
            <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-500" />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-medium mb-1">Возможность входа</h3>
              <p className="text-gray-400 text-sm">ETH достиг уровня поддержки - потенциальная точка входа для длинной позиции</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
