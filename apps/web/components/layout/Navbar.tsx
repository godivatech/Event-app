import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Ticket, ShieldCheck } from 'lucide-react';

export const Navbar: React.FC = () => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 w-full overflow-hidden">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-2">
        {/* Brand Logo & Tagline */}
        <Link href="/" className="flex items-center group shrink-0">
          <div className="relative h-12 w-32 sm:h-16 sm:w-60 overflow-hidden flex items-center">
            <Image
              src="/brand/logo.png"
              alt="CEDOI - Building Outstanding Entrepreneurs"
              fill
              priority
              className="object-contain object-left scale-[2.2] sm:scale-[2.5] origin-left"
            />
          </div>
        </Link>

        {/* Navigation Actions */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <Link
            href="/scanner/login"
            className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 rounded-[10px] transition-all whitespace-nowrap"
            title="Gate Staff Scanner Login"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#08537B] shrink-0" />
            <span className="hidden sm:inline">Staff Portal</span>
            <span className="sm:hidden">Staff</span>
          </Link>

          <Link
            href="/events/cedoi-summit-2026/tickets"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-bold text-white bg-[#EE8518] hover:bg-[#d6720f] active:bg-[#ab4e10] rounded-[10px] shadow-sm transition-all whitespace-nowrap"
          >
            <Ticket className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span>Book Tickets</span>
          </Link>
        </div>
      </div>
    </header>
  );
};
