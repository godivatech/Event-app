import React from 'react';
import { PublicTicketTypeDto } from '@cedoi/contracts';
import { formatPaise } from '../../lib/formatters';
import { Plus, Minus, Users } from 'lucide-react';

interface TicketCardProps {
  ticketType: PublicTicketTypeDto;
  quantity: number;
  onQuantityChange: (qty: number) => void;
}

export const TicketCard: React.FC<TicketCardProps> = ({
  ticketType,
  quantity,
  onQuantityChange,
}) => {
  const isSoldOut = ticketType.remainingCapacity <= 0 || ticketType.status === 'SOLD_OUT';
  const maxAllowed = Math.min(ticketType.maxPerBooking, ticketType.remainingCapacity);

  return (
    <div
      className={`p-5 rounded-[16px] border transition-all ${
        quantity > 0
          ? 'border-[#08537B] bg-white shadow-md ring-1 ring-[#08537B]'
          : 'border-slate-200 bg-white shadow-sm hover:border-slate-300'
      } ${isSoldOut ? 'opacity-60 bg-slate-50' : ''}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Category Info */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-slate-900">{ticketType.name}</h3>
            {isSoldOut ? (
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                Sold Out
              </span>
            ) : ticketType.remainingCapacity < 50 ? (
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                {ticketType.remainingCapacity} Left
              </span>
            ) : null}
          </div>

          {ticketType.description && (
            <p className="mt-1 text-xs text-slate-500 leading-relaxed max-w-xl">
              {ticketType.description}
            </p>
          )}

          <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-1 font-medium">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span>Max {ticketType.maxPerBooking} per booking</span>
            </div>
          </div>
        </div>

        {/* Price & Quantity Controls */}
        <div className="flex items-center justify-between sm:justify-end gap-6 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
          <div className="text-left sm:text-right">
            <div className="text-xl font-extrabold text-[#08537B]">
              {formatPaise(ticketType.unitPricePaise)}
            </div>
            <div className="text-[11px] text-slate-400">per admission</div>
          </div>

          {isSoldOut ? (
            <div className="px-4 py-2 bg-slate-100 text-slate-400 text-xs font-semibold rounded-[10px]">
              Unavailable
            </div>
          ) : (
            <div className="flex items-center border border-slate-300 rounded-[10px] overflow-hidden bg-slate-50">
              <button
                type="button"
                onClick={() => onQuantityChange(Math.max(0, quantity - 1))}
                disabled={quantity <= 0}
                className="w-10 h-10 flex items-center justify-center text-slate-600 hover:bg-slate-200 active:bg-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                aria-label={`Decrease ${ticketType.name} quantity`}
              >
                <Minus className="w-4 h-4" />
              </button>
              <div className="w-10 text-center font-bold text-sm text-slate-900 select-none bg-white h-10 flex items-center justify-center">
                {quantity}
              </div>
              <button
                type="button"
                onClick={() => onQuantityChange(Math.min(maxAllowed, quantity + 1))}
                disabled={quantity >= maxAllowed}
                className="w-10 h-10 flex items-center justify-center text-slate-600 hover:bg-slate-200 active:bg-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                aria-label={`Increase ${ticketType.name} quantity`}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
