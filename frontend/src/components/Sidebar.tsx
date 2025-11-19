import { memo } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutGrid, Briefcase, TrendingUp, History, BarChart3, Settings } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

function SidebarComponent() {
  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutGrid },
    { path: '/portfolio', label: 'Portfolio', icon: Briefcase },
    { path: '/analysis', label: 'Market Analysis', icon: TrendingUp },
    { path: '/history', label: 'Trade History', icon: History },
    { path: '/backtesting', label: 'Backtesting', icon: BarChart3 },
    { path: '/settings', label: 'Agent Settings', icon: Settings },
  ];

  return (
    <div className="w-64 bg-white border-r border-slate-200 dark:bg-[#0a0f1e] dark:border-gray-800 h-screen flex flex-col">
      <div className="p-6 border-b border-slate-200 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-slate-900 dark:text-white font-semibold">OptiTrade</h1>
            <p className="text-slate-500 dark:text-gray-400 text-xs">AI Trading Agent</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4" role="navigation" aria-label="Main menu">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              aria-label={item.label}
              className={({ isActive }) =>
                `w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-800 hover:text-slate-900 dark:hover:text-white'
                }`
              }
            >
              <Icon className="w-5 h-5" aria-hidden="true" />
              <span className="text-sm font-medium">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-200 dark:border-gray-800 space-y-3">
        <ThemeToggle />
        <div className="bg-slate-100/80 dark:bg-gray-800/50 rounded-lg p-3 border border-slate-200 dark:border-gray-700">
          <div className="flex justify-between items-center mb-2">
            <span className="text-slate-500 dark:text-gray-400 text-xs">Agent Status</span>
            <span className="text-green-600 dark:text-green-500 text-xs font-semibold">Active</span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500 dark:text-gray-400">Model</span>
              <span className="text-slate-900 dark:text-white font-medium">PRO v1</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500 dark:text-gray-400">Uptime</span>
              <span className="text-slate-900 dark:text-white font-medium">47h 23m</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const Sidebar = memo(SidebarComponent);
export default Sidebar;
