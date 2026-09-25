'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '../../../lib/api-client';
import { formatPaise, formatDate, formatDateTime, StatusBadge, SkeletonTableRows, FoodPreferenceBadge, MemberTypeBadge } from '@cedoi/ui';
import {
  Search,
  Filter,
  Eye,
  RotateCcw,
  Download,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
  ShieldAlert,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react';

interface BookingItem {
  id: string;
  quantity: number;
  unitPricePaise: number;
  totalPricePaise: number;
  ticketType: {
    name: string;
  };
}

interface PaymentAttempt {
  id: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  status: string;
  amountPaise: number;
  createdAt: string;
}

interface RefundRecord {
  id: string;
  amountPaise: number;
  reason: string;
  status: string;
  createdAt: string;
}

interface AdminBooking {
  id: string;
  bookingNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  businessName?: string;
  location?: string;
  memberType?: string;
  membershipCode?: string | null;
  paymentStatus?: string;
  foodPreference?: string;
  totalAmountPaise?: number;
  totalPaise?: number;
  currency: string;
  status: string;
  reservationExpiresAt: string;
  createdAt: string;
  items: BookingItem[];
  paymentAttempts: PaymentAttempt[];
  refunds: RefundRecord[];
  _count: {
    tickets: number;
  };
}

export default function AdminBookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [memberFilter, setMemberFilter] = useState<string>('');
  const [foodFilter, setFoodFilter] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Selected Booking for Details Modal
  const [selectedBooking, setSelectedBooking] = useState<AdminBooking | null>(null);
  const [refundReason, setRefundReason] = useState<string>('');
  const [refundLoading, setRefundLoading] = useState<boolean>(false);
  const [refundError, setRefundError] = useState<string | null>(null);
  const [refundSuccess, setRefundSuccess] = useState<string | null>(null);

  // Member offline payment status actions
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleMarkAsPaid = async (bookingId: string) => {
    setMarkingPaidId(bookingId);
    setActionMessage(null);
    try {
      await apiClient<any>(`api/v1/admin/bookings/${bookingId}/mark-paid`, {
        method: 'POST',
      });
      // Optimistically update local state
      setBookings((prev) =>
        prev.map((b) =>
          b.id === bookingId ? { ...b, paymentStatus: 'PAID', status: 'CONFIRMED' } : b
        )
      );
      if (selectedBooking && selectedBooking.id === bookingId) {
        setSelectedBooking((prev) =>
          prev ? { ...prev, paymentStatus: 'PAID', status: 'CONFIRMED' } : null
        );
      }
      setActionMessage({
        type: 'success',
        text: 'Member payment status marked as PAID successfully.',
      });
      fetchBookings();
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err.message || 'Failed to update member payment status.',
      });
    } finally {
      setMarkingPaidId(null);
    }
  };

  const fetchBookings = async () => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({
        page: page.toString(),
        limit: '15',
        ...(search ? { search } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(memberFilter ? { memberType: memberFilter } : {}),
        ...(foodFilter ? { foodPreference: foodFilter } : {}),
      });

      const res = await apiClient<any>(`api/v1/admin/bookings?${query.toString()}`, { timeoutMs: 12000 });
      setBookings(res.items || []);
      setTotalPages(res.totalPages || 1);
      setTotalCount(res.total || 0);
    } catch (err: any) {
      if (err.code === 'UNAUTHENTICATED') {
        router.replace('/admin/login');
        return;
      }
      setError(err.message || 'Failed to load bookings from database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [page, statusFilter, memberFilter, foodFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchBookings();
  };

  const handleProcessRefund = async () => {
    if (!selectedBooking) return;
    if (!refundReason.trim()) {
      setRefundError('A formal operational refund reason is required.');
      return;
    }

    setRefundLoading(true);
    setRefundError(null);
    setRefundSuccess(null);

    try {
      const res = await apiClient<any>(`api/v1/admin/bookings/${selectedBooking.id}/refund`, {
        method: 'POST',
        body: JSON.stringify({ reason: refundReason }),
      });

      setRefundSuccess(
        `Full refund of ${formatPaise(selectedBooking.totalPaise ?? selectedBooking.totalAmountPaise ?? 0)} processed successfully. Associated tickets have been invalidated.`
      );
      fetchBookings();
    } catch (err: any) {
      setRefundError(err.message || 'Refund processing failed.');
    } finally {
      setRefundLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Bookings & Reservations
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Total of {totalCount} reservations tracked across all customer channels
          </p>
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2 shadow-xs transition-all ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Name, Phone, Company, or City..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-xl text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#08537B] transition"
          />
        </form>

        {/* Quick Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
            {['', 'CONFIRMED', 'PENDING', 'CANCELLED'].map((st) => (
              <button
                key={st}
                onClick={() => {
                  setStatusFilter(st);
                  setPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  statusFilter === st
                    ? 'bg-white text-[#08537B] shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {st || 'All Status'}
              </button>
            ))}
          </div>

          {/* Membership Filter */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
            {[
              { id: '', label: 'All Delegates' },
              { id: 'MEMBER', label: 'Members' },
              { id: 'NON_MEMBER', label: 'Non-Members' },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  setMemberFilter(m.id);
                  setPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  memberFilter === m.id
                    ? 'bg-white text-[#08537B] shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Food Filter */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
            {[
              { id: '', label: 'All Food' },
              { id: 'VEG', label: 'Veg' },
              { id: 'NON_VEG', label: 'Non-Veg' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  setFoodFilter(f.id);
                  setPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  foodFilter === f.id
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="rounded-2xl bg-white border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/80 text-gray-500 uppercase tracking-wider font-semibold border-b border-gray-200">
              <tr>
                <th className="py-3.5 px-4">Booking #</th>
                <th className="py-3.5 px-4">Delegate</th>
                <th className="py-3.5 px-4">Business & City</th>
                <th className="py-3.5 px-4">Membership</th>
                <th className="py-3.5 px-4">Lunch</th>
                <th className="py-3.5 px-4">Passes</th>
                <th className="py-3.5 px-4">Amount</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700 bg-white">
              {loading && bookings.length === 0 ? (
                <SkeletonTableRows rows={6} cols={9} />
              ) : error ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center">
                    <div className="inline-flex flex-col items-center gap-2 p-5 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs max-w-md mx-auto">
                      <ShieldAlert className="w-6 h-6 text-red-600" />
                      <span className="font-bold text-sm">Failed to Load Bookings</span>
                      <span className="text-red-700">{error}</span>
                      <button
                        onClick={fetchBookings}
                        className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-red-100 text-red-800 border border-red-300 rounded-xl font-bold text-xs transition shadow-xs"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Retry Loading
                      </button>
                    </div>
                  </td>
                </tr>
              ) : bookings.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-400">
                    No bookings found matching filter criteria.
                  </td>
                </tr>
              ) : (
                bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50/70 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-gray-900">
                      {b.bookingNumber}
                      <span className="block text-[10px] text-gray-400 font-normal">
                        {formatDateTime(b.createdAt)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-gray-900">{b.customerName}</p>
                      <p className="text-[11px] text-gray-500">{b.customerPhone}</p>
                      {b.customerEmail && (
                        <p className="text-[10px] text-gray-400 truncate max-w-[150px]">{b.customerEmail}</p>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-gray-800">{b.businessName || '—'}</p>
                      <p className="text-[11px] text-gray-500">{b.location || 'Madurai'}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        <MemberTypeBadge memberType={b.memberType} size="sm" />
                        {b.membershipCode && (
                          <span className="font-mono text-[10px] font-bold text-blue-900 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded block w-fit">
                            ID: {b.membershipCode}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <FoodPreferenceBadge preference={b.foodPreference} size="sm" />
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-gray-50 border border-gray-200 font-mono font-semibold text-gray-700">
                        {b.items.reduce((sum, item) => sum + item.quantity, 0)} Adm
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-700">
                      {formatPaise(b.totalPaise ?? b.totalAmountPaise ?? 0)}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1 items-start">
                        <StatusBadge status={b.status} size="sm" />
                        {b.memberType === 'MEMBER' && (
                          <div>
                            {b.paymentStatus === 'PAID' ? (
                              <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] tracking-wide">
                                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                                <span>PAID</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full text-[10px] tracking-wide">
                                <Clock className="w-2.5 h-2.5 text-amber-600" />
                                <span>PENDING (Offline)</span>
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-2">
                        {b.memberType === 'MEMBER' && b.paymentStatus !== 'PAID' && (
                          <button
                            onClick={() => handleMarkAsPaid(b.id)}
                            disabled={markingPaidId === b.id}
                            className="h-8 px-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-800 border border-emerald-300 text-xs font-bold whitespace-nowrap inline-flex items-center gap-1.5 transition shadow-xs disabled:opacity-50"
                            title="Mark Member Payment as Received & Verified"
                          >
                            {markingPaidId === b.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-700" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            )}
                            <span>Mark Paid</span>
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedBooking(b);
                            setRefundReason('');
                            setRefundError(null);
                            setRefundSuccess(null);
                          }}
                          className="h-8 px-3 rounded-lg bg-white hover:bg-gray-50 active:bg-gray-100 text-gray-700 border border-gray-300 text-xs font-semibold whitespace-nowrap inline-flex items-center gap-1.5 transition shadow-xs"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#08537B] shrink-0" />
                          <span>Inspect</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
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

      {/* Booking Details / Refund Action Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                  Booking Inspection
                </span>
                <h3 className="text-lg font-mono font-bold text-gray-900">
                  {selectedBooking.bookingNumber}
                </h3>
              </div>
              <button
                onClick={() => setSelectedBooking(null)}
                className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Member Payment Verification Banner in Modal */}
            {selectedBooking.memberType === 'MEMBER' && selectedBooking.paymentStatus !== 'PAID' && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div>
                  <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-700" />
                    <span>Offline Member Payment Pending</span>
                  </h4>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    Member registered with code <strong>{selectedBooking.membershipCode || 'N/A'}</strong>. Passes and QR codes are active. Once internal payment or dues are confirmed, mark as paid.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleMarkAsPaid(selectedBooking.id)}
                  disabled={markingPaidId === selectedBooking.id}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition disabled:opacity-60 shrink-0"
                >
                  {markingPaidId === selectedBooking.id ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Mark as Paid</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Customer & Status Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs bg-gray-50 p-4 rounded-2xl border border-gray-200">
              <div>
                <span className="text-gray-500 block">Delegate</span>
                <span className="font-bold text-gray-900">{selectedBooking.customerName}</span>
                <span className="text-[11px] text-gray-500 block">{selectedBooking.customerPhone}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Company / City</span>
                <span className="font-bold text-gray-900">{selectedBooking.businessName || '—'}</span>
                <span className="text-[11px] text-gray-500 block">{selectedBooking.location || 'Madurai'}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Membership</span>
                <div className="space-y-1 mt-0.5">
                  <MemberTypeBadge memberType={selectedBooking.memberType} size="sm" />
                  {selectedBooking.membershipCode ? (
                    <span className="font-mono text-[10px] font-bold text-blue-900 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded block w-fit">
                      ID: {selectedBooking.membershipCode}
                    </span>
                  ) : (
                    <span className="text-[10px] text-gray-400 block">Non-Member</span>
                  )}
                </div>
              </div>
              <div>
                <span className="text-gray-500 block">Lunch & Total</span>
                <div className="mt-0.5 space-y-1">
                  <FoodPreferenceBadge preference={selectedBooking.foodPreference} size="sm" />
                  <span className="font-bold font-mono text-emerald-700 block">
                    {formatPaise(selectedBooking.totalPaise ?? selectedBooking.totalAmountPaise ?? 0)}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-gray-500 block">Status & Payment</span>
                <div className="space-y-1 mt-0.5">
                  <StatusBadge status={selectedBooking.status} size="sm" />
                  {selectedBooking.memberType === 'MEMBER' && (
                    <div>
                      {selectedBooking.paymentStatus === 'PAID' ? (
                        <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded text-[10px]">
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                          <span>PAID</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded text-[10px]">
                          <Clock className="w-2.5 h-2.5 text-amber-600" />
                          <span>PENDING (Offline)</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Items Breakdown */}
            <div>
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Purchased Admissions
              </h4>
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-500">
                    <tr>
                      <th className="py-2.5 px-3">Pass Type</th>
                      <th className="py-2.5 px-3 text-center">Qty</th>
                      <th className="py-2.5 px-3 text-right">Unit Price</th>
                      <th className="py-2.5 px-3 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-800 bg-white">
                    {selectedBooking.items.map((item) => (
                      <tr key={item.id}>
                        <td className="py-2 px-3 font-semibold">{item.ticketType.name}</td>
                        <td className="py-2 px-3 text-center font-mono">{item.quantity}</td>
                        <td className="py-2 px-3 text-right font-mono text-gray-500">
                          {formatPaise(item.unitPricePaise)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                          {formatPaise(item.totalPricePaise)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Payment Attempts */}
            <div>
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Payment Attempts & Provider Facts
              </h4>
              <div className="space-y-2">
                {selectedBooking.paymentAttempts.length === 0 ? (
                  <p className="text-xs text-gray-400">No payment attempts registered yet.</p>
                ) : (
                  selectedBooking.paymentAttempts.map((p) => (
                    <div
                      key={p.id}
                      className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs flex items-center justify-between"
                    >
                      <div>
                        <span className="font-mono text-gray-900 font-bold block">
                          Order: {p.razorpayOrderId || 'N/A'}
                        </span>
                        <span className="text-[11px] text-gray-500">
                          Payment ID: {p.razorpayPaymentId || 'Awaiting Provider Capture'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-emerald-700 block">
                          {formatPaise(p.amountPaise)}
                        </span>
                        <span className="text-[10px] text-gray-500 font-bold uppercase">
                          {p.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Existing Refunds */}
            {selectedBooking.refunds.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-rose-700 uppercase tracking-wider mb-2">
                  Processed Refunds
                </h4>
                <div className="space-y-2">
                  {selectedBooking.refunds.map((r) => (
                    <div
                      key={r.id}
                      className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs flex items-center justify-between text-rose-800"
                    >
                      <div>
                        <p className="font-semibold">Reason: {r.reason}</p>
                        <p className="text-[10px] text-rose-600">
                          Settled at {formatDateTime(r.createdAt)}
                        </p>
                      </div>
                      <div className="text-right font-mono font-bold text-rose-700">
                        {formatPaise(r.amountPaise)} ({r.status})
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
