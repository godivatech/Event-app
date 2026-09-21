'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiClient } from '../../../lib/api-client';
import { AdminDashboardMetricsDto } from '@cedoi/contracts';
import { formatPaise, VegVectorIcon, NonVegVectorIcon } from '@cedoi/ui';
import {
  Users,
  CreditCard,
  Ticket,
  Clock,
  CheckCircle2,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  Download,
  ChevronRight,
  Utensils,
  Award,
} from 'lucide-react';
import { AdminDashboardSkeleton } from '../../../components/skeletons';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<AdminDashboardMetricsDto | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient<AdminDashboardMetricsDto>('api/v1/admin/metrics', { timeoutMs: 12000 });
      setMetrics(data);
    } catch (err: any) {
      if (err.code === 'UNAUTHENTICATED') {
        router.replace('/admin/login');
        return;
      }
      setError(err.message || 'Failed to load authoritative metrics from database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  if (loading && !metrics) {
    return (
      <div className="space-y-8 max-w-7xl mx-auto">
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <div className="h-8 w-64 bg-slate-200 rounded-lg animate-pulse" />
            <div className="h-4 w-96 bg-slate-200 rounded-md animate-pulse" />
          </div>
        </div>
        <AdminDashboardSkeleton />
      </div>
    );
  }

  if (error && !metrics) {
    return (
      <div className="p-6 rounded-2xl bg-white border border-red-200 shadow-xs text-gray-900">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-red-600 shrink-0" />
          <div>
            <h3 className="font-bold text-base text-gray-900">Metrics Unavailable</h3>
            <p className="text-xs text-gray-500 mt-0.5">{error}</p>
          </div>
        </div>
        <button
          onClick={fetchMetrics}
          className="mt-4 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-semibold transition"
        >
          Retry Calculation
        </button>
      </div>
    );
  }

  const checkInRate =
    metrics && metrics.tickets.totalSold > 0
      ? Math.round((metrics.tickets.totalCheckedIn / metrics.tickets.totalSold) * 100)
      : 0;

  const soldRate =
    metrics && metrics.tickets.totalCapacity > 0
      ? Math.round((metrics.tickets.totalSold / metrics.tickets.totalCapacity) * 100)
      : 0;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Event Command Center
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Live Database Feed
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Real-time authoritative aggregates from PostgreSQL 18 with row-level reservation guarantees.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchMetrics}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 border border-gray-300 shadow-xs transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <Link
            href="/admin/reports"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#08537B] hover:bg-[#074769] text-xs font-semibold text-white shadow-xs transition"
          >
            <Download className="w-3.5 h-3.5" />
            CSV Reports
          </Link>
        </div>
      </div>

      {/* Primary KPI Metric Cards (Airbnb clean white cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Captured Revenue */}
        <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-xs hover:shadow-sm transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Gross Collections
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-gray-900 tracking-tight">
              {metrics ? formatPaise(metrics.financials.grossCollectionsPaise) : '₹0'}
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
              <span>Captured Payments</span>
              <span className="text-emerald-700 font-bold font-mono">
                Net: {metrics ? formatPaise(metrics.financials.netCollectionsPaise) : '₹0'}
              </span>
            </div>
          </div>
        </div>

        {/* Tickets Sold */}
        <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-xs hover:shadow-sm transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Admissions Sold
            </span>
            <div className="p-2 rounded-xl bg-blue-50 text-[#08537B] border border-blue-100">
              <Ticket className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-gray-900 tracking-tight">
              {metrics?.tickets.totalSold.toLocaleString()}
              <span className="text-sm font-normal text-gray-400 ml-1">
                / {metrics?.tickets.totalCapacity.toLocaleString()}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
              <span>Capacity Sold</span>
              <span className="text-[#08537B] font-bold">{soldRate}%</span>
            </div>
          </div>
        </div>

        {/* Gate Admissions */}
        <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-xs hover:shadow-sm transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Admitted at Gates
            </span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-100">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-gray-900 tracking-tight">
              {metrics?.tickets.totalCheckedIn.toLocaleString()}
              <span className="text-sm font-normal text-gray-400 ml-1">
                / {metrics?.tickets.totalSold.toLocaleString()}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
              <span>Gate Turnout</span>
              <span className="text-[#EE8518] font-bold">{checkInRate}%</span>
            </div>
          </div>
        </div>

        {/* Available Capacity */}
        <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-xs hover:shadow-sm transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Available Capacity
            </span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-700 border border-purple-100">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-gray-900 tracking-tight">
              {metrics?.tickets.totalAvailable.toLocaleString()}
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
              <span>Temporary Holds:</span>
              <span className="text-purple-700 font-bold font-mono">
                {metrics?.tickets.totalReserved} HELD
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Catering & Registration Intelligence Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Catering & Food Intelligence */}
        <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-200/80 flex items-center justify-center text-[#EE8518]">
                <Utensils className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">
                  Catering & Meal Headcount
                </h3>
                <p className="text-xs text-gray-500">
                  Real-time lunch buffet counts for Courtyard by Marriott
                </p>
              </div>
            </div>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Live Catering Feed
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-5">
            <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200">
              <div className="flex items-center justify-between text-xs font-semibold text-emerald-800">
                <span className="flex items-center gap-1.5">
                  <VegVectorIcon size={16} /> Pure Vegetarian
                </span>
              </div>
              <div className="text-2xl font-black text-emerald-900 mt-2 font-mono">
                {metrics?.catering?.totalVeg ?? 0}
              </div>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                {metrics && metrics.tickets.totalSold > 0
                  ? Math.round(((metrics.catering?.totalVeg ?? 0) / metrics.tickets.totalSold) * 100)
                  : 0}% of confirmed attendees
              </p>
            </div>

            <div className="p-4 rounded-xl bg-red-50/70 border border-red-200">
              <div className="flex items-center justify-between text-xs font-semibold text-red-900">
                <span className="flex items-center gap-1.5">
                  <NonVegVectorIcon size={16} /> Non-Vegetarian
                </span>
              </div>
              <div className="text-2xl font-black text-red-900 mt-2 font-mono">
                {metrics?.catering?.totalNonVeg ?? 0}
              </div>
              <p className="text-[11px] text-red-700 mt-0.5">
                {metrics && metrics.tickets.totalSold > 0
                  ? Math.round(((metrics.catering?.totalNonVeg ?? 0) / metrics.tickets.totalSold) * 100)
                  : 0}% of confirmed attendees
              </p>
            </div>
          </div>
        </div>

        {/* Membership Distribution */}
        <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-700">
                <Award className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">
                  Delegate Membership Tracking
                </h3>
                <p className="text-xs text-gray-500">
                  CEDOI network members vs visiting entrepreneurs
                </p>
              </div>
            </div>
            <Link
              href="/admin/bookings"
              className="text-xs font-semibold text-[#08537B] hover:underline"
            >
              View Bookings →
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-5">
            <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200">
              <div className="flex items-center justify-between text-xs font-semibold text-[#08537B]">
                <span>CEDOI Members</span>
              </div>
              <div className="text-2xl font-black text-[#08537B] mt-2 font-mono">
                {metrics?.membership?.totalMembers ?? 0}
              </div>
              <p className="text-[11px] text-blue-700 mt-0.5">
                {metrics && metrics.tickets.totalSold > 0
                  ? Math.round(((metrics.membership?.totalMembers ?? 0) / metrics.tickets.totalSold) * 100)
                  : 0}% of registered delegates
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                <span>Non-Members / Guests</span>
              </div>
              <div className="text-2xl font-black text-slate-900 mt-2 font-mono">
                {metrics?.membership?.totalNonMembers ?? 0}
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5">
                {metrics && metrics.tickets.totalSold > 0
                  ? Math.round(((metrics.membership?.totalNonMembers ?? 0) / metrics.tickets.totalSold) * 100)
                  : 0}% of registered delegates
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Capacity & Category Distribution Table */}
      <div className="rounded-2xl bg-white border border-gray-200 overflow-hidden shadow-xs">
        <div className="p-5 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white">
          <div>
            <h2 className="text-base font-bold text-gray-900 tracking-tight">
              Ticket Categories & Inventory Allocation
            </h2>
            <p className="text-xs text-gray-500">
              Server-enforced inventory thresholds with pessimistic concurrency locking
            </p>
          </div>
          <span className="text-xs font-semibold text-gray-600 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-200">
            Event: {metrics?.event.name}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/80 text-gray-500 uppercase tracking-wider font-semibold border-b border-gray-200">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Category</th>
                <th className="py-3.5 px-4 font-semibold">Unit Price</th>
                <th className="py-3.5 px-4 text-center font-semibold">Allocated</th>
                <th className="py-3.5 px-4 text-center font-semibold">Sold</th>
                <th className="py-3.5 px-4 text-center font-semibold">Reserved</th>
                <th className="py-3.5 px-4 text-center font-semibold">Available</th>
                <th className="py-3.5 px-4 text-center font-semibold">Admitted</th>
                <th className="py-3.5 px-4 text-right font-semibold">Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700 font-medium bg-white">
              {metrics?.categoryBreakdown.map((cat) => {
                const fillPercent = Math.min(
                  100,
                  Math.round(((cat.sold + cat.reserved) / cat.capacity) * 100)
                );
                return (
                  <tr key={cat.ticketTypeId} className="hover:bg-gray-50/70 transition">
                    <td className="py-3.5 px-4 font-bold text-gray-900">
                      {cat.name}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-700">
                      {formatPaise(cat.unitPricePaise)}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-gray-600">
                      {cat.capacity.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-[#08537B] font-bold">
                      {cat.sold.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-amber-700 font-semibold">
                      {cat.reserved}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-emerald-700 font-bold">
                      {cat.available.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-[#EE8518] font-bold">
                      {cat.checkedIn}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2.5">
                        <div className="w-20 bg-gray-100 rounded-full h-2 overflow-hidden border border-gray-200/60">
                          <div
                            className="bg-[#08537B] h-full rounded-full"
                            style={{ width: `${fillPercent}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-mono text-gray-500 w-8 text-right font-semibold">
                          {fillPercent}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Operational Controls & Financial Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Financial Balance Overview */}
        <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-xs lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#08537B]" />
              Revenue & Settlement Summary
            </h3>
            <span className="text-xs font-semibold text-gray-500 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-200">
              Currency: INR (₹)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
              <p className="text-xs font-semibold text-gray-500">Gross Captures</p>
              <p className="text-xl font-extrabold text-gray-900 mt-1">
                {metrics ? formatPaise(metrics.financials.grossCollectionsPaise) : '₹0'}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">Total captured payments</p>
            </div>

            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
              <p className="text-xs font-semibold text-gray-500">Completed Refunds</p>
              <p className="text-xl font-extrabold text-rose-600 mt-1">
                {metrics ? formatPaise(metrics.financials.refundsPaise) : '₹0'}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">Processed refunds</p>
            </div>

            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
              <p className="text-xs font-semibold text-gray-500">Net Collections</p>
              <p className="text-xl font-extrabold text-emerald-700 mt-1">
                {metrics ? formatPaise(metrics.financials.netCollectionsPaise) : '₹0'}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">Net retained revenue</p>
            </div>
          </div>
        </div>

        {/* Quick Navigation Panels */}
        <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-xs space-y-3">
          <h3 className="text-sm font-bold text-gray-900">Management Shortcuts</h3>

          <Link
            href="/admin/bookings"
            className="flex items-center justify-between p-3.5 rounded-xl bg-gray-50 hover:bg-gray-100/80 border border-gray-200 text-xs font-semibold text-gray-800 transition"
          >
            <span className="flex items-center gap-2.5">
              <Ticket className="w-4 h-4 text-[#EE8518]" />
              Manage Bookings & Refunds
            </span>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </Link>

          <Link
            href="/admin/payments"
            className="flex items-center justify-between p-3.5 rounded-xl bg-gray-50 hover:bg-gray-100/80 border border-gray-200 text-xs font-semibold text-gray-800 transition"
          >
            <span className="flex items-center gap-2.5">
              <CreditCard className="w-4 h-4 text-[#08537B]" />
              Payment Attempts & Exceptions
            </span>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </Link>

          <Link
            href="/admin/check-ins"
            className="flex items-center justify-between p-3.5 rounded-xl bg-gray-50 hover:bg-gray-100/80 border border-gray-200 text-xs font-semibold text-gray-800 transition"
          >
            <span className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Gate Check-in Logs
            </span>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </Link>

          <Link
            href="/admin/reports"
            className="flex items-center justify-between p-3.5 rounded-xl bg-gray-50 hover:bg-gray-100/80 border border-gray-200 text-xs font-semibold text-gray-800 transition"
          >
            <span className="flex items-center gap-2.5">
              <Download className="w-4 h-4 text-purple-600" />
              Download Excel/CSV Reports
            </span>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </Link>
        </div>
      </div>
    </div>
  );
}
