import React from 'react';
import { Check } from 'lucide-react';

interface StepIndicatorProps {
  currentStep: 1 | 2 | 3;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep }) => {
  const steps = [
    { number: 1, title: 'Select Tickets' },
    { number: 2, title: 'Review & Pay' },
    { number: 3, title: 'Confirmed' },
  ];

  return (
    <div className="w-full max-w-2xl mx-auto my-6 px-4">
      <div className="flex items-center justify-between relative">
        {/* Background Connecting Line */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-slate-200 w-full z-0" />
        {/* Active Connecting Line */}
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-[#08537B] transition-all duration-300 z-0"
          style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
        />

        {steps.map((step) => {
          const isCompleted = step.number < currentStep;
          const isCurrent = step.number === currentStep;

          return (
            <div key={step.number} className="relative z-10 flex flex-col items-center">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-sm ${
                  isCompleted
                    ? 'bg-[#08537B] text-white'
                    : isCurrent
                    ? 'bg-[#EE8518] text-white ring-4 ring-[#EE8518]/20'
                    : 'bg-white border-2 border-slate-300 text-slate-400'
                }`}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : step.number}
              </div>
              <span
                className={`mt-1.5 text-xs font-semibold whitespace-nowrap ${
                  isCurrent
                    ? 'text-[#08537B]'
                    : isCompleted
                    ? 'text-slate-800'
                    : 'text-slate-400'
                }`}
              >
                {step.title}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
