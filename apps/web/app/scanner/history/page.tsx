'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '../../../lib/api-client';
import { CheckInResult } from '@cedoi/contracts';
import { StatusBadge, formatDateTime } from '@cedoi/ui';
import {
  History,
  RefreshCw,
  MapPin,
  Ticket,
  Clock,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { ScannerHistorySkeleton } from '../../../components/skeletons';

interface HistoryItem {
  id: string;
  ticketId: string;
  eventId: string;
  gateId?: string;
  requestId: string;
  result: CheckInResult;
  checkedInAt: string;
  ticket: {
    ticketNumber: string;
    admissionIndex: number;
    status: string;
    attendeeName?: string | null;
    businessName?: string | null;
    memberType?: string | null;
    foodPreference?: string | null;
    ticketType: {
      name: string;
    };
    booking?: {
      customerName: string;
      businessName?: string | null;
      memberType?: string | null;
      foodPreference?: string | null;
    } | null;
  };
  gate?: {
    name: string;
    gateCode: string;
  };
}

interface PaginatedHistoryResponse {
  items: HistoryItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function ScannerHistoryPage() {
  const router = useRouter();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const pageSize = 10;

  const fetchHistory = async (targetPage = page) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient<PaginatedHistoryResponse | HistoryItem[]>(
        `api/v1/check-in/history?page=${targetPage}&limit=${pageSize}`,
        { timeoutMs: 10000 }
      );

      if (Array.isArray(data)) {
        setHistory(data);
        setTotalPages(1);
        setTotalCount(data.length);
      } else if (data && typeof data === 'object') {
        setHistory(data.items || []);
        setTotalPages(data.totalPages || 1);
        setTotalCount(data.total || 0);
      } else {
        setHistory([]);
        setTotalPages(1);
        setTotalCount(0);
      }
    } catch (err: any) {
      if (
        err.code === 'UNAUTHENTICATED' ||
        err.message?.includes('Authentication required') ||
        err.message?.includes('401') ||
        err.message?.includes('Unauthorized')
      ) {
        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem('cedoi_scanner_token');
            localStorage.removeItem('cedoi_staff_token');
          } catch {}
        }
        router.replace('/scanner/login');
        return;
      }
      setError(err.message || 'Failed to load check-in records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory(page);
  }, [page]);

  const handlePrev = () => {
    if (page > 1) {
      setPage((p) => p - 1);
    }
  };

  const handleNext = () => {
    if (page < totalPages) {
      setPage((p) => p + 1);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 max-w-2xl mx-auto w-full space-y-4">
      {/* Page Header (Airbnb Light Style) */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 text-[#08537B] border border-blue-100 shadow-2xs">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 tracking-tight">Recent Scans</h1>
            <p className="text-xs text-gray-500">Your terminal scan admissions</p>
          </div>
        </div>

        <button
          onClick={() => fetchHistory(page)}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 border border-gray-300 shadow-xs transition disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 space-y-3 overflow-y-auto">
        {loading && history.length === 0 ? (
          <ScannerHistorySkeleton />
        ) : error ? (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <div>
              <p className="font-bold">Error loading scan history</p>
              <p className="text-rose-600">{error}</p>
            </div>
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-16 px-4 bg-white rounded-3xl border border-gray-200 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-gray-50 text-gray-400 border border-gray-200 flex items-center justify-center mx-auto mb-3">
              <Ticket className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-sm font-bold text-gray-900">No Check-ins Recorded</p>
            <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
              Admissions scanned during your active shift will appear here.
            </p>
          </div>
        ) : (
          history.map((item) => {
            const attendeeName =
              item.ticket?.attendeeName ||
              item.ticket?.booking?.customerName ||
              'Admitted Attendee';
            const businessName =
              item.ticket?.businessName ||
              item.ticket?.booking?.businessName;
            const foodPref =
              item.ticket?.foodPreference ||
              item.ticket?.booking?.foodPreference;
            const memberType =
              item.ticket?.memberType ||
              item.ticket?.booking?.memberType;

            return (
              <div
                key={item.id}
                className="p-4 rounded-2xl bg-white border border-gray-200 hover:border-gray-300 transition shadow-xs space-y-3"
              >
                {/* Header: Attendee Name & Status Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-gray-900 truncate">
                      {attendeeName}
                    </h3>
                    {businessName && (
                      <p className="text-xs text-gray-500 truncate font-medium mt-0.5">
                        {businessName}
                      </p>
                    )}
                  </div>
                  <StatusBadge status={item.result} size="sm" />
                </div>

                {/* Badges & Pass Classification */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-[#08537B] border border-blue-200">
                    {item.ticket?.ticketType?.name || 'Event Pass'}
                    {item.ticket?.admissionIndex ? ` (#${item.ticket.admissionIndex})` : ''}
                  </span>

                  {foodPref && (
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                        foodPref.toUpperCase() === 'VEG'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}
                    >
                      {foodPref.toUpperCase() === 'VEG' ? '🥬 VEG' : '🍗 NON-VEG'}
                    </span>
                  )}

                  {memberType && memberType !== 'NON_MEMBER' && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                      CEDOI Member
                    </span>
                  )}
                </div>

                {/* Footer: Ticket Number, Gate, and Timestamp */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pt-2.5 border-t border-gray-100 text-[11px] text-gray-500">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-medium text-gray-700">
                      {item.ticket?.ticketNumber || 'UNKNOWN'}
                    </span>
                    <span className="flex items-center gap-1 text-[#EE8518] font-medium">
                      <MapPin className="w-3 h-3" />
                      {item.gate?.name || 'Gate Terminal'}
                    </span>
                  </div>
                  <span className="flex items-center gap-1 text-gray-400">
                    <Clock className="w-3 h-3" />
                    {formatDateTime(item.checkedInAt)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Simple Pagination Controls */}
      {totalCount > 0 && totalPages > 1 && (
        <div className="p-3 bg-white rounded-2xl border border-gray-200 flex items-center justify-between text-xs text-gray-600 shadow-2xs mt-2">
          <span className="text-xs text-gray-500">
            Page <span className="font-bold text-gray-900">{page}</span> of{' '}
            <span className="font-bold text-gray-900">{totalPages}</span>
            <span className="hidden sm:inline text-gray-400 ml-1">({totalCount} scans)</span>
          </span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrev}
              disabled={page <= 1 || loading}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-xs font-semibold text-gray-700 border border-gray-200 transition disabled:opacity-40 disabled:hover:bg-gray-50 cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Prev</span>
            </button>
            <button
              onClick={handleNext}
              disabled={page >= totalPages || loading}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-xs font-semibold text-gray-700 border border-gray-200 transition disabled:opacity-40 disabled:hover:bg-gray-50 cursor-pointer disabled:cursor-not-allowed"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
