import React from 'react';
import { cn } from '../utils/cn';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  size?: 'sm' | 'md';
  subtle?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'neutral',
  size = 'md',
  subtle = true,
  children,
  ...props
}) => {
  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs font-semibold',
    md: 'px-2.5 py-1 text-xs font-semibold',
  };

  const subtleVariantStyles = {
    primary: 'bg-[#08537B]/10 text-[#08537B] border border-[#08537B]/20',
    accent: 'bg-[#EE8518]/10 text-[#ab4e10] border border-[#EE8518]/20',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border border-rose-200',
    info: 'bg-sky-50 text-sky-700 border border-sky-200',
    neutral: 'bg-slate-100 text-slate-700 border border-slate-200',
  };

  const solidVariantStyles = {
    primary: 'bg-[#08537B] text-white',
    accent: 'bg-[#EE8518] text-white',
    success: 'bg-emerald-600 text-white',
    warning: 'bg-amber-500 text-white',
    danger: 'bg-rose-600 text-white',
    info: 'bg-sky-600 text-white',
    neutral: 'bg-slate-700 text-white',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium tracking-wide uppercase',
        sizeStyles[size],
        subtle ? subtleVariantStyles[variant] : solidVariantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
