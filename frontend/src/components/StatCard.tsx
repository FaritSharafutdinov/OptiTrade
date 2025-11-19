import { memo } from 'react';
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
  const trendColor = trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-blue-500';
  return (
    <div className="bg-[#141b2d] border border-gray-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-gray-400 text-sm font-medium">{title}</h3>
        <Icon className={`w-5 h-5 ${trendColor}`} />
      </div>
      <div className="mb-2 min-h-[32px]">
        {isLoading ? <Skeleton className="h-7 w-24" /> : <p className="text-white text-2xl font-semibold">{value}</p>}
      </div>
      <div className="min-h-[20px]">
        {isLoading ? (
          <Skeleton className="h-4 w-32" />
        ) : (
          <p className={`text-sm ${trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-gray-400'}`}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}

const StatCard = memo(StatCardComponent);
export default StatCard;
