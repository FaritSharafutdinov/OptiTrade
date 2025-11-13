import { useEffect, useState } from 'react';
import { DollarSign, TrendingUp, TrendingDown, PieChart, RefreshCw } from 'lucide-react';
import StatCard from '../components/StatCard';
import { useAuth } from '../components/AuthContext';
import { getPortfolio, getPortfolioAssets } from '../lib/portfolio';
import { PortfolioAsset, Portfolio } from '../lib/supabase';

export default function PortfolioPage() {
  const { user } = useAuth();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [assets, setAssets] = useState<PortfolioAsset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      try {
        const p = await getPortfolio(user.id);
        if (p) {
          setPortfolio(p);
          const a = await getPortfolioAssets(p.id);
          setAssets(a || []);
        }
      } catch (error) {
        console.error('Error loading portfolio:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user]);

  const displayAssets = [
    { symbol: 'BTC', name: 'Bitcoin', quantity: 0.5, value: 21625, change: 3.2, color: 'bg-orange-500' },
    { symbol: 'ETH', name: 'Ethereum', quantity: 5, value: 11400, change: -1.5, color: 'bg-purple-500' },
    { symbol: 'SOL', name: 'Solana', quantity: 50, value: 5115, change: 5.8, color: 'bg-cyan-500' },
    { symbol: 'AAPL', name: 'Apple Inc.', quantity: 100, value: 17825, change: 0.8, color: 'bg-gray-500' },
    { symbol: 'TSLA', name: 'Tesla Inc.', quantity: 50, value: 12140, change: -2.1, color: 'bg-red-500' },
  ];

  return (
    <div className="flex-1 bg-[#0a0f1e] p-8 overflow-auto">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-white text-3xl font-bold mb-2">Портфель</h1>
          <p className="text-gray-400">Управление активами и распределение капитала</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          Обновить
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Общая Стоимость"
          value={`$${(portfolio?.total_value || 10000).toLocaleString()}`}
          subtitle="+8.5% за 24ч"
          icon={DollarSign}
          trend="up"
        />
        <StatCard
          title="Количество Активов"
          value={assets.length || '5'}
          subtitle={`Crypto: 3 • Stocks: 2`}
          icon={PieChart}
        />
        <StatCard
          title="Нереализованная P&L"
          value="$1,247.50"
          subtitle="+2.4%"
          icon={TrendingUp}
          trend="up"
        />
        <StatCard
          title="Свободные Средства"
          value="$3,895.00"
          subtitle="22.2% от портфеля"
          icon={DollarSign}
        />
      </div>

      <div className="bg-[#141b2d] border border-gray-800 rounded-xl p-6">
        <div className="mb-6">
          <h2 className="text-white text-lg font-semibold mb-1">Активы в Портфеле</h2>
          <p className="text-gray-400 text-sm">Детальный обзор всех активов</p>
        </div>

        <div className="overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left py-4 px-4 text-gray-400 text-sm font-medium">Актив</th>
                <th className="text-right py-4 px-4 text-gray-400 text-sm font-medium">Количество</th>
                <th className="text-right py-4 px-4 text-gray-400 text-sm font-medium">Стоимость</th>
                <th className="text-right py-4 px-4 text-gray-400 text-sm font-medium">Изменение</th>
              </tr>
            </thead>
            <tbody>
              {displayAssets.map((asset) => (
                <tr key={asset.symbol} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                  <td className="py-5 px-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 ${asset.color} rounded-full flex items-center justify-center`}>
                        <span className="text-white font-bold text-sm">{asset.symbol[0]}</span>
                      </div>
                      <div>
                        <p className="text-white font-medium">{asset.symbol}</p>
                        <p className="text-gray-400 text-sm">{asset.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-5 px-4 text-right">
                    <p className="text-white font-medium">{asset.quantity}</p>
                  </td>
                  <td className="py-5 px-4 text-right">
                    <p className="text-white font-medium">${asset.value.toLocaleString()}</p>
                  </td>
                  <td className="py-5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {asset.change > 0 ? (
                        <>
                          <TrendingUp className="w-4 h-4 text-green-500" />
                          <span className="text-green-500 font-medium">+{asset.change}%</span>
                        </>
                      ) : (
                        <>
                          <TrendingDown className="w-4 h-4 text-red-500" />
                          <span className="text-red-500 font-medium">{asset.change}%</span>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
