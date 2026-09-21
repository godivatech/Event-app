import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Ticket, KeyRound, ShieldCheck, HelpCircle } from 'lucide-react';

export const Navbar: React.FC = () => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand Logo & Tagline */}
        <Link href="/" className="flex items-center group">
          <div className="relative h-16 w-52 sm:w-64 overflow-hidden flex items-center">
            <Image
              src="/brand/logo.png"
              alt="CEDOI - Building Outstanding Entrepreneurs"
              fill
              priority
              className="object-contain object-left scale-[2.5] origin-left"
            />
          </div>
        </Link>

        {/* Navigation Actions */}
        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            href="/scanner/login"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 rounded-[10px] transition-all"
            title="Gate Staff Scanner Login"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#08537B]" />
            <span>Staff Portal</span>
          </Link>

          <Link
            href="/events/cedoi-summit-2026/tickets"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold text-white bg-[#EE8518] hover:bg-[#d6720f] active:bg-[#ab4e10] rounded-[10px] shadow-sm transition-all"
          >
            <Ticket className="w-4 h-4" />
            <span>Book Tickets</span>
          </Link>
        </div>
      </div>
    </header>
  );
};
