import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: LucideIcon;
  trend?: 'up' | 'down';
}

export default function StatCard({ title, value, subtitle, icon: Icon, trend }: StatCardProps) {
  return (
    <div className="bg-[#141b2d] border border-gray-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-gray-400 text-sm font-medium">{title}</h3>
        <Icon className={`w-5 h-5 ${trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-blue-500'}`} />
      </div>
      <div className="mb-2">
        <p className="text-white text-2xl font-semibold">{value}</p>
      </div>
      <p className={`text-sm ${trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-gray-400'}`}>
        {subtitle}
      </p>
    </div>
  );
}
