'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import { apiClient } from '../../lib/api-client';
import { BookingDetailDto } from '@cedoi/contracts';
import { KeyRound, ArrowRight, AlertCircle, Loader2, HelpCircle, ShieldAlert } from 'lucide-react';

export default function RecoverBookingPage() {
  const router = useRouter();
  const [bookingNumber, setBookingNumber] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!bookingNumber.trim() || !recoveryCode.trim()) {
      setErrorMessage('Both Booking Number and Recovery Code are required.');
      return;
    }

    setIsLoading(true);
    try {
      const data = await apiClient<BookingDetailDto>('api/v1/bookings/recover', {
        method: 'POST',
        body: JSON.stringify({
          bookingNumber: bookingNumber.trim().toUpperCase(),
          recoveryCode: recoveryCode.trim().toUpperCase(),
        }),
      });

      // Session established on server via HttpOnly cookie
      if (data.status === 'CONFIRMED') {
        router.push(`/booking/${data.bookingNumber}/success`);
      } else {
        router.push(`/booking/${data.bookingNumber}`);
      }
    } catch (err: any) {
      setErrorMessage(
        err.message || 'Invalid booking number or recovery code. Please verify and try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 w-full overflow-x-hidden">
      <Navbar />

      <main className="flex-1 max-w-md mx-auto px-4 py-8 sm:py-12 w-full overflow-x-hidden">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-full bg-[#08537B]/10 text-[#08537B] flex items-center justify-center mx-auto mb-3">
            <KeyRound className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Find & Recover Booking
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Access your admission passes using your unique booking credentials.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 rounded-[12px] bg-rose-50 border border-rose-200 text-rose-900 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleRecover} className="bg-white rounded-[18px] p-6 border border-slate-200 shadow-sm space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Booking Reference Number
            </label>
            <input
              type="text"
              required
              placeholder="Enter booking reference number"
              value={bookingNumber}
              onChange={(e) => setBookingNumber(e.target.value)}
              className="w-full h-11 px-3.5 rounded-[10px] border border-slate-300 font-mono text-sm uppercase text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#08537B]/20 focus:border-[#08537B]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Recovery Passcode
            </label>
            <input
              type="text"
              required
              placeholder="Enter recovery passcode"
              value={recoveryCode}
              onChange={(e) => setRecoveryCode(e.target.value)}
              className="w-full h-11 px-3.5 rounded-[10px] border border-slate-300 font-mono text-sm uppercase text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#08537B]/20 focus:border-[#08537B]"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              12-character security code provided at checkout.
            </span>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-[10px] bg-[#08537B] hover:bg-[#064364] active:bg-[#053752] text-white font-bold text-sm shadow-sm transition-colors"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying Credentials...</span>
              </>
            ) : (
              <>
                <span>Access Digital Tickets</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Security & Help Notice */}
        <div className="mt-8 p-4 rounded-[14px] bg-slate-100/70 border border-slate-200 text-xs text-slate-500 space-y-2">
          <div className="flex items-center gap-1.5 font-bold text-slate-700">
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            <span>Lost Both Session and Code?</span>
          </div>
          <p className="leading-relaxed">
            For security, phone numbers and emails alone cannot unlock tickets. If you lost your recovery code, contact organizer support with your bank payment transaction ID for staff-assisted recovery.
          </p>
          <div className="pt-2">
            <Link href="/help" className="text-[#08537B] font-semibold hover:underline inline-flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Contact Organizer Support</span>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
