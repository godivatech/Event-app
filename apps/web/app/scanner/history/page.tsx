'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '../../../lib/api-client';
import { CheckInResult } from '@cedoi/contracts';
import { StatusBadge, formatDateTime } from '@cedoi/ui';
import {
  History,
  RefreshCw,
  Loader2,
  MapPin,
  Ticket,
  Clock,
  AlertCircle,
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
    ticketType: {
      name: string;
    };
  };
  gate?: {
    name: string;
    gateCode: string;
  };
}

export default function ScannerHistoryPage() {
  const router = useRouter();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient<HistoryItem[]>('api/v1/check-in/history', { timeoutMs: 10000 });
      setHistory(data || []);
    } catch (err: any) {
      if (
        err.code === 'UNAUTHENTICATED' ||
        err.message?.includes('Authentication required') ||
        err.message?.includes('401') ||
        err.message?.includes('Unauthorized')
      ) {
        if (typeof window !== 'undefined') {
          try {
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
    fetchHistory();
  }, []);

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
          onClick={fetchHistory}
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
          history.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-2xl bg-white border border-gray-200 hover:border-gray-300 transition shadow-xs space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-gray-900 tracking-wider">
                  {item.ticket?.ticketNumber || 'UNKNOWN'}
                </span>
                <StatusBadge status={item.result} size="sm" />
              </div>

              <div className="flex items-center justify-between text-xs text-gray-600">
                <span className="font-semibold text-gray-800">
                  {item.ticket?.ticketType?.name || 'General Admission'}
                  {item.ticket?.admissionIndex ? ` (#${item.ticket.admissionIndex})` : ''}
                </span>
                <span className="flex items-center gap-1 text-[11px] text-gray-500 font-medium">
                  <MapPin className="w-3 h-3 text-[#EE8518]" />
                  {item.gate?.name || 'Gate Terminal'}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-[11px] text-gray-400">
                <span className="flex items-center gap-1 text-gray-500">
                  <Clock className="w-3 h-3" />
                  {formatDateTime(item.checkedInAt)}
                </span>
                <span className="font-mono text-gray-400 text-[10px]">
                  Req: {item.requestId.slice(0, 8)}...
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
