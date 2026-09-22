'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '../../../lib/api-client';
import { Shield, Lock, Mail, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import Image from 'next/image';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('superadmin@cedoi.org');
  const [password, setPassword] = useState('Admin@123456');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already authenticated with valid admin token, fast-forward to dashboard
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('cedoi_admin_token') || localStorage.getItem('cedoi_staff_token');
    if (token) {
      apiClient('api/v1/auth/me', { timeoutMs: 3000 })
        .then((profile: any) => {
          if (profile?.role === 'ADMIN' || profile?.role === 'SUPER_ADMIN') {
            router.replace('/admin/dashboard');
          } else {
            // CRITICAL: Do NOT redirect to /scanner from admin login.
            // Clear admin token scope so the user can enter admin credentials cleanly.
            try {
              localStorage.removeItem('cedoi_admin_token');
            } catch {}
          }
        })
        .catch(() => {
          try {
            localStorage.removeItem('cedoi_admin_token');
            localStorage.removeItem('cedoi_staff_token');
          } catch {}
        });
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await apiClient<{ user: any; token: string }>('api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
        timeoutMs: 12000,
      });

      if (res?.user?.role !== 'ADMIN' && res?.user?.role !== 'SUPER_ADMIN') {
        throw new Error('Access denied: Scanner staff credentials cannot be used for Administrator Dashboard.');
      }

      if (res?.token && typeof window !== 'undefined') {
        localStorage.setItem('cedoi_admin_token', res.token);
        localStorage.setItem('cedoi_staff_token', res.token);
      }
      window.location.href = '/admin/dashboard';
    } catch (err: any) {
      setError(err.message || 'Invalid administrator credentials. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F7F7] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans antialiased">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-48 h-20 overflow-hidden relative mx-auto mb-2">
          <Image
            src="/brand/logo.png"
            alt="CEDOI"
            fill
            className="object-contain scale-[2.5]"
          />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">CEDOI Administration</h1>
        <p className="mt-1 text-sm text-gray-500">
          Event Management, Financial Reconciliation & Access Control
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-sm border border-gray-200 rounded-3xl">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-800 text-sm">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-900">Authentication Failed</p>
                <p className="text-xs text-red-700 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                Staff Email Address
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#08537B] focus:border-transparent text-sm transition"
                  placeholder="Enter your email address"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#08537B] focus:border-transparent text-sm transition"
                  placeholder="Enter your password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-[#08537B] hover:bg-[#074769] text-white font-bold text-sm shadow-sm flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-gray-100 text-center bg-gray-50/70 -mx-6 -mb-4 px-6 py-4 rounded-b-3xl">
            <p className="text-xs text-gray-600">
              Demo Super Admin: <span className="text-gray-900 font-semibold font-mono">superadmin@cedoi.org</span>
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Password: <span className="text-gray-800 font-mono font-medium">Admin@123456</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
