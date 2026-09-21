'use client';

import React, { useEffect, useState } from 'react';
import { apiClient } from '../../../lib/api-client';
import { formatDateTime, StatusBadge, SkeletonTableRows } from '@cedoi/ui';
import {
  RefreshCw,
  MapPin,
  User,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';

interface CheckInRecord {
  id: string;
  checkedInAt: string;
  result: string;
  ipAddress?: string;
  ticket: {
    ticketNumber: string;
    admissionIndex: number;
    ticketType: {
      name: string;
    };
    booking: {
      bookingNumber: string;
      customerName: string;
    };
  };
  gate?: {
    name: string;
    gateCode: string;
  };
  staffUser: {
    fullName?: string;
    name?: string;
    email: string;
  };
}

export default function AdminCheckInsPage() {
  const [checkIns, setCheckIns] = useState<CheckInRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  const fetchCheckIns = async () => {
    setLoading(true);
    try {
      const res = await apiClient<any>(`api/v1/admin/check-ins?page=${page}&limit=20`);
      setCheckIns(res.items || []);
      setTotalPages(res.totalPages || 1);
      setTotalCount(res.total || 0);
    } catch (err: any) {
      console.error('Failed to load check-ins:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCheckIns();
  }, [page]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Gate Check-Ins & Audit
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Real-time audit log of all gate scan attempts with atomic database concurrency
          </p>
        </div>

        <button
          onClick={fetchCheckIns}
          disabled={loading}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 border border-gray-300 shadow-xs transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Live Refresh
        </button>
      </div>

      {/* Check-ins Table */}
      <div className="rounded-2xl bg-white border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white">
          <h2 className="text-sm font-bold text-gray-900 tracking-tight">
            Admissions Timeline ({totalCount} entries)
          </h2>
          <span className="text-xs font-semibold text-gray-500 bg-gray-50 px-2.5 py-0.5 rounded border border-gray-200">
            Single-entry enforced
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/80 text-gray-500 uppercase tracking-wider font-semibold border-b border-gray-200">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Ticket Number</th>
                <th className="py-3.5 px-4 font-semibold">Category</th>
                <th className="py-3.5 px-4 font-semibold">Attendee / Buyer</th>
                <th className="py-3.5 px-4 font-semibold">Gate & Terminal</th>
                <th className="py-3.5 px-4 font-semibold">Staff Validator</th>
                <th className="py-3.5 px-4 font-semibold">Scan Result</th>
                <th className="py-3.5 px-4 text-right font-semibold">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700 bg-white">
              {loading && checkIns.length === 0 ? (
                <SkeletonTableRows rows={6} cols={6} />
              ) : checkIns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    No check-in activity recorded yet. Scans from mobile staff terminals will appear here.
                  </td>
                </tr>
              ) : (
                checkIns.map((ci) => (
                  <tr key={ci.id} className="hover:bg-gray-50/70 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-gray-900">
                      {ci.ticket?.ticketNumber || 'N/A'}
                      <span className="block text-[10px] text-gray-400 font-normal">
                        Adm #{ci.ticket?.admissionIndex || 1}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-gray-900">
                        {ci.ticket?.ticketType?.name || 'General Admission'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-gray-900">
                        {ci.ticket?.booking?.customerName || 'Guest'}
                      </p>
                      <p className="text-[10px] font-mono text-gray-500">
                        {ci.ticket?.booking?.bookingNumber}
                      </p>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 text-gray-800 font-semibold">
                        <MapPin className="w-3 h-3 text-[#EE8518]" />
                        {ci.gate?.name || 'Assigned Gate'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 text-gray-700">
                        <User className="w-3 h-3 text-gray-400" />
                        {ci.staffUser?.name || ci.staffUser?.fullName || 'Gate Staff'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={ci.result} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-right text-gray-500 text-[11px]">
                      {formatDateTime(ci.checkedInAt)}
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
    </div>
  );
}
