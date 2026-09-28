'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '../../../lib/api-client';
import { formatPaise, formatDateTime, StatusBadge, SkeletonTableRows } from '@cedoi/ui';
import {
  CreditCard,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

interface PaymentAttempt {
  id: string;
  provider?: string;
  cfOrderId?: string;
  cfPaymentId?: string;
  status: string;
  amountPaise: number;
  currency: string;
  createdAt: string;
  booking: {
    bookingNumber: string;
    customerName: string;
  };
}

export default function AdminPaymentsPage() {
  const router = useRouter();
  const [attempts, setAttempts] = useState<PaymentAttempt[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalAttempts, setTotalAttempts] = useState<number>(0);

  const fetchPayments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient<any>(`api/v1/admin/payments?page=${page}&limit=15`, { timeoutMs: 12000 });
      setAttempts(res.attempts || []);
      setTotalAttempts(res.total || 0);
      setTotalPages(res.totalPages || 1);
    } catch (err: any) {
      if (err.code === 'UNAUTHENTICATED') {
        router.replace('/admin/login');
        return;
      }
      setError(err.message || 'Failed to load payments ledger from database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [page]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Payments & Gateway Transactions
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-[#08537B] border border-blue-200 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Cashfree PG Active</span>
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Reconciliation ledger of online payment attempts, Cashfree transaction IDs, and settlement statuses
          </p>
        </div>

        <button
          onClick={fetchPayments}
          disabled={loading}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 border border-gray-300 shadow-xs transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Main Attempts Ledger */}
      <div className="rounded-3xl bg-white border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-[#08537B]" />
            <h2 className="text-sm font-bold text-gray-900 tracking-tight">
              Gateway Transactions ({totalAttempts})
            </h2>
          </div>
          <span className="text-xs font-semibold text-gray-500">
            Authoritative INR Settlement
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/80 text-gray-500 uppercase tracking-wider font-semibold border-b border-gray-200">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Booking #</th>
                <th className="py-3.5 px-4 font-semibold">Customer</th>
                <th className="py-3.5 px-4 font-semibold">Order ID</th>
                <th className="py-3.5 px-4 font-semibold">Payment ID</th>
                <th className="py-3.5 px-4 font-semibold">Amount</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 text-right font-semibold">Date & Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700 bg-white">
              {loading ? (
                <SkeletonTableRows rows={6} cols={7} />
              ) : error ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-red-600 font-semibold">
                    <div className="space-y-2">
                      <p>{error}</p>
                      <button
                        onClick={fetchPayments}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-700 text-xs font-bold hover:bg-red-100 transition"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Retry Loading
                      </button>
                    </div>
                  </td>
                </tr>
              ) : attempts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    No payment attempts recorded yet.
                  </td>
                </tr>
              ) : (
                attempts.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50/70 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-gray-900">
                      {a.booking.bookingNumber}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-gray-800">
                      {a.booking.customerName}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-gray-500">
                      {a.cfOrderId || 'N/A'}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-gray-800">
                      {a.cfPaymentId || (
                        <span className="text-gray-400">Awaiting Capture</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-700">
                      {formatPaise(a.amountPaise)}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={a.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-right text-gray-500 text-[11px]">
                      {formatDateTime(a.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 bg-gray-50/40">
            <span>
              Page <span className="font-bold text-gray-900">{page}</span> of{' '}
              <span className="font-bold text-gray-900">{totalPages}</span>
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-40 transition shadow-xs"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-40 transition shadow-xs"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
