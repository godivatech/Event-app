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
        <div className="flex items-center gap-2 sm:gap-4">
          <Link
            href="/recover"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium text-slate-700 hover:text-[#08537B] hover:bg-slate-100 rounded-[10px] transition-colors"
          >
            <KeyRound className="w-4 h-4 text-[#EE8518]" />
            <span className="hidden sm:inline">Find My Booking</span>
            <span className="sm:hidden">Recover</span>
          </Link>

          <Link
            href="/help"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium text-slate-700 hover:text-[#08537B] hover:bg-slate-100 rounded-[10px] transition-colors"
          >
            <HelpCircle className="w-4 h-4 text-slate-500" />
            <span className="hidden md:inline">Help</span>
          </Link>

          <div className="h-5 w-px bg-slate-200 hidden sm:block" />

          <Link
            href="/scanner/login"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 rounded-[10px] transition-all"
            title="Gate Staff Scanner Login"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#08537B]" />
            <span>Staff Portal</span>
          </Link>
        </div>
      </div>
    </header>
  );
};
