import { LayoutGrid, Briefcase, TrendingUp, History, BarChart3, Settings } from 'lucide-react';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export default function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Дашборд', icon: LayoutGrid },
    { id: 'portfolio', label: 'Портфель', icon: Briefcase },
    { id: 'analysis', label: 'Анализ Рынка', icon: TrendingUp },
    { id: 'history', label: 'История Торгов', icon: History },
    { id: 'backtesting', label: 'Бэктестинг', icon: BarChart3 },
    { id: 'settings', label: 'Настройки Агента', icon: Settings },
  ];

  return (
    <div className="w-64 bg-[#0a0f1e] border-r border-gray-800 h-screen flex flex-col">
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-white font-semibold">OptiTrade</h1>
            <p className="text-gray-400 text-xs">AI Trading Agent</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-all ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <div className="bg-gray-800/50 rounded-lg p-3">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-400 text-xs">Статус Агента</span>
            <span className="text-green-500 text-xs font-semibold">Активен</span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Модель</span>
              <span className="text-white">PRO v1</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Uptime</span>
              <span className="text-white">47ч 23м</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
