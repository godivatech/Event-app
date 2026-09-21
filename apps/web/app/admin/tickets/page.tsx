'use client';

import React, { useEffect, useState } from 'react';
import { apiClient } from '../../../lib/api-client';
import { formatDateTime, StatusBadge, SkeletonTableRows, FoodPreferenceBadge, MemberTypeBadge } from '@cedoi/ui';
import {
  Ticket as TicketIcon,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';

interface AdminTicket {
  id: string;
  ticketNumber: string;
  status: string;
  admissionIndex: number;
  createdAt: string;
  attendeeName?: string;
  attendeeEmail?: string;
  attendeePhone?: string;
  businessName?: string;
  location?: string;
  memberType?: string;
  foodPreference?: string;
  ticketType: {
    name: string;
    unitPricePaise: number;
  };
  booking: {
    bookingNumber: string;
    customerName: string;
    customerPhone: string;
    businessName?: string;
    location?: string;
    memberType?: string;
    foodPreference?: string;
  };
  checkIns: Array<{
    checkedInAt: string;
    gate?: {
      name: string;
    };
    staffUser?: {
      fullName?: string;
      name?: string;
    };
  }>;
}

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [memberFilter, setMemberFilter] = useState<string>('');
  const [foodFilter, setFoodFilter] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page: page.toString(),
        limit: '15',
        ...(search ? { search } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(memberFilter ? { memberType: memberFilter } : {}),
        ...(foodFilter ? { foodPreference: foodFilter } : {}),
      });

      const res = await apiClient<any>(`api/v1/admin/tickets?${query.toString()}`);
      setTickets(res.tickets);
      setTotalPages(res.totalPages || 1);
      setTotalCount(res.total || 0);
    } catch (err: any) {
      console.error('Failed to load tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [page, statusFilter, memberFilter, foodFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchTickets();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Issued Digital Tickets
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Total of {totalCount} individual admission credentials generated
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearch} className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Ticket #, Name, Business..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-xl text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#08537B] transition"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
            {['', 'ACTIVE', 'USED', 'CANCELLED'].map((st) => (
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

      {/* Tickets Table */}
      <div className="rounded-2xl bg-white border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/80 text-gray-500 uppercase tracking-wider font-semibold border-b border-gray-200">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Ticket Number</th>
                <th className="py-3.5 px-4 font-semibold">Category</th>
                <th className="py-3.5 px-4 font-semibold">Booking #</th>
                <th className="py-3.5 px-4 font-semibold">Delegate</th>
                <th className="py-3.5 px-4 font-semibold">Business & Location</th>
                <th className="py-3.5 px-4 font-semibold">Membership</th>
                <th className="py-3.5 px-4 font-semibold">Lunch</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold">Gate Admission</th>
                <th className="py-3.5 px-4 text-right font-semibold">PDF Download</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700 bg-white">
              {loading && tickets.length === 0 ? (
                <SkeletonTableRows rows={6} cols={10} />
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-gray-400">
                    No tickets found matching criteria.
                  </td>
                </tr>
              ) : (
                tickets.map((t) => {
                  const checkIn = t.checkIns && t.checkIns.length > 0 ? t.checkIns[0] : null;
                  const attendeeName = t.attendeeName || t.booking.customerName;
                  const attendeePhone = t.attendeePhone || t.booking.customerPhone;
                  const businessName = t.businessName || t.booking.businessName;
                  const location = t.location || t.booking.location || 'Madurai';
                  const isMember = (t.memberType || t.booking.memberType) === 'MEMBER';
                  const isNonVeg = (t.foodPreference || t.booking.foodPreference) === 'NON_VEG';

                  return (
                    <tr key={t.id} className="hover:bg-gray-50/70 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-gray-900">
                        {t.ticketNumber}
                        <span className="block text-[10px] text-gray-400 font-normal">
                          Admission #{t.admissionIndex}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-gray-900">{t.ticketType.name}</span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-gray-600">
                        {t.booking.bookingNumber}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-gray-900">{attendeeName}</span>
                        <span className="block text-[11px] text-gray-400">
                          {attendeePhone}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-gray-900 block">{businessName || '—'}</span>
                        <span className="text-[11px] text-gray-400 flex items-center gap-1">
                          <MapPin className="w-3 h-3 inline text-gray-400" />
                          {location}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <MemberTypeBadge memberType={t.memberType || t.booking.memberType} size="sm" />
                      </td>
                      <td className="py-3.5 px-4">
                        <FoodPreferenceBadge preference={t.foodPreference || t.booking.foodPreference} size="sm" />
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={t.status} size="sm" />
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        {checkIn ? (
                          <div>
                            <span className="flex items-center gap-1 font-semibold text-emerald-700">
                              <MapPin className="w-3 h-3" />
                              {checkIn.gate?.name || 'Assigned Gate'}
                            </span>
                            <span className="text-[10px] text-gray-500 block">
                              {formatDateTime(checkIn.checkedInAt)} by{' '}
                              {checkIn.staffUser?.name || checkIn.staffUser?.fullName || 'Staff'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-[11px]">Awaiting Gate Scan</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <a
                          href={`/api/v1/tickets/${t.booking.bookingNumber}/pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 text-xs font-semibold transition shadow-xs"
                        >
                          <Download className="w-3.5 h-3.5 text-[#08537B]" />
                          PDF
                        </a>
                      </td>
                    </tr>
                  );
                })
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
