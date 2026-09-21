import React from 'react';
import { cn } from '../utils/cn';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'elevated' | 'bordered' | 'flat';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  className,
  variant = 'bordered',
  padding = 'md',
  children,
  ...props
}) => {
  const variantStyles = {
    bordered: 'bg-white border border-slate-200 shadow-sm',
    elevated: 'bg-white border border-slate-100 shadow-md',
    flat: 'bg-slate-50 border-0',
  };

  const paddingStyles = {
    none: 'p-0',
    sm: 'p-3 sm:p-4',
    md: 'p-4 sm:p-6',
    lg: 'p-6 sm:p-8',
  };

  return (
    <div
      className={cn(
        'rounded-[14px] overflow-hidden transition-all',
        variantStyles[variant],
        paddingStyles[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
