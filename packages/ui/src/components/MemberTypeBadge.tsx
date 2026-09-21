import React from 'react';
import { Award, Users } from 'lucide-react';
import { cn } from '../utils/cn';

export interface MemberTypeBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  memberType?: 'MEMBER' | 'NON_MEMBER' | string | null;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  fullLabel?: boolean;
}

export const MemberTypeBadge: React.FC<MemberTypeBadgeProps> = ({
  memberType,
  size = 'md',
  showIcon = true,
  fullLabel = false,
  className,
  ...props
}) => {
  const isMember = (memberType || '').toUpperCase() === 'MEMBER';

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[11px] gap-1.5',
    md: 'px-2.5 py-1 text-xs gap-1.5',
    lg: 'px-3 py-1.5 text-sm gap-2',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  if (isMember) {
    return (
      <span
        className={cn(
          'inline-flex items-center font-semibold rounded-full border shadow-2xs',
          'bg-amber-50 text-amber-900 border-amber-200/80',
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {showIcon && <Award className={cn('text-amber-700 shrink-0', iconSizes[size])} />}
        <span>{fullLabel ? 'CEDOI Member' : 'Member'}</span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full border shadow-2xs',
        'bg-gray-50 text-gray-700 border-gray-200',
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {showIcon && <Users className={cn('text-gray-500 shrink-0', iconSizes[size])} />}
      <span>{fullLabel ? 'Non-Member Delegate' : 'Non-Member'}</span>
    </span>
  );
};
