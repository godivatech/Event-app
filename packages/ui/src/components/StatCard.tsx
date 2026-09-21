import React from 'react';
import { cn } from '../utils/cn';
import { Card } from './Card';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  variant?: 'default' | 'primary' | 'accent' | 'success';
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  variant = 'default',
  className,
}) => {
  const iconVariantStyles = {
    default: 'bg-slate-100 text-slate-700',
    primary: 'bg-[#08537B]/10 text-[#08537B]',
    accent: 'bg-[#EE8518]/10 text-[#EE8518]',
    success: 'bg-emerald-50 text-emerald-600',
  };

  return (
    <Card className={cn('p-5 flex flex-col justify-between', className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</span>
        {icon && (
          <div className={cn('w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0', iconVariantStyles[variant])}>
            {icon}
          </div>
        )}
      </div>
      <div className="mt-3">
        <div className="text-2xl font-bold text-slate-900 tracking-tight">{value}</div>
        {(subtitle || trend) && (
          <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
            {trend && (
              <span className={cn('font-semibold', trend.isPositive ? 'text-emerald-600' : 'text-rose-600')}>
                {trend.value}
              </span>
            )}
            {subtitle && <span>{subtitle}</span>}
          </div>
        )}
      </div>
    </Card>
  );
};
