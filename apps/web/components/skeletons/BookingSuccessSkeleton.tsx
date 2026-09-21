import React from 'react';
import { Skeleton } from '@cedoi/ui';
import { StepIndicator } from '../booking/StepIndicator';

export const BookingSuccessSkeleton: React.FC = () => {
  return (
    <div className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      <StepIndicator currentStep={3} />

      {/* Success banner skeleton */}
      <div className="p-8 rounded-[18px] bg-emerald-50/70 border border-emerald-200 text-center mb-8 space-y-3">
        <Skeleton className="w-12 h-12 rounded-full mx-auto bg-emerald-200" />
        <Skeleton className="h-4 w-36 mx-auto bg-emerald-200 rounded-md" />
        <Skeleton className="h-8 w-72 mx-auto bg-emerald-300/80 rounded-lg" />
        <Skeleton className="h-3.5 w-96 mx-auto bg-emerald-200/80 rounded-md" />

        <div className="pt-2 flex justify-center">
          <Skeleton className="h-9 w-64 rounded-[10px] bg-white border border-emerald-200" />
        </div>

        <div className="pt-3 flex justify-center gap-3">
          <Skeleton className="h-11 w-44 rounded-[12px] bg-emerald-200" />
          <Skeleton className="h-11 w-32 rounded-[12px] bg-white border border-slate-200" />
        </div>
      </div>

      {/* Admission passes skeleton */}
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-6 w-48 rounded-md" />
          <Skeleton className="h-3.5 w-36 rounded-md" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 2 }).map((_, idx) => (
            <div
              key={idx}
              className="bg-white rounded-[18px] border border-slate-200 shadow-sm overflow-hidden"
            >
              <div className="bg-slate-200 p-4 flex justify-between items-center">
                <Skeleton className="h-5 w-24 rounded bg-slate-300" />
                <Skeleton className="h-4 w-20 rounded bg-slate-300" />
              </div>

              <div className="p-6 flex flex-col items-center space-y-3">
                <Skeleton className="h-4 w-28 rounded-md" />
                <Skeleton className="h-5 w-48 rounded-md" />
                <Skeleton className="w-40 h-40 rounded-[14px] my-2" />

                <div className="w-full pt-4 border-t border-slate-100 grid grid-cols-2 gap-2">
                  <Skeleton className="h-8 w-full rounded" />
                  <Skeleton className="h-8 w-full rounded" />
                  <div className="col-span-2 pt-1">
                    <Skeleton className="h-4 w-3/4 rounded" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
