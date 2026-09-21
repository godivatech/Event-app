'use client';

import React from 'react';
import {
  Settings as SettingsIcon,
  ShieldCheck,
  CreditCard,
  Clock,
  Lock,
  Users,
} from 'lucide-react';

export default function AdminSettingsPage() {
  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
          System & Event Settings
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          Operational constraints, inventory holds, gateway rules, and security policies
        </p>
      </div>

      {/* Global Invariants Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Inventory & Timing Policies */}
        <div className="rounded-3xl bg-white border border-gray-200 p-6 space-y-4 shadow-xs">
          <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100 text-gray-900 font-bold text-sm">
            <Clock className="w-4 h-4 text-[#EE8518]" />
            <h3>Reservation & Inventory Rules</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-200">
              <span className="text-gray-600">Temporary Reservation Window</span>
              <span className="font-mono font-bold text-gray-900">10 Minutes</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-200">
              <span className="text-gray-600">Concurrency Control Mechanism</span>
              <span className="font-mono font-bold text-emerald-700">
                PostgreSQL SELECT ... FOR UPDATE
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-200">
              <span className="text-gray-600">Maximum Admissions Per Booking</span>
              <span className="font-mono font-bold text-gray-900">10 Admissions</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-200">
              <span className="text-gray-600">Admission Gate Entry Window</span>
              <span className="font-mono font-bold text-gray-700">
                [T - 4h, T + 2h]
              </span>
            </div>
          </div>
        </div>

        {/* Payment Gateway Configuration */}
        <div className="rounded-3xl bg-white border border-gray-200 p-6 space-y-4 shadow-xs">
          <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100 text-gray-900 font-bold text-sm">
            <CreditCard className="w-4 h-4 text-[#08537B]" />
            <h3>Payment Gateway & Settlement</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-200">
              <span className="text-gray-600">Primary Payment Gateway</span>
              <span className="font-bold text-gray-900">Razorpay Standard</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-200">
              <span className="text-gray-600">Operating Environment</span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                TEST MODE ACTIVE
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-200">
              <span className="text-gray-600">Authoritative Currency</span>
              <span className="font-mono font-bold text-gray-900">INR (Paise Integer)</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-200">
              <span className="text-gray-600">Webhook Replay Protection</span>
              <span className="font-mono font-bold text-emerald-700">
                HMAC SHA-256 + Idempotent Table
              </span>
            </div>
          </div>
        </div>

        {/* Cryptographic Security */}
        <div className="rounded-3xl bg-white border border-gray-200 p-6 space-y-4 shadow-xs">
          <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100 text-gray-900 font-bold text-sm">
            <Lock className="w-4 h-4 text-purple-600" />
            <h3>Cryptographic Security & Tokens</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-200">
              <span className="text-gray-600">QR Admission Token Entropy</span>
              <span className="font-mono font-bold text-gray-900">256-Bit Cryptographic</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-200">
              <span className="text-gray-600">Storage Encryption at Rest</span>
              <span className="font-mono font-bold text-emerald-700">AES-256-GCM</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-200">
              <span className="text-gray-600">Hash Indexing Strategy</span>
              <span className="font-mono font-bold text-gray-700">SHA-256 Deterministic</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-200">
              <span className="text-gray-600">Customer Recovery Session</span>
              <span className="font-mono font-bold text-gray-700">
                128-Bit SHA-256 Hash
              </span>
            </div>
          </div>
        </div>

        {/* Staff Authorization Hierarchy */}
        <div className="rounded-3xl bg-white border border-gray-200 p-6 space-y-4 shadow-xs">
          <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100 text-gray-900 font-bold text-sm">
            <Users className="w-4 h-4 text-[#08537B]" />
            <h3>Staff Access & Role Hierarchy</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-900">SUPER_ADMIN</span>
                <span className="text-[10px] text-[#08537B] font-mono font-bold">Full Scope</span>
              </div>
              <p className="text-[11px] text-gray-500">
                Staff provisioning, event configuration, refunds, exports, and audit access.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-900">ADMIN</span>
                <span className="text-[10px] text-emerald-700 font-mono font-bold">Event Operations</span>
              </div>
              <p className="text-[11px] text-gray-500">
                Bookings inspection, reports download, payment reconciliation, and refunds.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-900">SCANNER</span>
                <span className="text-[10px] text-amber-700 font-mono font-bold">Gate Scoped</span>
              </div>
              <p className="text-[11px] text-gray-500">
                Camera barcode scanning and manual check-in verification only.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
