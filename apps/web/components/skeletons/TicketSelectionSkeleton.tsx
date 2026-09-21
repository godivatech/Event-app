import React from 'react';
import { Skeleton } from '@cedoi/ui';
import { StepIndicator } from '../booking/StepIndicator';

export const TicketSelectionSkeleton: React.FC = () => {
  return (
    <div className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      <StepIndicator currentStep={1} />

      {/* Header skeleton */}
      <div className="text-center max-w-2xl mx-auto mb-8 space-y-2">
        <Skeleton className="h-9 w-64 mx-auto rounded-lg" />
        <Skeleton className="h-4 w-96 mx-auto rounded-md" />
      </div>

      <div className="space-y-8">
        {/* Section 1: Ticket categories */}
        <div className="space-y-4">
          <Skeleton className="h-5 w-56 rounded-md mb-4" />

          {Array.from({ length: 3 }).map((_, idx) => (
            <div
              key={idx}
              className="p-6 rounded-[18px] bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"
            >
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-6 w-44 rounded-md" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
                <Skeleton className="h-4 w-5/6 rounded-md" />
                <Skeleton className="h-3 w-32 rounded-md" />
              </div>

              <div className="flex items-center gap-6 self-end sm:self-center">
                <div className="text-right space-y-1">
                  <Skeleton className="h-7 w-24 rounded-md" />
                  <Skeleton className="h-3 w-20 rounded-md" />
                </div>
                <Skeleton className="h-10 w-28 rounded-[10px]" />
              </div>
            </div>
          ))}
        </div>

        {/* Section 2: Attendee details form */}
        <div className="p-6 rounded-[18px] bg-white border border-slate-200 shadow-sm space-y-5">
          <Skeleton className="h-5 w-60 rounded-md" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="space-y-2">
              <Skeleton className="h-4 w-28 rounded-md" />
              <Skeleton className="h-11 w-full rounded-[10px]" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-28 rounded-md" />
              <Skeleton className="h-11 w-full rounded-[10px]" />
            </div>
            <div className="sm:col-span-2 space-y-2">
              <Skeleton className="h-4 w-36 rounded-md" />
              <Skeleton className="h-11 w-full rounded-[10px]" />
            </div>
          </div>
        </div>

        {/* Sticky total bar skeleton */}
        <div className="p-5 rounded-[18px] bg-slate-200 border border-slate-300 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1.5 w-full sm:w-auto">
            <Skeleton className="h-4 w-40 rounded-md bg-slate-300" />
            <Skeleton className="h-8 w-32 rounded-md bg-slate-300" />
          </div>
          <Skeleton className="h-12 w-full sm:w-56 rounded-[12px] bg-slate-300" />
        </div>
      </div>
    </div>
  );
};
