import React from 'react';
import { cn } from '@/utils/cn';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: { value: number; label: string };
  className?: string;
  accent?: 'indigo' | 'teal' | 'green' | 'amber';
}

const accentConfig = {
  indigo: {
    icon: 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/30',
    bar:  'bg-gradient-to-r from-indigo-500 to-violet-600',
  },
  teal: {
    icon: 'bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-md shadow-teal-500/30',
    bar:  'bg-gradient-to-r from-teal-500 to-emerald-600',
  },
  green: {
    icon: 'bg-gradient-to-br from-green-500 to-emerald-500 text-white shadow-md shadow-green-500/30',
    bar:  'bg-gradient-to-r from-green-500 to-emerald-500',
  },
  amber: {
    icon: 'bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/30',
    bar:  'bg-gradient-to-r from-amber-500 to-orange-500',
  },
};

export function StatCard({ title, value, icon, trend, className, accent = 'indigo' }: StatCardProps) {
  const cfg = accentConfig[accent];
  const trendPositive = trend && trend.value > 0;
  const trendNeutral  = trend && trend.value === 0;

  return (
    <div className={cn(
      'card p-5 overflow-hidden relative group',
      'hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300',
      className
    )}>
      {/* Subtle gradient shimmer in corner */}
      <div className={cn('absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-10 blur-xl', cfg.bar)} />

      <div className="flex items-start justify-between mb-3 relative">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{title}</p>
        {icon && (
          <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', cfg.icon)}>
            {icon}
          </div>
        )}
      </div>

      <div className="text-2xl font-bold text-[#0F172A] dark:text-slate-100 tracking-tight relative">
        {value}
      </div>

      {trend && (
        <div className={cn(
          'flex items-center gap-1 mt-2 text-xs font-medium',
          trendNeutral ? 'text-slate-400' : trendPositive ? 'text-green-600 dark:text-green-400' : 'text-red-500'
        )}>
          {trendNeutral
            ? <Minus className="w-3 h-3" />
            : trendPositive
            ? <TrendingUp className="w-3 h-3" />
            : <TrendingDown className="w-3 h-3" />}
          <span>{trend.label}</span>
        </div>
      )}

      {/* Bottom accent line */}
      <div className={cn('absolute bottom-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300', cfg.bar)} />
    </div>
  );
}
