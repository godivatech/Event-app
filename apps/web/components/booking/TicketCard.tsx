import React from 'react';
import { PublicTicketTypeDto } from '@cedoi/contracts';
import { formatPaise } from '../../lib/formatters';
import { Check, Users, Plus, Minus } from 'lucide-react';

interface TicketCardProps {
  ticketType: PublicTicketTypeDto;
  quantity: number;
  onQuantityChange: (qty: number) => void;
  maxQuantity?: number;
}

export const TicketCard: React.FC<TicketCardProps> = ({
  ticketType,
  quantity,
  onQuantityChange,
  maxQuantity = 1,
}) => {
  const isSoldOut = ticketType.remainingCapacity <= 0 || ticketType.status === 'SOLD_OUT';
  const isSelected = quantity > 0;
  const effectiveMax = Math.min(maxQuantity, ticketType.remainingCapacity);

  const handleToggle = () => {
    if (isSoldOut) return;
    if (maxQuantity === 1) {
      onQuantityChange(isSelected ? 0 : 1);
    } else {
      if (quantity === 0) {
        onQuantityChange(1);
      }
    }
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (quantity < effectiveMax) {
      onQuantityChange(quantity + 1);
    }
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (quantity > 0) {
      onQuantityChange(quantity - 1);
    }
  };

  return (
    <div
      onClick={handleToggle}
      className={`p-5 rounded-[18px] border-2 transition-all cursor-pointer select-none ${
        isSelected
          ? 'border-[#08537B] bg-blue-50/30 shadow-md ring-2 ring-[#08537B]/20'
          : 'border-slate-200 bg-white shadow-xs hover:border-slate-300 hover:shadow-sm'
      } ${isSoldOut ? 'opacity-60 bg-slate-50 cursor-not-allowed' : ''}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Category Info */}
        <div className="flex-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h3 className="text-lg font-bold text-slate-900">{ticketType.name}</h3>
            {isSoldOut ? (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                Sold Out
              </span>
            ) : ticketType.remainingCapacity < 50 ? (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                {ticketType.remainingCapacity} Passes Left
              </span>
            ) : null}
            {isSelected && maxQuantity > 1 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#08537B] text-white">
                {quantity} {quantity === 1 ? 'Pass' : 'Passes'} Selected
              </span>
            )}
          </div>

          {ticketType.description && (
            <p className="mt-1.5 text-xs text-slate-600 leading-relaxed max-w-xl">
              {ticketType.description}
            </p>
          )}

          <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-1.5 font-medium">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {maxQuantity > 1 ? `Up to ${maxQuantity} passes per member` : '1 admission pass per delegate'}
              </span>
            </div>
          </div>
        </div>

        {/* Price & Selection / Stepper */}
        <div className="flex items-center justify-between sm:justify-end gap-6 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
          <div className="text-left sm:text-right">
            <div className="text-2xl font-black text-[#08537B]">
              {formatPaise(ticketType.unitPricePaise * (quantity > 1 ? quantity : 1))}
            </div>
            <div className="text-[11px] text-slate-400 font-medium">
              {quantity > 1 ? `(${quantity} × ${formatPaise(ticketType.unitPricePaise)})` : 'per admission'}
            </div>
          </div>

          {isSoldOut ? (
            <div className="px-4 py-2.5 bg-slate-100 text-slate-400 text-xs font-bold rounded-xl">
              Sold Out
            </div>
          ) : maxQuantity === 1 ? (
            /* Single Select Toggle Button */
            isSelected ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onQuantityChange(0);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#08537B] text-white text-xs font-bold shadow-sm transition-all"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Selected</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onQuantityChange(1);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all border border-slate-200"
              >
                <span>Select Pass</span>
              </button>
            )
          ) : (
            /* Multi-Quantity Stepper (Up to 10) */
            <div className="flex items-center gap-2">
              {quantity === 0 ? (
                <button
                  type="button"
                  onClick={handleIncrement}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all border border-slate-200"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Select</span>
                </button>
              ) : (
                <div className="inline-flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-300 shadow-xs">
                  <button
                    type="button"
                    onClick={handleDecrement}
                    className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 active:bg-slate-300 flex items-center justify-center text-slate-700 font-bold transition"
                    title="Decrease pass quantity"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-8 text-center font-mono font-bold text-sm text-slate-900">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={handleIncrement}
                    disabled={quantity >= effectiveMax}
                    className="w-8 h-8 rounded-lg bg-[#08537B] hover:bg-[#064364] active:bg-[#053752] disabled:opacity-40 flex items-center justify-center text-white font-bold transition"
                    title="Increase pass quantity"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
