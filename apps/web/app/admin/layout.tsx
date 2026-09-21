'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { apiClient } from '../../lib/api-client';
import { StaffProfileDto, UserRole } from '@cedoi/contracts';
import {
  LayoutDashboard,
  Calendar,
  ShoppingBag,
  Ticket,
  CreditCard,
  CheckCircle2,
  BarChart3,
  Settings,
  QrCode,
  LogOut,
  Shield,
  Menu,
  X,
  Loader2,
} from 'lucide-react';
import Image from 'next/image';
import { Skeleton } from '@cedoi/ui';

const navItems = [
  { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'Events', href: '/admin/events', icon: Calendar },
  { name: 'Bookings', href: '/admin/bookings', icon: ShoppingBag },
  { name: 'Tickets', href: '/admin/tickets', icon: Ticket },
  { name: 'Payments & Refunds', href: '/admin/payments', icon: CreditCard },
  { name: 'Gate Check-Ins', href: '/admin/check-ins', icon: CheckCircle2 },
  { name: 'Reports & CSV Export', href: '/admin/reports', icon: BarChart3 },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  // If on login page, render children directly without sidebar
  const isLoginPage = pathname === '/admin/login';

  const [staff, setStaff] = useState<StaffProfileDto | null>(null);
  const [loading, setLoading] = useState<boolean>(!isLoginPage);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  useEffect(() => {
    if (isLoginPage) return;

    async function checkAuth() {
      try {
        const profile = await apiClient<StaffProfileDto>('api/v1/auth/me');
        if (profile.role === UserRole.SCANNER) {
          // Scanner staff cannot access admin console
          router.push('/scanner/scan');
          return;
        }
        setStaff(profile);
      } catch (err) {
        router.push('/admin/login');
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, [isLoginPage, router]);

  const handleLogout = async () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('cedoi_staff_token');
      }
      await apiClient('api/v1/auth/logout', { method: 'POST' });
    } catch (e) {
      // Ignore
    } finally {
      router.push('/admin/login');
    }
  };

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="h-screen overflow-hidden bg-[#F7F7F7] flex flex-col lg:flex-row antialiased">
        {/* Sidebar Skeleton */}
        <aside className="hidden lg:flex lg:flex-col lg:w-64 h-full bg-white border-r border-gray-200 shrink-0 p-5 space-y-6">
          <div className="flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded-lg" />
            <Skeleton className="h-5 w-24 rounded" />
          </div>
          <div className="space-y-2 pt-4 flex-1 overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-xl" />
            ))}
          </div>
        </aside>
        {/* Main Content Area Skeleton */}
        <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
          <header className="h-16 shrink-0 bg-white border-b border-gray-200 px-6 flex items-center justify-between">
            <Skeleton className="h-5 w-36 rounded" />
            <div className="flex items-center gap-3">
              <Skeleton className="w-8 h-8 rounded-full" />
              <Skeleton className="h-4 w-24 rounded" />
            </div>
          </header>
          <main className="flex-1 overflow-y-auto p-6 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
            <div className="flex justify-between items-center">
              <Skeleton className="h-8 w-64 rounded-lg" />
              <Skeleton className="h-10 w-32 rounded-xl" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-2xl" />
              ))}
            </div>
            <Skeleton className="h-72 rounded-2xl" />
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-[#F7F7F7] text-gray-900 flex flex-col lg:flex-row font-sans antialiased">
      {/* Sidebar - Desktop (Fixed Height, Stays Pinned on Left, Internal Nav Scroll) */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 h-full bg-white border-r border-gray-200 shrink-0 shadow-[1px_0_4px_rgba(0,0,0,0.02)] z-30 select-none">
        {/* Brand Header */}
        <div className="h-16 px-5 border-b border-gray-200 flex items-center justify-between shrink-0">
          <Link href="/admin/dashboard" className="flex items-center gap-3">
            <div className="relative w-9 h-9 overflow-hidden shrink-0 flex items-center justify-center">
              <Image
                src="/brand/logo.png"
                alt="CEDOI"
                fill
                className="object-contain scale-[2.2]"
              />
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-tight text-gray-900 block leading-tight">
                CEDOI ADMIN
              </span>
              <span className="text-[10px] font-bold text-[#08537B] tracking-wider uppercase">
                MANAGEMENT
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                  isActive
                    ? 'bg-blue-50/90 text-[#08537B] border border-blue-100/80 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/70'
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? 'text-[#08537B]' : 'text-gray-400'
                  }`}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Scanner Terminal Shortcut & Staff Info */}
        <div className="p-3 border-t border-gray-200 space-y-2 bg-gray-50/60 shrink-0">
          <Link
            href="/scanner/scan"
            className="flex items-center justify-between px-3 py-2 rounded-xl bg-white hover:bg-amber-50/60 text-xs text-amber-700 border border-amber-200/80 font-semibold transition shadow-xs"
          >
            <span className="flex items-center gap-2">
              <QrCode className="w-4 h-4 text-[#EE8518]" />
              Scanner Terminal
            </span>
            <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">
              GATE
            </span>
          </Link>

          <div className="px-3 py-2.5 rounded-xl bg-white border border-gray-200 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5 truncate">
              <div className="w-7 h-7 rounded-lg bg-[#08537B] flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-xs">
                {staff?.name?.charAt(0) || 'A'}
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-gray-900 truncate">
                  {staff?.name}
                </p>
                <p className="text-[10px] text-gray-500 font-medium">
                  {staff?.role}
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Area: Fixed Header + Scrollable Main Content */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 shrink-0 px-4 lg:px-8 bg-white border-b border-gray-200 flex items-center justify-between z-20 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg bg-gray-100 text-gray-600 hover:text-gray-900"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div>
              <h2 className="text-sm font-bold text-gray-900 hidden sm:block">
                CEDOI Entrepreneur Summit 2026
              </h2>
              <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Ticketing Feed Active
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 border border-gray-200 text-xs font-medium text-gray-700">
              <Shield className="w-3.5 h-3.5 text-[#08537B]" />
              <span className="font-semibold">{staff?.role}</span>
            </div>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-red-50 border border-gray-200 hover:border-red-200 text-gray-700 hover:text-red-700 text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden shrink-0 bg-white border-b border-gray-200 px-4 py-3 space-y-1 shadow-md max-h-[calc(100vh-4rem)] overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold ${
                    isActive
                      ? 'bg-blue-50 text-[#08537B] font-bold'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.name}
                </Link>
              );
            })}
            <Link
              href="/scanner/scan"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-amber-700 bg-amber-50"
            >
              <QrCode className="w-4 h-4 text-[#EE8518]" />
              Scanner Terminal
            </Link>
          </div>
        )}

        {/* Page Content: The ONLY element that scrolls */}
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto bg-[#F7F7F7]">
          {children}
        </main>
      </div>
    </div>
  );
}
