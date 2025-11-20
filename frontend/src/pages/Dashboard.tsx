import { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  DollarSign,
  TrendingUp,
  Target,
  Zap,
  AlertTriangle,
  ArrowUpRight,
  Activity,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  Legend,
} from 'recharts';
import StatCard from '../components/StatCard';
import Skeleton from '../components/Skeleton';
import { useDashboardData } from '../lib/queries';
import PageTransition from '../components/PageTransition';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

/** Format currency values in USD */
function formatCurrency(value?: number | null) {
  if (typeof value !== 'number') return '—';
  return currencyFormatter.format(value);
}

function getNotificationIcon(type: 'warning' | 'success' | 'info') {
  switch (type) {
    case 'warning':
      return AlertTriangle;
    case 'success':
      return ArrowUpRight;
    case 'info':
      return Activity;
    default:
      return Activity;
  }
}

function getNotificationColor(type: 'warning' | 'success' | 'info') {
  switch (type) {
    case 'warning':
      return { border: 'border-yellow-600 bg-yellow-600/10', icon: 'text-yellow-500' };
    case 'success':
      return { border: 'border-green-600 bg-green-600/10', icon: 'text-green-500' };
    case 'info':
      return { border: 'border-blue-600 bg-blue-600/10', icon: 'text-blue-500' };
    default:
      return { border: 'border-blue-600 bg-blue-600/10', icon: 'text-blue-500' };
  }
}

