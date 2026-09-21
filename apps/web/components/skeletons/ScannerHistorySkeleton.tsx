import React from 'react';
import { Skeleton } from '@cedoi/ui';

export const ScannerHistorySkeleton: React.FC = () => {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, idx) => (
        <div
          key={idx}
          className="p-4 rounded-[14px] bg-white border border-slate-200 shadow-sm flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-32 rounded" />
              <Skeleton className="h-3 w-24 rounded" />
            </div>
          </div>
          <div className="text-right space-y-1">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-3 w-14 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
};
