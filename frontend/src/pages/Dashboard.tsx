import { useMemo } from 'react';
import { DollarSign, TrendingUp, Target, Zap, AlertTriangle, ArrowUpRight, Activity } from 'lucide-react';
import StatCard from '../components/StatCard';
import Skeleton from '../components/Skeleton';
import { useBotStatus, useRecentTrades } from '../lib/queries';
import type { TradeRecord } from '../lib/api';
import { useDashboardStore } from '../state/dashboardStore';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

function formatCurrency(value?: number | null) {
  if (typeof value !== 'number') return '—';
  return currencyFormatter.format(value);
}

function formatTimestamp(timestamp?: string) {
  if (!timestamp) return '—';
  return new Date(timestamp).toLocaleString('ru-RU', { hour12: false });
}

function tradeColor(action: string) {
  const normalized = action.toUpperCase();
  if (normalized === 'BUY') return 'text-green-400';
  if (normalized === 'SELL') return 'text-red-400';
  return 'text-gray-200';
}

export default function Dashboard() {
  const { data: botStatusQuery, isLoading: botLoading } = useBotStatus();
  const { data: recentTradesQuery, isLoading: tradesLoading } = useRecentTrades(5);
  const botStatus = useDashboardStore((state) => state.botStatus) ?? botStatusQuery ?? null;
  const tradesFromStore = useDashboardStore((state) => state.trades);

  const baseNotifications = useMemo(
    () => [
      {
        title: 'Высокая волатильность',
        description: 'BTC показывает +15% за час',
        icon: AlertTriangle,
        color: 'border-yellow-600 bg-yellow-600/10',
        iconColor: 'text-yellow-500',
      },
      {
        title: 'Прибыльная сделка',
        description: 'ETH продан с +$450',
        icon: ArrowUpRight,
        color: 'border-green-600 bg-green-600/10',
        iconColor: 'text-green-500',
      },
      {
        title: 'Новая позиция',
        description: 'Открыта длинная позиция SOL',
        icon: Activity,
        color: 'border-blue-600 bg-blue-600/10',
        iconColor: 'text-blue-500',
      },
    ],
    []
  );

  const notifications = useMemo(() => {
    if (botStatus?.last_action) {
      return [
        {
          title: `Последнее действие: ${botStatus.last_action.action}`,
          description: formatTimestamp(botStatus.last_action.timestamp),
          icon: Activity,
          color: 'border-blue-600 bg-blue-600/10',
          iconColor: 'text-blue-500',
        },
        ...baseNotifications,
      ];
    }
    return baseNotifications;
  }, [baseNotifications, botStatus?.last_action]);

  const trades: TradeRecord[] = tradesFromStore.length ? tradesFromStore : recentTradesQuery ?? [];

  return (
    <div className="flex-1 bg-[#0a0f1e] p-8 overflow-auto">
      <div className="mb-8">
        <h1 className="text-white text-3xl font-bold mb-2">Дашборд</h1>
        <p className="text-gray-400">Обзор торговой активности и производительности агента</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Текущий Баланс"
          value={formatCurrency(botStatus?.balance)}
          subtitle={botStatus?.mode ? `Режим: ${botStatus.mode}` : 'Режим не задан'}
          icon={DollarSign}
          trend="up"
          isLoading={botLoading}
        />
        <StatCard
          title="Реализованная Прибыль"
          value={formatCurrency(botStatus?.realized_pnl)}
          subtitle="Сумма закрытых сделок"
          icon={TrendingUp}
          trend={botStatus && botStatus.realized_pnl >= 0 ? 'up' : 'down'}
          isLoading={botLoading}
        />
        <StatCard
          title="Нереализованный P&L"
          value={formatCurrency(botStatus?.unrealized_pnl)}
          subtitle="Открытые позиции"
          icon={Target}
          trend={botStatus && botStatus.unrealized_pnl >= 0 ? 'up' : 'down'}
          isLoading={botLoading}
        />
        <StatCard
          title="Активные Позиции"
          value={botStatus ? `${botStatus.open_positions?.length ?? 0}` : '—'}
          subtitle={botStatus?.open_positions?.length ? 'Позиции контролируются' : 'Нет открытых позиций'}
          icon={Zap}
          isLoading={botLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-[#141b2d] border border-gray-800 rounded-xl p-6">
          <div className="mb-6">
            <h2 className="text-white text-lg font-semibold mb-1">Последние сделки</h2>
            <p className="text-gray-400 text-sm">Данные из FastAPI backend</p>
          </div>
          <div className="space-y-4">
            {tradesLoading &&
              Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="border border-gray-800 rounded-lg p-4">
                  <div className="flex justify-between mb-2">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            {!tradesLoading && trades.length === 0 && (
              <p className="text-gray-500 text-sm text-center py-4">Нет данных о сделках</p>
            )}
            {!tradesLoading &&
              trades.map((trade) => (
                <div key={trade.id} className="border border-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-white font-semibold">{trade.symbol}</p>
                      <p className="text-gray-500 text-sm">{formatTimestamp(trade.timestamp)}</p>
                    </div>
                    <p className={`text-sm font-semibold ${tradeColor(trade.action)}`}>{trade.action}</p>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                    <span>
                      Объём: <span className="text-white">{trade.size}</span>
                    </span>
                    <span>
                      Цена: <span className="text-white">{formatCurrency(trade.price)}</span>
                    </span>
                    {typeof trade.pnl === 'number' && (
                      <span>
                        P&L:{' '}
                        <span className={trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'}>
                          {formatCurrency(trade.pnl)}
                        </span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>

        <div className="bg-[#141b2d] border border-gray-800 rounded-xl p-6">
          <div className="mb-6">
            <h2 className="text-white text-lg font-semibold mb-1">Уведомления</h2>
            <p className="text-gray-400 text-sm">Текущие оповещения системы</p>
          </div>
          <div className="space-y-3">
            {notifications.map((notification, index) => {
              const Icon = notification.icon;
              return (
                <div
                  key={index}
                  className={`flex items-start gap-4 p-4 rounded-lg border ${notification.color}`}
                >
                  <div className="w-10 h-10 rounded-lg bg-gray-800/50 flex items-center justify-center">
                    <Icon className={`w-5 h-5 ${notification.iconColor}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-medium mb-1">{notification.title}</h3>
                    <p className="text-gray-400 text-sm">{notification.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
