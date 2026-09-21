import React from 'react';
import { cn } from '../utils/cn';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className, ...props }) => {
  return (
    <div
      className={cn('animate-pulse rounded-[10px] bg-slate-200/80', className)}
      {...props}
    />
  );
};

export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({
  lines = 3,
  className,
}) => {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            'h-4',
            i === lines - 1 ? 'w-3/5' : i % 2 === 0 ? 'w-full' : 'w-4/5'
          )}
        />
      ))}
    </div>
  );
};

export const SkeletonCard: React.FC<{ className?: string; children?: React.ReactNode }> = ({
  className,
  children,
}) => {
  return (
    <div
      className={cn(
        'p-6 rounded-[18px] bg-white border border-slate-200 shadow-sm space-y-4',
        className
      )}
    >
      {children || (
        <>
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        </>
      )}
    </div>
  );
};

export const SkeletonTableRows: React.FC<{
  rows?: number;
  cols?: number;
}> = ({ rows = 5, cols = 6 }) => {
  return (
    <>
      {Array.from({ length: rows }).map((_, rIdx) => (
        <tr key={rIdx} className="animate-pulse">
          {Array.from({ length: cols }).map((_, cIdx) => (
            <td key={cIdx} className="py-4 px-4">
              <div
                className={cn(
                  'h-4 rounded bg-slate-200/80',
                  cIdx === 0
                    ? 'w-24'
                    : cIdx === 1
                    ? 'w-36'
                    : cIdx === cols - 1
                    ? 'w-16 ml-auto'
                    : 'w-20'
                )}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
};
