'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { apiClient } from '../../lib/api-client';
import { StaffProfileDto } from '@cedoi/contracts';
import { QrCode, History, Shield, Loader2, AlertCircle } from 'lucide-react';
import Image from 'next/image';

export default function ScannerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  // If on scanner login page, render children directly without chrome
  const isLoginPage = Boolean(pathname && pathname.startsWith('/scanner/login'));

  const [staff, setStaff] = useState<StaffProfileDto | null>(null);
  const [authStatus, setAuthStatus] = useState<'checking' | 'authenticated' | 'unauthenticated'>(
    isLoginPage ? 'authenticated' : 'checking'
  );
  const [tookTooLong, setTookTooLong] = useState<boolean>(false);

  useEffect(() => {
    if (isLoginPage) {
      setAuthStatus('authenticated');
      return;
    }

    // FAST-PATH 1: Synchronous token presence check
    const token =
      typeof window !== 'undefined'
        ? localStorage.getItem('cedoi_scanner_token') || localStorage.getItem('cedoi_staff_token')
        : null;
    if (!token) {
      setAuthStatus('unauthenticated');
      router.replace('/scanner/login');
      return;
    }

    // Safety timeout: if auth takes more than 7 seconds, show retry
    const timer = setTimeout(() => {
      setTookTooLong(true);
    }, 7000);

    let isMounted = true;
    setAuthStatus('checking');

    async function verifyStaff() {
      try {
        const profile = await apiClient<StaffProfileDto>('api/v1/auth/me', { timeoutMs: 8000 });
        if (!isMounted) return;

        setStaff(profile);
        setAuthStatus('authenticated');
      } catch (err) {
        if (!isMounted) return;
        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem('cedoi_scanner_token');
            localStorage.removeItem('cedoi_staff_token');
          } catch {}
        }
        setAuthStatus('unauthenticated');
        router.replace('/scanner/login');
      } finally {
        clearTimeout(timer);
      }
    }

    verifyStaff();

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [pathname, isLoginPage, router]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  // If unauthenticated, show redirect message
  if (authStatus === 'unauthenticated') {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#F7F7F7] p-4 text-center">
        <Loader2 className="w-8 h-8 text-[#08537B] animate-spin mb-3" />
        <h2 className="text-sm font-bold text-gray-800">Authenticating Terminal...</h2>
        <p className="text-xs text-gray-500 mt-1">Redirecting to scanner staff login</p>
      </div>
    );
  }

  // If verifying session, show clean loading terminal
  if (authStatus === 'checking') {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#F7F7F7] p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-4 text-[#08537B]">
          <QrCode className="w-6 h-6 animate-pulse" />
        </div>
        <h2 className="text-sm font-bold text-gray-900">Connecting Scanner Terminal...</h2>
        <p className="text-xs text-gray-500 mt-1">Verifying gate validation credentials</p>

        {tookTooLong && (
          <div className="mt-6 p-4 max-w-sm rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex flex-col items-center gap-3 animate-fadeIn">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Session verification is taking longer than usual.</span>
            </div>
            <button
              onClick={() => router.replace('/scanner/login')}
              className="px-4 py-1.5 bg-white hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-xl font-bold text-xs transition"
            >
              Return to Login
            </button>
          </div>
        )}
      </div>
    );
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
