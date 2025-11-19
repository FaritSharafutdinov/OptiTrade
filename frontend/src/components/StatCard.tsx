import { memo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import Skeleton from './Skeleton';

/**
 * Displays a small summary card with value/description.
 */
interface StatCardProps {
  /** Label displayed at the top of the card */
  title: string;
  /** Main numeric/string value */
  value: string;
  /** Secondary description */
  subtitle: string;
  /** Icon rendered in the header */
  icon: LucideIcon;
  /** Visual trend indicator */
  trend?: 'up' | 'down';
  /** When true, shows skeleton loaders */
  isLoading?: boolean;
}

function StatCardComponent({ title, value, subtitle, icon: Icon, trend, isLoading = false }: StatCardProps) {
  const prefersReducedMotion = useReducedMotion();
  const trendColor = trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-blue-500';
  const motionProps = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.35 },
        whileHover: {
          y: -4,
          borderColor: '#2563eb',
          boxShadow: '0 25px 60px rgba(37, 99, 235, 0.18)',
        },
        whileTap: { scale: 0.98 },
      };

  return (
    <motion.div
      className="bg-white border border-slate-200 rounded-xl p-6 dark:bg-[#141b2d] dark:border-gray-800"
      {...motionProps}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-slate-500 text-sm font-medium dark:text-gray-400">{title}</h3>
        <Icon className={`w-5 h-5 ${trendColor}`} />
      </div>
      <div className="mb-2 min-h-[32px]">
        {isLoading ? (
          <Skeleton className="h-7 w-24" />
        ) : (
          <p className="text-slate-900 text-2xl font-semibold dark:text-white">{value}</p>
        )}
      </div>
      <div className="min-h-[20px]">
        {isLoading ? (
          <Skeleton className="h-4 w-32" />
        ) : (
          <p
            className={`text-sm ${
              trend === 'up'
                ? 'text-green-600 dark:text-green-500'
                : trend === 'down'
                  ? 'text-red-600 dark:text-red-500'
                  : 'text-slate-500 dark:text-gray-400'
            }`}
          >
            {subtitle}
          </p>
        )}
      </div>
    </motion.div>
  );
}

const StatCard = memo(StatCardComponent);
export default StatCard;
