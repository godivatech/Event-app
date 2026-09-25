'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '../../../lib/api-client';
import { formatPaise, formatDateTime, StatusBadge, SkeletonTableRows } from '@cedoi/ui';
import {
  CreditCard,
  RotateCcw,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ShieldCheck,
  ShieldAlert,
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

interface RefundRecord {
  id: string;
  amountPaise: number;
  reason: string;
  status: string;
  createdAt: string;
  booking: {
    bookingNumber: string;
    customerName: string;
  };
}

export default function AdminPaymentsPage() {
  const router = useRouter();
  const [attempts, setAttempts] = useState<PaymentAttempt[]>([]);
  const [refunds, setRefunds] = useState<RefundRecord[]>([]);
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
      setRefunds(res.refunds || []);
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
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Payments & Settlement Records
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Authoritative provider transaction facts with idempotent capture and refund records
          </p>
        </div>

        <button
          onClick={fetchPayments}
          disabled={loading}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 border border-gray-300 shadow-xs transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Ledger
        </button>
      </div>

      {/* Financial Security Banner */}
      <div className="p-5 rounded-2xl bg-blue-50/70 border border-blue-100 text-xs text-blue-950 flex items-start gap-3 shadow-xs">
        <ShieldCheck className="w-5 h-5 text-[#08537B] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-blue-900">Cryptographic Verification & Deduplication Guarantee</p>
          <p className="text-blue-800 leading-relaxed">
            All captured payments undergo HMAC SHA-256 signature validation against Cashfree webhook secrets and Checkout payloads. Late captures allocate capacity if available, or trigger automatic compensating refunds without overselling.
          </p>
        </div>
      </div>

      {/* Payment Attempts Ledger */}
      <div className="rounded-2xl bg-white border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white">
          <h2 className="text-sm font-bold text-gray-900 tracking-tight">
            Gateway Attempts ({totalAttempts})
          </h2>
          <span className="text-xs font-semibold text-gray-500 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
            Provider: Cashfree Payments (PG v2023-08-01)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/80 text-gray-500 uppercase tracking-wider font-semibold border-b border-gray-200">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Booking #</th>
                <th className="py-3.5 px-4 font-semibold">Customer</th>
                <th className="py-3.5 px-4 font-semibold">Cashfree Order ID</th>
                <th className="py-3.5 px-4 font-semibold">Cashfree Payment ID</th>
                <th className="py-3.5 px-4 font-semibold">Amount</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 text-right font-semibold">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700 bg-white">
              {loading && attempts.length === 0 ? (
                <SkeletonTableRows rows={6} cols={7} />
              ) : error ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center">
                    <div className="inline-flex flex-col items-center gap-2 p-5 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs max-w-md mx-auto">
                      <ShieldAlert className="w-6 h-6 text-red-600" />
                      <span className="font-bold text-sm">Failed to Load Payments</span>
                      <span className="text-red-700">{error}</span>
                      <button
                        onClick={fetchPayments}
                        className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-red-100 text-red-800 border border-red-300 rounded-xl font-bold text-xs transition shadow-xs"
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
                    No payment attempts found in database.
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
      </div>

      {/* Refunds Section */}
      <div className="rounded-2xl bg-white border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-rose-600" />
            <h2 className="text-sm font-bold text-gray-900 tracking-tight">
              Settled Refunds & Reversals ({refunds.length})
            </h2>
          </div>
          <span className="text-xs font-semibold text-gray-500 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
            Tracked with unique operation references
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/80 text-gray-500 uppercase tracking-wider font-semibold border-b border-gray-200">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Booking #</th>
                <th className="py-3.5 px-4 font-semibold">Customer</th>
                <th className="py-3.5 px-4 font-semibold">Refund Reason</th>
                <th className="py-3.5 px-4 font-semibold">Amount</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 text-right font-semibold">Settled At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700 bg-white">
              {refunds.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400">
                    No refunds processed for this event.
                  </td>
                </tr>
              ) : (
                refunds.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/70 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-gray-900">
                      {r.booking.bookingNumber}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-gray-800">
                      {r.booking.customerName}
                    </td>
                    <td className="py-3.5 px-4 text-gray-700">{r.reason}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-rose-600">
                      {formatPaise(r.amountPaise)}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={r.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-right text-gray-500 text-[11px]">
                      {formatDateTime(r.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
