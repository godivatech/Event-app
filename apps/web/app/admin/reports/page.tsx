'use client';

import React, { useState } from 'react';
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  CheckCircle,
  ShieldCheck,
  Calendar,
  AlertCircle,
  Loader2,
  Table,
} from 'lucide-react';

interface ReportConfig {
  id: 'sales' | 'tickets' | 'checkins';
  title: string;
  description: string;
  columns: string[];
  icon: any;
  color: string;
}

const reports: ReportConfig[] = [
  {
    id: 'sales',
    title: 'Sales & Revenue Report',
    description:
      'Complete chronological log of all bookings, customer phone/email, gross order amounts in INR, payment statuses, and reservation timestamps.',
    columns: [
      'Booking Number',
      'Customer Name',
      'Phone Number',
      'Email',
      'Amount (INR)',
      'Booking Status',
      'Created At',
    ],
    icon: FileSpreadsheet,
    color: 'emerald',
  },
  {
    id: 'tickets',
    title: 'Tickets & Admissions Registry',
    description:
      'Granular breakdown of every unique digital admission ticket, category allocation, buyer identity, admission index, and lifecycle state.',
    columns: [
      'Ticket Number',
      'Booking Number',
      'Ticket Category',
      'Buyer Name',
      'Ticket Status',
      'Admission Index',
      'Created At',
    ],
    icon: Table,
    color: 'blue',
  },
  {
    id: 'checkins',
    title: 'Gate Admissions & Scan History',
    description:
      'Real-time verification log of all gate check-in attempts, gate identifiers, authorized validator staff name, and admission results.',
    columns: [
      'Ticket Number',
      'Category',
      'Gate Assigned',
      'Staff Validator',
      'Scan Result',
      'Admission Timestamp',
    ],
    icon: CheckCircle,
    color: 'amber',
  },
];

export default function AdminReportsPage() {
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownload = async (type: 'sales' | 'tickets' | 'checkins') => {
    setDownloading(type);
    try {
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('cedoi_admin_token') || localStorage.getItem('cedoi_staff_token')
          : null;
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/v1/admin/reports/${type}`, {
        method: 'GET',
        credentials: 'include',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Export failed with status: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cedoi_${type}_report_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert(`Download failed: ${err.message}`);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
          Reports & Data Exports
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          Export authoritative system data in Excel-compatible UTF-8 CSV format with formula injection protection
        </p>
      </div>

      {/* Security & Excel Compatibility Notice */}
      <div className="p-5 rounded-2xl bg-blue-50/70 border border-blue-100 flex items-start gap-3 shadow-xs">
        <ShieldCheck className="w-5 h-5 text-[#08537B] shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="font-bold text-blue-900">Excel Compatibility & CSV Injection Defense</p>
          <p className="text-blue-800 leading-relaxed">
            In compliance with Section 18, exports are formatted with a UTF-8 BOM (\uFEFF) for immediate opening in Microsoft Excel without character corruption. All user-entered text fields are sanitized to neutralize formula injection attacks (characters =, +, -, @ are escaped).
          </p>
        </div>
      </div>

      {/* Report Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {reports.map((rep) => {
          const Icon = rep.icon;
          const isCurrentDownloading = downloading === rep.id;

          return (
            <div
              key={rep.id}
              className="rounded-3xl bg-white border border-gray-200 p-6 flex flex-col justify-between space-y-5 shadow-xs hover:shadow-sm transition"
            >
              <div className="space-y-3.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#08537B]">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 tracking-tight">{rep.title}</h3>
                  <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                    {rep.description}
                  </p>
                </div>

                <div className="pt-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1.5">
                    Export Schema
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {rep.columns.map((col) => (
                      <span
                        key={col}
                        className="px-2 py-0.5 rounded-lg bg-gray-50 border border-gray-200 text-[10px] text-gray-600 font-medium"
                      >
                        {col}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleDownload(rep.id)}
                disabled={isCurrentDownloading}
                className="w-full py-2.5 px-4 rounded-xl bg-[#08537B] hover:bg-[#074769] text-white font-bold text-xs shadow-xs flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                {isCurrentDownloading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Generating CSV...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Export CSV Dataset</span>
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