export default function Dashboard() {
  const { data: dashboardData, isLoading, error } = useDashboardData();
  const prefersReducedMotion = useReducedMotion();

  // Log errors for debugging
  if (error) {
    console.error('[Dashboard] Error loading data:', error);
  }

  const balanceHistory = useMemo(() => {
    if (!dashboardData) return [];
    const from = dashboardData.chart_balance.from;
    const to = dashboardData.chart_balance.to;
    const diff = to - from;
    return Array.from({ length: 14 }).map((_, index) => ({
      day: `Day ${index + 1}`,
      value: from + (diff / 13) * index + Math.sin(index / 2) * (diff * 0.1),
    }));
  }, [dashboardData]);

  const profitBreakdown = useMemo(() => {
    if (!dashboardData) return [];
    return [
      { name: 'Profit', profit: dashboardData.chart_pnl?.profit ?? 0 },
      { name: 'Loss', profit: -(dashboardData.chart_pnl?.loss ?? 0) },
    ];
  }, [dashboardData]);

  const notifications = useMemo(() => {
    if (!dashboardData?.notifications) return [];
    return dashboardData.notifications.map((notif) => {
      const Icon = getNotificationIcon(notif.type);
      const colors = getNotificationColor(notif.type);
      return {
        title: notif.text.split(':')[0] || notif.text,
        description: notif.text.split(':').slice(1).join(':').trim() || notif.text,
        icon: Icon,
        color: colors.border,
        iconColor: colors.icon,
      };
    });
  }, [dashboardData?.notifications]);

  const statCards = useMemo(
    () => [
      {
        key: 'balance',
        title: 'Current Balance',
        value: formatCurrency(dashboardData?.balance),
        subtitle: dashboardData?.status === 'active' ? 'Bot is running' : 'Bot is stopped',
        icon: DollarSign,
        trend: 'up' as const,
        isLoading: isLoading,
      },
      {
        key: 'total_pnl',
        title: 'Total P&L',
        value: formatCurrency(dashboardData?.total_pnl),
        subtitle: `Win rate: ${dashboardData?.win_rate.toFixed(1) ?? 0}%`,
        icon: TrendingUp,
        trend: dashboardData && dashboardData.total_pnl >= 0 ? ('up' as const) : ('down' as const),
        isLoading: isLoading,
      },
      {
        key: 'trades',
        title: 'Total Trades',
        value: dashboardData ? `${dashboardData.total_trades}` : '—',
        subtitle: `${dashboardData?.active_positions ?? 0} active positions`,
        icon: Target,
        trend: undefined,
        isLoading: isLoading,
      },
      {
        key: 'model',
        title: 'Model',
        value: dashboardData?.model ?? '—',
        subtitle: `Uptime: ${dashboardData?.uptime ?? '—'}`,
        icon: Zap,
        trend: undefined,
        isLoading: isLoading,
      },
    ],
    [isLoading, dashboardData]
  );

  const gridVariants = prefersReducedMotion
    ? undefined
    : {
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: { staggerChildren: 0.08, delayChildren: 0.05 },
        },
      };

  const cardVariants = prefersReducedMotion
    ? undefined
    : {
        hidden: { opacity: 0, y: 24 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.45, ease: 'easeOut' as const },
        },
      };

  return (
    <PageTransition className="flex-1 bg-slate-50 p-8 overflow-auto dark:bg-[#0a0f1e]">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2 dark:text-white">Dashboard</h1>
        <p className="text-slate-500 dark:text-gray-400">
          Overview of trading activity and agent performance
        </p>
      </div>

      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        variants={gridVariants}
        initial={prefersReducedMotion ? undefined : 'hidden'}
        animate={prefersReducedMotion ? undefined : 'visible'}
      >
        {statCards.map((card) => (
          <motion.div key={card.key} variants={cardVariants}>
            <StatCard
              title={card.title}
              value={card.value}
              subtitle={card.subtitle}
              icon={card.icon}
              trend={card.trend}
              isLoading={card.isLoading}
            />
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <motion.section
          className="bg-white border border-slate-200 rounded-xl p-6 dark:bg-[#141b2d] dark:border-gray-800"
          initial={prefersReducedMotion ? undefined : { opacity: 0, y: 26 }}
          animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
          transition={prefersReducedMotion ? undefined : { duration: 0.45, delay: 0.15 }}
        >
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-1 dark:text-white">
              Balance Chart
            </h2>
            <p className="text-sm text-slate-500 dark:text-gray-400">
              {dashboardData
                ? `From ${formatCurrency(dashboardData.chart_balance.from)} to ${formatCurrency(dashboardData.chart_balance.to)}`
                : 'Loading chart data...'}
            </p>
          </div>
          <div className="h-64">
            {isLoading ? (
              <div className="flex h-full items-center justify-center">
                <Skeleton className="h-10 w-32" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={balanceHistory}>
                  <defs>
                    <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" stroke="#4b5563" />
                  <YAxis stroke="#4b5563" />
                  <CartesianGrid strokeDasharray="4 4" stroke="#1f2937" />
                  <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none' }} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#60a5fa"
                    fillOpacity={1}
                    fill="url(#balanceGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.section>

        <motion.section
          className="bg-white border border-slate-200 rounded-xl p-6 dark:bg-[#141b2d] dark:border-gray-800"
          initial={prefersReducedMotion ? undefined : { opacity: 0, y: 26 }}
          animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
          transition={prefersReducedMotion ? undefined : { duration: 0.45, delay: 0.25 }}
        >
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-1 dark:text-white">
              P&L Breakdown
            </h2>
            <p className="text-sm text-slate-500 dark:text-gray-400">
              {dashboardData?.chart_pnl
                ? `Profit: ${formatCurrency(dashboardData.chart_pnl.profit ?? 0)} | Loss: ${formatCurrency(dashboardData.chart_pnl.loss ?? 0)}`
                : 'Loading P&L data...'}
            </p>
          </div>
          <div className="h-64">
            {isLoading ? (
              <div className="flex h-full items-center justify-center">
                <Skeleton className="h-10 w-32" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={profitBreakdown}>
                  <CartesianGrid strokeDasharray="4 4" stroke="#1f2937" />
                  <XAxis dataKey="name" stroke="#4b5563" />
                  <YAxis stroke="#4b5563" />
                  <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none' }} />
                  <Legend />
                  <Bar
                    dataKey="profit"
                    fill={profitBreakdown[0]?.profit >= 0 ? '#34d399' : '#ef4444'}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.section>
      </div>

      <motion.section
        className="bg-white border border-slate-200 rounded-xl p-6 dark:bg-[#141b2d] dark:border-gray-800"
        initial={prefersReducedMotion ? undefined : { opacity: 0, y: 26 }}
        animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
        transition={prefersReducedMotion ? undefined : { duration: 0.45, delay: 0.35 }}
      >
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-1 dark:text-white">
            Notifications
          </h2>
          <p className="text-sm text-slate-500 dark:text-gray-400">
            {dashboardData ? `${notifications.length} active alerts` : 'Loading notifications...'}
          </p>
        </div>
        <div className="space-y-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-4 rounded-lg border border-slate-200 dark:border-gray-800">
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-3 w-48" />
              </div>
            ))
          ) : notifications.length === 0 ? (
            <p className="text-slate-500 dark:text-gray-400 text-center py-4">No notifications</p>
          ) : (
            notifications.map((notification, index) => {
              const Icon = notification.icon;
              return (
                <motion.div
                  key={index}
                  className={`flex items-start gap-4 p-4 rounded-lg border ${notification.color}`}
                  initial={prefersReducedMotion ? undefined : { opacity: 0, x: -20 }}
                  animate={prefersReducedMotion ? undefined : { opacity: 1, x: 0 }}
                  transition={
                    prefersReducedMotion ? undefined : { duration: 0.4, delay: 0.4 + index * 0.05 }
                  }
                  whileHover={prefersReducedMotion ? undefined : { x: 4, borderColor: '#38bdf8' }}
                >
                  <div className="w-10 h-10 rounded-lg bg-slate-200 flex items-center justify-center dark:bg-gray-800/50">
                    <Icon className={`w-5 h-5 ${notification.iconColor}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-slate-900 mb-1 dark:text-white">
                      {notification.title}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-gray-400">
                      {notification.description}
                    </p>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </motion.section>
    </PageTransition>
  );
}
