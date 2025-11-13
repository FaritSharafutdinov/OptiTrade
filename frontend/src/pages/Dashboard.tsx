import { DollarSign, TrendingUp, Target, Zap, AlertTriangle, ArrowUpRight, Activity } from 'lucide-react';
import StatCard from '../components/StatCard';

export default function Dashboard() {
  const notifications = [
    {
      type: 'warning',
      title: 'Высокая волатильность',
      description: 'BTC показывает +15% за час',
      icon: AlertTriangle,
      color: 'border-yellow-600 bg-yellow-600/10',
      iconColor: 'text-yellow-500',
    },
    {
      type: 'success',
      title: 'Прибыльная сделка',
      description: 'ETH продан с +$450',
      icon: ArrowUpRight,
      color: 'border-green-600 bg-green-600/10',
      iconColor: 'text-green-500',
    },
    {
      type: 'info',
      title: 'Новая позиция',
      description: 'Открыта длинная позиция SOL',
      icon: Activity,
      color: 'border-blue-600 bg-blue-600/10',
      iconColor: 'text-blue-500',
    },
  ];

  return (
    <div className="flex-1 bg-[#0a0f1e] p-8 overflow-auto">
      <div className="mb-8">
        <h1 className="text-white text-3xl font-bold mb-2">Дашборд</h1>
        <p className="text-gray-400">Обзор торговой активности и производительности агента</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Текущий Баланс"
          value="$17,500.00"
          subtitle="+75.05% за период"
          icon={DollarSign}
          trend="up"
        />
        <StatCard
          title="Общая Прибыль"
          value="$7,500.00"
          subtitle="+12.3% за неделю"
          icon={TrendingUp}
          trend="up"
        />
        <StatCard
          title="Win Rate"
          value="68.4%"
          subtitle="127 успешных из 186"
          icon={Target}
        />
        <StatCard
          title="Активные Позиции"
          value="5"
          subtitle="BTC, ETH, SOL, AAPL, TSLA"
          icon={Zap}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-[#141b2d] border border-gray-800 rounded-xl p-6">
          <div className="mb-6">
            <h2 className="text-white text-lg font-semibold mb-1">Динамика Баланса</h2>
            <p className="text-gray-400 text-sm">Изменение баланса портфеля за последние 45 дней</p>
          </div>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <TrendingUp className="w-16 h-16 text-blue-500 mx-auto mb-4" />
              <p className="text-gray-400 text-sm mb-2">График баланса</p>
              <p className="text-white font-semibold">$10,000 → $17,500</p>
            </div>
          </div>
        </div>

        <div className="bg-[#141b2d] border border-gray-800 rounded-xl p-6">
          <div className="mb-6">
            <h2 className="text-white text-lg font-semibold mb-1">Прибыль и Убытки</h2>
            <p className="text-gray-400 text-sm">Сравнение прибыльных и убыточных сделок</p>
          </div>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Activity className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <p className="text-gray-400 text-sm mb-2">График прибыли/убытков</p>
              <div className="flex gap-6 justify-center">
                <div>
                  <p className="text-green-500 font-semibold">Прибыль</p>
                  <p className="text-white text-xl">$9,200</p>
                </div>
                <div>
                  <p className="text-red-500 font-semibold">Убыток</p>
                  <p className="text-white text-xl">$1,700</p>
                </div>
              </div>
            </div>
          </div>
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
                <div className={`w-10 h-10 rounded-lg bg-gray-800/50 flex items-center justify-center`}>
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
  );
}
