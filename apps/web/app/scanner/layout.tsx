'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { QrCode, History, UserCheck, Shield } from 'lucide-react';

export default function ScannerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // If on scanner login page, render children directly without chrome
  if (pathname === '/scanner/login') {
    return <>{children}</>;
  }

  const navItems = [
    { href: '/scanner/scan', label: 'SCANNER', icon: QrCode },
    { href: '/scanner/history', label: 'HISTORY', icon: History },
    { href: '/scanner/profile', label: 'STAFF', icon: Shield },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#F7F7F7] text-gray-900 select-none font-sans antialiased">
      {/* Scanner Header (Airbnb Light Style) */}
      <header className="h-16 px-4 sm:px-6 bg-white border-b border-gray-200 flex items-center justify-between z-30 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#08537B] flex items-center justify-center font-bold text-white text-base shadow-xs">
            C
          </div>
          <div>
            <span className="font-extrabold text-sm tracking-tight text-gray-900 block leading-tight">
              CEDOI SCANNER
            </span>
            <span className="text-[10px] font-bold text-[#EE8518] tracking-widest uppercase">
              GATE TERMINAL
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`p-2 rounded-xl transition ${
                  isActive
                    ? 'bg-blue-50 text-[#08537B] border border-blue-100 shadow-xs'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                }`}
                title={item.label}
              >
                <Icon className="w-5 h-5" />
              </Link>
            );
          })}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col">
        {children}
      </main>

      {/* Bottom Mobile Tab Bar (Airbnb Light Clean Bar) */}
      <nav className="h-16 bg-white border-t border-gray-200 flex items-center justify-around z-30 shadow-[0_-2px_10px_rgba(0,0,0,0.03)]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-5 py-2 transition ${
                isActive
                  ? 'text-[#08537B] font-bold'
                  : 'text-gray-400 hover:text-gray-700'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-[#08537B]' : 'text-gray-400'}`} />
              <span className="text-[10px] tracking-wider uppercase">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
