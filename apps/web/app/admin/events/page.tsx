'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '../../../lib/api-client';
import { formatPaise, Skeleton } from '@cedoi/ui';
import {
  Calendar,
  MapPin,
  Clock,
  Ticket,
  Users,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';

interface AdminEvent {
  id: string;
  slug: string;
  name: string;
  tagline?: string;
  description: string;
  venue: string;
  address: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  status: string;
  totalCapacity?: number;
  ticketTypes: Array<{
    id: string;
    name: string;
    unitPricePaise: number;
    capacity: number;
  }>;
  gates: Array<{
    id: string;
    name: string;
    gateCode: string;
  }>;
  _count: {
    bookings: number;
    checkIns: number;
  };
}

export default function AdminEventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient<AdminEvent[]>('api/v1/events/admin/all', { timeoutMs: 12000 });
      setEvents(data || []);
    } catch (err: any) {
      if (err.code === 'UNAUTHENTICATED') {
        router.replace('/admin/login');
        return;
      }
      setError(err.message || 'Failed to load events catalog.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Events Configuration
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Manage event admissions, gates, venue, and public availability
          </p>
        </div>

        <button
          onClick={fetchEvents}
          disabled={loading}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 border border-gray-300 shadow-xs transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {loading && events.length === 0 ? (
        <div className="space-y-6">
          <div className="rounded-3xl bg-white border border-gray-200 p-6 space-y-6 shadow-xs animate-pulse">
            <div className="flex justify-between items-start pb-5 border-b border-gray-100">
              <div className="space-y-2">
                <Skeleton className="h-7 w-72 rounded-lg" />
                <Skeleton className="h-4 w-56 rounded-md" />
              </div>
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Skeleton className="h-12 rounded-xl" />
              <Skeleton className="h-12 rounded-xl" />
              <Skeleton className="h-12 rounded-xl" />
            </div>
            <div className="pt-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-4">
              <Skeleton className="h-32 rounded-2xl" />
              <Skeleton className="h-32 rounded-2xl" />
              <Skeleton className="h-32 rounded-2xl" />
            </div>
          </div>
        </div>
      ) : error ? (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs">
          {error}
        </div>
      ) : (
        <div className="space-y-6">
          {events.map((ev) => (
            <div
              key={ev.id}
              className="rounded-3xl bg-white border border-gray-200 p-6 space-y-6 shadow-xs"
            >
              {/* Event Title & Actions */}
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-5 border-b border-gray-100">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-gray-900 tracking-tight">{ev.name}</h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {ev.status}
                    </span>
                  </div>
                  {ev.tagline && (
                    <p className="text-xs text-[#EE8518] font-semibold mt-1">
                      {ev.tagline}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-2 max-w-3xl leading-relaxed">
                    {ev.description}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/events/${ev.slug}`}
                    target="_blank"
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#08537B] hover:bg-[#074769] text-white text-xs font-semibold shadow-xs transition"
                  >
                    <span>Public Portal</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Event Metadata Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-1">
                  <span className="text-gray-500 flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px]">
                    <Calendar className="w-3.5 h-3.5 text-[#08537B]" />
                    Date & Admission Time
                  </span>
                  <p className="font-semibold text-gray-900">
                    {new Date(ev.startsAt).toLocaleDateString(undefined, {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                  <p className="text-gray-500 text-[11px]">
                    {new Date(ev.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} –{' '}
                    {new Date(ev.endsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (
                    {ev.timezone})
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-1">
                  <span className="text-gray-500 flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px]">
                    <MapPin className="w-3.5 h-3.5 text-purple-600" />
                    Venue Location
                  </span>
                  <p className="font-semibold text-gray-900">{ev.venue}</p>
                  <p className="text-gray-500 text-[11px] truncate">{ev.address}</p>
                </div>

                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-1">
                  <span className="text-gray-500 flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px]">
                    <Users className="w-3.5 h-3.5 text-emerald-600" />
                    Admissions Engagement
                  </span>
                  <p className="font-semibold text-gray-900">
                    {ev._count.bookings} Bookings
                  </p>
                  <p className="text-gray-500 text-[11px]">
                    {ev._count.checkIns} Scans Admitted at Gates
                  </p>
                </div>
              </div>

              {/* Categories & Gates Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {/* Categories */}
                <div>
                  <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2.5 flex items-center gap-2">
                    <Ticket className="w-4 h-4 text-[#EE8518]" />
                    Configured Event Pass
                  </h3>
                  <div className="rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
                        <tr>
                          <th className="py-2.5 px-3">Pass Type</th>
                          <th className="py-2.5 px-3">Unit Price</th>
                          <th className="py-2.5 px-3 text-right">Capacity</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-gray-700 bg-white">
                        {ev.ticketTypes.map((tt) => (
                          <tr key={tt.id} className="hover:bg-gray-50/70">
                            <td className="py-2.5 px-3 font-semibold text-gray-900">{tt.name}</td>
                            <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">
                              {formatPaise(tt.unitPricePaise)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-gray-900">
                              {tt.capacity.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Gates */}
                <div>
                  <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2.5 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    Designated Check-In Gates
                  </h3>
                  <div className="rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
                        <tr>
                          <th className="py-2.5 px-3">Gate Identifier</th>
                          <th className="py-2.5 px-3">Gate Code</th>
                          <th className="py-2.5 px-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-gray-700 bg-white">
                        {ev.gates.map((g) => (
                          <tr key={g.id} className="hover:bg-gray-50/70">
                            <td className="py-2.5 px-3 font-semibold text-gray-900">{g.name}</td>
                            <td className="py-2.5 px-3 font-mono text-amber-700 font-bold">{g.gateCode}</td>
                            <td className="py-2.5 px-3 text-right">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                ACTIVE
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
