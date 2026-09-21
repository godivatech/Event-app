import React from 'react';
import {
  CheckCircle,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  ShieldAlert,
  HelpCircle,
} from 'lucide-react';
import { cn } from '../utils/cn';

export type DomainStatus =
  | 'CONFIRMED'
  | 'PENDING'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'PAYMENT_EXCEPTION'
  | 'CAPTURED'
  | 'CREATED'
  | 'FAILED'
  | 'REFUNDED'
  | 'ACTIVE'
  | 'USED'
  | 'SUSPENDED'
  | 'SUCCESS'
  | 'ADMITTED'
  | 'ALREADY_USED'
  | 'GATE_MISMATCH'
  | 'INVALID'
  | string;

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: DomainStatus;
  size?: 'sm' | 'md';
  showIcon?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showIcon = true,
  className,
  ...props
}) => {
  const normalized = (status || '').toUpperCase();

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[11px] gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
  };

  const iconSizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
  };

  const iconClass = iconSizeClasses[size];

  let config = {
    label: normalized || 'UNKNOWN',
    bg: 'bg-gray-100',
    border: 'border-gray-200',
    text: 'text-gray-700',
    icon: <HelpCircle className={cn(iconClass, 'text-gray-500')} />,
  };

  switch (normalized) {
    case 'CONFIRMED':
    case 'CAPTURED':
    case 'ACTIVE':
    case 'SUCCESS':
    case 'ADMITTED':
      config = {
        label: normalized === 'ADMITTED' || normalized === 'SUCCESS' ? 'ADMITTED' : normalized,
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        text: 'text-emerald-700',
        icon: <CheckCircle className={cn(iconClass, 'text-emerald-600')} />,
      };
      break;

    case 'PENDING':
    case 'CREATED':
      config = {
        label: normalized,
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-700',
        icon: <Clock className={cn(iconClass, 'text-blue-600')} />,
      };
      break;

    case 'USED':
      config = {
        label: 'USED / ADMITTED',
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-700',
        icon: <Clock className={cn(iconClass, 'text-blue-600')} />,
      };
      break;

    case 'CANCELLED':
    case 'FAILED':
    case 'INVALID':
      config = {
        label: normalized,
        bg: 'bg-rose-50',
        border: 'border-rose-200',
        text: 'text-rose-700',
        icon: <XCircle className={cn(iconClass, 'text-rose-600')} />,
      };
      break;

    case 'PAYMENT_EXCEPTION':
    case 'SUSPENDED':
    case 'ALREADY_USED':
      config = {
        label: normalized === 'PAYMENT_EXCEPTION' ? 'EXCEPTION' : normalized === 'ALREADY_USED' ? 'ALREADY USED' : normalized,
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        text: 'text-amber-700',
        icon: <AlertTriangle className={cn(iconClass, 'text-amber-600')} />,
      };
      break;

    case 'GATE_MISMATCH':
      config = {
        label: 'GATE MISMATCH',
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        text: 'text-amber-700',
        icon: <ShieldAlert className={cn(iconClass, 'text-amber-600')} />,
      };
      break;

    case 'REFUNDED':
      config = {
        label: 'REFUNDED',
        bg: 'bg-purple-50',
        border: 'border-purple-200',
        text: 'text-purple-700',
        icon: <RotateCcwIcon className={cn(iconClass, 'text-purple-600')} />,
      };
      break;

    case 'EXPIRED':
      config = {
        label: 'EXPIRED',
        bg: 'bg-gray-100',
        border: 'border-gray-200',
        text: 'text-gray-600',
        icon: <Clock className={cn(iconClass, 'text-gray-400')} />,
      };
      break;
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-semibold border transition-colors shadow-2xs',
        sizeClasses[size],
        config.bg,
        config.border,
        config.text,
        className
      )}
      {...props}
    >
      {showIcon && config.icon}
      <span>{config.label}</span>
    </span>
  );
};

// Helper SVG for Refunded
function RotateCcwIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}
