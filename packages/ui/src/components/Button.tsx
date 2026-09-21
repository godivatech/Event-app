import React from 'react';
import { cn } from '../utils/cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'accent' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none select-none rounded-[10px]';

    const sizeStyles = {
      sm: 'h-9 px-3 text-xs gap-1.5',
      md: 'h-11 px-4 text-sm gap-2 min-w-[44px]',
      lg: 'h-12 px-6 text-base gap-2.5 min-w-[44px]',
    };

    const variantStyles = {
      primary:
        'bg-[#08537B] hover:bg-[#064364] active:bg-[#053752] text-white focus:ring-[#08537B] shadow-sm',
      accent:
        'bg-[#EE8518] hover:bg-[#d26b0f] active:bg-[#ab4e10] text-white focus:ring-[#EE8518] shadow-sm font-semibold',
      secondary:
        'bg-slate-100 hover:bg-slate-200 text-slate-800 focus:ring-slate-400',
      outline:
        'border border-slate-300 bg-transparent hover:bg-slate-50 text-slate-700 focus:ring-[#08537B]',
      ghost:
        'bg-transparent hover:bg-slate-100 text-slate-700 focus:ring-[#08537B]',
      danger:
        'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white focus:ring-red-600 shadow-sm',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          baseStyles,
          sizeStyles[size],
          variantStyles[variant],
          fullWidth && 'w-full',
          className
        )}
        {...props}
      >
        {isLoading ? (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : leftIcon ? (
          <span className="shrink-0">{leftIcon}</span>
        ) : null}
        <span>{children}</span>
        {!isLoading && rightIcon ? <span className="shrink-0">{rightIcon}</span> : null}
      </button>
    );
  }
);

Button.displayName = 'Button';
