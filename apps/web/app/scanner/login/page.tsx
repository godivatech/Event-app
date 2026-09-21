'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '../../../lib/api-client';
import { QrCode, Lock, Mail, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import Image from 'next/image';

export default function ScannerLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('scanner@cedoi.org');
  const [password, setPassword] = useState('Admin@123456');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // If already authenticated with valid token, fast-forward to scanner terminal
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('cedoi_staff_token') : null;
    if (token) {
      apiClient('api/v1/auth/me', { timeoutMs: 3000 })
        .then(() => {
          router.replace('/scanner/scan');
        })
        .catch(() => {
          try {
            localStorage.removeItem('cedoi_staff_token');
          } catch {}
        });
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const res = await apiClient<{ user: any; token: string }>('api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
        timeoutMs: 12000,
      });
      if (res?.token && typeof window !== 'undefined') {
        localStorage.setItem('cedoi_staff_token', res.token);
      }
      window.location.href = '/scanner/scan';
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed. Check your staff credentials.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-6 bg-[#F7F7F7] font-sans antialiased">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="w-48 h-20 overflow-hidden relative mx-auto mb-2 flex items-center justify-center">
            <Image
              src="/brand/logo.png"
              alt="CEDOI"
              fill
              className="object-contain p-1.5"
            />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Gate Staff Login</h1>
          <p className="mt-1 text-xs text-gray-500">
            Authorized scanner terminal for single-entry event admissions.
          </p>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="bg-white rounded-3xl p-7 border border-gray-200 shadow-sm space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Staff Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-white border border-gray-300 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#08537B] focus:border-transparent transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-white border border-gray-300 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#08537B] focus:border-transparent transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#08537B] hover:bg-[#074769] text-white font-bold text-sm shadow-xs transition disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>Sign In & Open Scanner</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <div className="mt-4 pt-4 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-500">
              Development Seed: <span className="text-gray-800 font-semibold font-mono">scanner@cedoi.org</span> / <span className="text-gray-800 font-mono">Admin@123456</span>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
