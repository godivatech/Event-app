import React from 'react';
import { Skeleton } from '@cedoi/ui';

export const AdminDashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div
            key={idx}
            className="p-6 rounded-[18px] bg-white border border-slate-200 shadow-sm space-y-3"
          >
            <div className="flex justify-between items-center">
              <Skeleton className="h-4 w-28 rounded" />
              <Skeleton className="w-10 h-10 rounded-xl" />
            </div>
            <Skeleton className="h-8 w-36 rounded-md" />
            <Skeleton className="h-3 w-24 rounded" />
          </div>
        ))}
      </div>

      {/* Progress & Category Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 p-6 rounded-[18px] bg-white border border-slate-200 shadow-sm space-y-5">
          <div className="flex justify-between items-center">
            <Skeleton className="h-5 w-44 rounded" />
            <Skeleton className="h-4 w-20 rounded" />
          </div>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-32 rounded" />
                  <Skeleton className="h-4 w-16 rounded" />
                </div>
                <Skeleton className="h-3 w-full rounded-full" />
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 rounded-[18px] bg-white border border-slate-200 shadow-sm space-y-5">
          <Skeleton className="h-5 w-36 rounded" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-slate-50 flex justify-between items-center">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-20 rounded" />
                  <Skeleton className="h-3 w-16 rounded" />
                </div>
                <Skeleton className="h-6 w-12 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Bookings Table */}
      <div className="bg-white rounded-[18px] border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
        <Skeleton className="h-5 w-40 rounded" />
        <div className="divide-y divide-slate-100">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="py-3 flex justify-between items-center">
              <div className="space-y-1">
                <Skeleton className="h-4 w-32 rounded" />
                <Skeleton className="h-3 w-24 rounded" />
              </div>
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-4 w-16 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
