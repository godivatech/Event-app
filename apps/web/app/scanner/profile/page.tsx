'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '../../../lib/api-client';
import { StaffProfileDto, UserRole } from '@cedoi/contracts';
import {
  ShieldCheck,
  Building,
  LogOut,
  ChevronRight,
  ExternalLink,
  Loader2,
  CheckCircle,
} from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@cedoi/ui';

export default function ScannerProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<StaffProfileDto | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loggingOut, setLoggingOut] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    async function loadProfile() {
      try {
        const data = await apiClient<StaffProfileDto>('api/v1/auth/me', { timeoutMs: 8000 });
        if (!isMounted) return;
        setProfile(data);
      } catch (err) {
        if (!isMounted) return;
        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem('cedoi_staff_token');
          } catch {}
        }
        router.replace('/scanner/login');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    loadProfile();
    return () => {
      isMounted = false;
    };
  }, [router]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('cedoi_staff_token');
      }
      await apiClient('api/v1/auth/logout', { method: 'POST', timeoutMs: 5000 });
    } catch (e) {
      // Ignore error during logout
    } finally {
      router.replace('/scanner/login');
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col p-4 sm:p-6 max-w-md mx-auto w-full space-y-5">
        <div className="p-6 rounded-3xl bg-white border border-gray-200 text-center space-y-3 shadow-xs animate-pulse">
          <Skeleton className="w-16 h-16 rounded-full mx-auto" />
          <Skeleton className="h-5 w-32 mx-auto rounded-md" />
          <Skeleton className="h-3 w-44 mx-auto rounded-md" />
          <Skeleton className="h-6 w-24 mx-auto rounded-full mt-2" />
        </div>
        <div className="rounded-2xl bg-white border border-gray-200 p-4 space-y-3 shadow-xs animate-pulse">
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-full rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 max-w-md mx-auto w-full space-y-5">
      {/* Identity Card (Airbnb Light Style) */}
      <div className="p-6 rounded-3xl bg-white border border-gray-200 text-center relative shadow-xs">
        <div className="w-16 h-16 rounded-full bg-blue-50 border-2 border-blue-200 flex items-center justify-center mx-auto mb-3 text-[#08537B] text-xl font-extrabold shadow-2xs">
          {profile?.name ? profile.name.charAt(0).toUpperCase() : 'S'}
        </div>
        <h2 className="text-lg font-bold text-gray-900 tracking-tight">{profile?.name || 'Gate Staff'}</h2>
        <p className="text-xs text-gray-500 mt-0.5">{profile?.email}</p>

        <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
          <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
          <span>{profile?.role}</span>
        </div>
      </div>

      {/* Terminal Details */}
      <div className="rounded-2xl bg-white border border-gray-200 divide-y divide-gray-100 overflow-hidden text-xs shadow-xs">
        <div className="p-4 flex items-center justify-between">
          <span className="text-gray-500 flex items-center gap-2">
            <Building className="w-4 h-4 text-gray-400" />
            Active Organization
          </span>
          <span className="font-semibold text-gray-900">CEDOI Events</span>
        </div>

        <div className="p-4 flex items-center justify-between">
          <span className="text-gray-500 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            Terminal Status
          </span>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            ONLINE
          </span>
        </div>

        <div className="p-4 flex items-center justify-between">
          <span className="text-gray-500 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-gray-400" />
            Permissions
          </span>
          <span className="text-xs font-medium text-gray-700">
            Single-entry admission, scan history
          </span>
        </div>
      </div>

      {/* Admin Quick Switch (if elevated privileges) */}
      {(profile?.role === UserRole.SUPER_ADMIN || profile?.role === UserRole.ADMIN) && (
        <Link
          href="/admin/dashboard"
          className="flex items-center justify-between p-4 rounded-2xl bg-white border border-blue-200 hover:border-blue-400 text-[#08537B] shadow-xs transition"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-50 text-[#08537B] border border-blue-100">
              <ExternalLink className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-900">Open Admin Dashboard</p>
              <p className="text-[11px] text-gray-500">Switch to management terminal</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </Link>
      )}

      {/* Logout Action */}
      <button
        onClick={handleLogout}
        disabled={loggingOut}
        className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-rose-50 border border-rose-200 text-rose-700 font-bold text-xs flex items-center justify-center gap-2 transition shadow-xs disabled:opacity-50"
      >
        {loggingOut ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <LogOut className="w-4 h-4 text-rose-600" />
        )}
        <span>Log Out Scanner Terminal</span>
      </button>

      <div className="text-center text-[11px] text-gray-400">
        CEDOI Gate Validation Terminal v1.0.0
      </div>
    </div>
  );
}
