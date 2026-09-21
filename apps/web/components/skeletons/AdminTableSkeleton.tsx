import React from 'react';
import { Skeleton } from '@cedoi/ui';

interface AdminTableSkeletonProps {
  rows?: number;
  columns?: number;
  showSearchBar?: boolean;
}

export const AdminTableSkeleton: React.FC<AdminTableSkeletonProps> = ({
  rows = 6,
  columns = 5,
  showSearchBar = true,
}) => {
  return (
    <div className="space-y-6">
      {showSearchBar && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <Skeleton className="h-11 w-full sm:w-80 rounded-[10px]" />
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Skeleton className="h-11 w-32 rounded-[10px]" />
            <Skeleton className="h-11 w-32 rounded-[10px]" />
          </div>
        </div>
      )}

      <div className="bg-white rounded-[18px] border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Header */}
        <div className="bg-slate-50 px-6 py-3.5 border-b border-slate-200 grid grid-cols-12 gap-4 items-center">
          {Array.from({ length: columns }).map((_, idx) => (
            <div
              key={idx}
              className={
                idx === 0
                  ? 'col-span-3'
                  : idx === 1
                  ? 'col-span-3'
                  : idx === columns - 1
                  ? 'col-span-2 text-right'
                  : 'col-span-2'
              }
            >
              <Skeleton className="h-4 w-20 rounded" />
            </div>
          ))}
        </div>

        {/* Table Rows */}
        <div className="divide-y divide-slate-100">
          {Array.from({ length: rows }).map((_, rIdx) => (
            <div
              key={rIdx}
              className="px-6 py-4 grid grid-cols-12 gap-4 items-center"
            >
              <div className="col-span-3 space-y-1.5">
                <Skeleton className="h-4 w-32 rounded" />
                <Skeleton className="h-3 w-20 rounded" />
              </div>
              <div className="col-span-3 space-y-1">
                <Skeleton className="h-4 w-28 rounded" />
                <Skeleton className="h-3 w-36 rounded" />
              </div>
              <div className="col-span-2">
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <div className="col-span-2">
                <Skeleton className="h-4 w-16 rounded" />
              </div>
              <div className="col-span-2 flex justify-end">
                <Skeleton className="h-8 w-16 rounded-[8px]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
