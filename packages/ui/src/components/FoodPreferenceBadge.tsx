import React from 'react';
import { cn } from '../utils/cn';

export interface VegVectorIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
}

export const VegVectorIcon: React.FC<VegVectorIconProps> = ({
  className,
  size = 16,
  ...props
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('inline-block shrink-0', className)}
      {...props}
    >
      <rect
        x="2"
        y="2"
        width="20"
        height="20"
        rx="4"
        stroke="#16a34a"
        strokeWidth="2.5"
        fill="#ffffff"
      />
      <circle cx="12" cy="12" r="5" fill="#16a34a" />
    </svg>
  );
};

export interface NonVegVectorIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
}

export const NonVegVectorIcon: React.FC<NonVegVectorIconProps> = ({
  className,
  size = 16,
  ...props
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('inline-block shrink-0', className)}
      {...props}
    >
      <rect
        x="2"
        y="2"
        width="20"
        height="20"
        rx="4"
        stroke="#b91c1c"
        strokeWidth="2.5"
        fill="#ffffff"
      />
      <polygon points="12,6 18,17 6,17" fill="#b91c1c" />
    </svg>
  );
};

export interface FoodPreferenceBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  preference?: 'VEG' | 'NON_VEG' | string | null;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  fullLabel?: boolean;
}

export const FoodPreferenceBadge: React.FC<FoodPreferenceBadgeProps> = ({
  preference,
  size = 'md',
  showIcon = true,
  fullLabel = false,
  className,
  ...props
}) => {
  const isNonVeg = (preference || '').toUpperCase() === 'NON_VEG';

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[11px] gap-1.5',
    md: 'px-2.5 py-1 text-xs gap-1.5',
    lg: 'px-3 py-1.5 text-sm gap-2',
  };

  const iconSizes = {
    sm: 13,
    md: 15,
    lg: 18,
  };

  if (isNonVeg) {
    return (
      <span
        className={cn(
          'inline-flex items-center font-semibold rounded-full border shadow-2xs',
          'bg-red-50/90 text-red-900 border-red-200/90',
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {showIcon && <NonVegVectorIcon size={iconSizes[size]} />}
        <span>{fullLabel ? 'Non-Vegetarian' : 'Non-Veg'}</span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center font-semibold rounded-full border shadow-2xs',
        'bg-emerald-50/90 text-emerald-900 border-emerald-200/90',
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {showIcon && <VegVectorIcon size={iconSizes[size]} />}
      <span>{fullLabel ? 'Pure Vegetarian' : 'Pure Veg'}</span>
    </span>
  );
};
