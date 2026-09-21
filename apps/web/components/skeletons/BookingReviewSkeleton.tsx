import React from 'react';
import { Skeleton } from '@cedoi/ui';
import { StepIndicator } from '../booking/StepIndicator';

export const BookingReviewSkeleton: React.FC = () => {
  return (
    <div className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      <StepIndicator currentStep={2} />

      <div className="text-center max-w-xl mx-auto mb-6 space-y-2">
        <Skeleton className="h-8 w-72 mx-auto rounded-lg" />
        <Skeleton className="h-4 w-48 mx-auto rounded-md" />
      </div>

      {/* Countdown timer skeleton */}
      <div className="mb-6 p-4 rounded-[14px] bg-slate-100 border border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="w-5 h-5 rounded-full" />
          <Skeleton className="h-4 w-44 rounded-md" />
        </div>
        <Skeleton className="h-6 w-16 rounded-md" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Review details skeleton */}
        <div className="lg:col-span-7 space-y-6">
          {/* Recovery Code box skeleton */}
          <div className="p-5 rounded-[16px] bg-amber-50/60 border-2 border-amber-200/80 space-y-3">
            <div className="flex items-start gap-3">
              <Skeleton className="w-5 h-5 rounded bg-amber-200 shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48 bg-amber-200/90 rounded-md" />
                <Skeleton className="h-3 w-5/6 bg-amber-200/70 rounded-md" />
                <div className="mt-3 flex items-center gap-2 pt-1">
                  <Skeleton className="h-10 w-48 bg-white border border-amber-200 rounded-[8px]" />
                  <Skeleton className="h-9 w-20 bg-amber-200 rounded-[8px]" />
                </div>
              </div>
            </div>
          </div>

          {/* Event info card skeleton */}
          <div className="bg-white rounded-[18px] p-6 border border-slate-200 shadow-sm space-y-5">
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-16 rounded-md" />
              <Skeleton className="h-5 w-64 rounded-md" />
              <Skeleton className="h-3.5 w-48 rounded-md" />
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-3">
              <Skeleton className="h-3 w-28 rounded-md" />
              <div className="space-y-2">
                <div className="flex justify-between py-1">
                  <Skeleton className="h-4 w-36 rounded-md" />
                  <Skeleton className="h-4 w-20 rounded-md" />
                </div>
                <div className="flex justify-between py-1">
                  <Skeleton className="h-4 w-40 rounded-md" />
                  <Skeleton className="h-4 w-20 rounded-md" />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-3">
              <Skeleton className="h-3 w-36 rounded-md" />
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Skeleton className="h-3 w-12 rounded-md" />
                  <Skeleton className="h-4 w-28 rounded-md" />
                </div>
                <div className="space-y-1">
                  <Skeleton className="h-3 w-12 rounded-md" />
                  <Skeleton className="h-4 w-28 rounded-md" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Sticky payment card skeleton */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-[18px] p-6 border border-slate-200 shadow-md space-y-5">
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-36 rounded-md" />
              <Skeleton className="h-9 w-32 rounded-lg" />
              <Skeleton className="h-3 w-48 rounded-md" />
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton className="w-4 h-4 rounded-full" />
                <Skeleton className="h-4 w-40 rounded-md" />
              </div>
              <Skeleton className="h-3 w-full rounded-md" />
              <Skeleton className="h-12 w-full rounded-[12px]" />
            </div>

            <div className="pt-4 border-t border-dashed border-slate-200">
              <div className="p-3.5 rounded-[12px] bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex justify-between items-center">
                  <Skeleton className="h-3.5 w-32 rounded-md" />
                  <Skeleton className="h-4 w-14 rounded-full" />
                </div>
                <Skeleton className="h-3 w-full rounded-md" />
                <Skeleton className="h-8 w-full rounded-[8px]" />
              </div>
            </div>

            <div className="pt-2 flex justify-center">
              <Skeleton className="h-3 w-56 rounded-md" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
