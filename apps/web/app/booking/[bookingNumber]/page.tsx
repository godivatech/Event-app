'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '../../../components/layout/Navbar';
import { Footer } from '../../../components/layout/Footer';
import { StepIndicator } from '../../../components/booking/StepIndicator';
import { apiClient } from '../../../lib/api-client';
import { BookingDetailDto } from '@cedoi/contracts';
import { formatPaise, formatEventDate } from '../../../lib/formatters';
import { FoodPreferenceBadge, MemberTypeBadge, WhatsAppIcon } from '@cedoi/ui';
import { QRCodeSVG } from 'qrcode.react';
import {
  ArrowLeft,
  ShieldCheck,
  Check,
  AlertCircle,
  Loader2,
  Copy,
  QrCode,
  Smartphone,
  CheckCircle2,
  Clock,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { BookingReviewSkeleton } from '../../../components/skeletons';

const UPI_ID = '9790612280@axl';
const UPI_NAME = 'CEDOI AWARDS 2026';
const WHATSAPP_PHONE = '919600520130';
const WHATSAPP_DISPLAY = '+91 96005 20130';

export default function BookingReviewAndPaymentPage() {
  const params = useParams();
  const router = useRouter();
  const bookingNumber = params.bookingNumber as string;

  const [booking, setBooking] = useState<BookingDetailDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // UPI and Verification state
  const [copied, setCopied] = useState(false);
  const [utrInput, setUtrInput] = useState('');
  const [isSubmittingUtr, setIsSubmittingUtr] = useState(false);
  const [utrSuccessMsg, setUtrSuccessMsg] = useState<string | null>(null);
  const [existingUtr, setExistingUtr] = useState<string | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initial load
  useEffect(() => {
    async function loadData() {
      try {
        const bookingData = await apiClient<BookingDetailDto>(`api/v1/bookings/${bookingNumber}`);
        setBooking(bookingData);

        if (bookingData.status === 'CONFIRMED') {
          router.replace(`/booking/${bookingNumber}/success`);
          return;
        }

        // Check if there was already an existing submitted UTR
        if (bookingData.paymentAttempt?.cfPaymentId?.startsWith('UTR_')) {
          setExistingUtr(bookingData.paymentAttempt.cfPaymentId.replace('UTR_', ''));
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to initialize booking review.');
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [bookingNumber, router]);

  // Background status polling: automatically routes to ticket pass when admin marks PAID
  useEffect(() => {
    if (!booking || booking.status === 'CONFIRMED') return;

    pollIntervalRef.current = setInterval(async () => {
      try {
        const refreshed = await apiClient<BookingDetailDto>(`api/v1/bookings/${bookingNumber}`);
        if (refreshed.status === 'CONFIRMED') {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          router.push(`/booking/${bookingNumber}/success`);
        }
      } catch {
        // Silently ignore background polling errors
      }
    }, 4000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [booking, bookingNumber, router]);

  // Copy UPI ID to clipboard
  const handleCopyUpi = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(UPI_ID);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  // Submit UTR Reference
  const handleSubmitUtr = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = utrInput.trim().replace(/[^a-zA-Z0-9]/g, '');
    if (!clean || clean.length < 6) {
      setErrorMessage('Please enter a valid 12-digit UPI reference (UTR) number.');
      return;
    }

    setIsSubmittingUtr(true);
    setErrorMessage(null);
    try {
      const res = await apiClient<{ success: boolean; message: string; utr: string }>(
        `api/v1/bookings/${bookingNumber}/submit-utr`,
        {
          method: 'POST',
          body: JSON.stringify({ utr: clean }),
        }
      );
      setExistingUtr(res.utr);
      setUtrSuccessMsg(`Payment reference ${res.utr} recorded! Our team is verifying your payment.`);
      setUtrInput('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit payment reference.');
    } finally {
      setIsSubmittingUtr(false);
    }
  };

  // Manual Check Now
  const handleManualCheckStatus = async () => {
    setIsCheckingStatus(true);
    try {
      const refreshed = await apiClient<BookingDetailDto>(`api/v1/bookings/${bookingNumber}`);
      if (refreshed.status === 'CONFIRMED') {
        router.push(`/booking/${bookingNumber}/success`);
      } else {
        setUtrSuccessMsg('Status: Verification in progress by CEDOI Delegate Desk.');
      }
    } catch {
      // ignore
    } finally {
      setIsCheckingStatus(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50">
        <Navbar />
        <BookingReviewSkeleton />
        <Footer />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50">
        <Navbar />
        <div className="flex-1 max-w-md mx-auto p-8 text-center">
          <h2 className="text-lg font-bold text-slate-900">Booking Access Error</h2>
          <p className="mt-2 text-xs text-slate-500">{errorMessage || 'Booking not found.'}</p>
        </div>
        <Footer />
      </div>
    );
  }

  const amountRupees = Math.round(booking.totalPaise / 100);
  const upiUri = `upi://pay?pa=${encodeURIComponent(UPI_ID)}&pn=${encodeURIComponent(UPI_NAME)}&am=${amountRupees}&cu=INR&tn=${encodeURIComponent(`Pass Booking ${booking.bookingNumber}`)}`;

  const currentUtr = existingUtr || (utrInput.trim().length >= 6 ? utrInput.trim() : null);

  const whatsappMessage = `Hello CEDOI Organizer Desk,\n\nI have completed the UPI payment for my CEDOI Awards 2026 Pass.\n\n📌 Booking Ref: ${booking.bookingNumber}\n👤 Name: ${booking.customerName}\n📞 Phone: ${booking.customerPhone}\n💰 Amount Paid: ₹${amountRupees.toLocaleString('en-IN')}\n🆔 UPI ID Paid To: ${UPI_ID}${currentUtr ? `\n🔢 UPI UTR / Ref No: ${currentUtr}` : ''}\n\nI am attaching my payment receipt screenshot below. Kindly verify and issue my delegate pass!`;
  const whatsappUrl = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(whatsappMessage)}`;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 w-full overflow-x-hidden">
      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8 w-full overflow-x-hidden">
        <StepIndicator currentStep={2} />

        <div className="text-center max-w-xl mx-auto mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Complete UPI Payment
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Booking Reference: <span className="font-mono font-bold text-slate-900">{booking.bookingNumber}</span>
          </p>
        </div>

        {/* Live Awaiting Verification Notice Banner */}
        <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
            </span>
            <span>
              <strong>Seats Reserved:</strong> Pay via UPI below & share your receipt on WhatsApp to instantly unlock your QR pass.
            </span>
          </div>
          <button
            type="button"
            onClick={handleManualCheckStatus}
            disabled={isCheckingStatus}
            className="self-start sm:self-auto shrink-0 px-3 py-1 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg font-bold text-[11px] inline-flex items-center gap-1.5 transition"
          >
            {isCheckingStatus ? <Loader2 className="w-3 h-3 animate-spin" /> : <Clock className="w-3 h-3" />}
            <span>Refresh Status</span>
          </button>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {utrSuccessMsg && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{utrSuccessMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Order Breakdown & Attendee Details */}
          <div className="lg:col-span-6 space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Event
                </h2>
                <div className="font-bold text-base text-slate-900">{booking.eventName}</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {booking.eventVenue} • {formatEventDate(booking.eventStartsAt)}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  Selected Passes
                </h2>
                <div className="divide-y divide-slate-100">
                  {booking.items.map((item) => (
                    <div key={item.id} className="py-2.5 flex items-center justify-between text-sm">
                      <div>
                        <span className="font-bold text-slate-900">{item.ticketTypeName}</span>
                        <span className="text-slate-400 text-xs ml-2">× {item.quantity}</span>
                      </div>
                      <div className="font-extrabold text-slate-900">
                        {formatPaise(item.lineTotalPaise)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  Attendee & Registration Information
                </h2>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block">Full Name:</span>
                    <span className="font-semibold text-slate-800">{booking.customerName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Phone Number:</span>
                    <span className="font-semibold text-slate-800">{booking.customerPhone}</span>
                  </div>
                  {booking.customerEmail && (
                    <div>
                      <span className="text-slate-400 block">Email ID:</span>
                      <span className="font-semibold text-slate-800">{booking.customerEmail}</span>
                    </div>
                  )}
                  {booking.businessName && (
                    <div>
                      <span className="text-slate-400 block">Business / Company:</span>
                      <span className="font-semibold text-slate-800">{booking.businessName}</span>
                    </div>
                  )}
                  {booking.location && (
                    <div>
                      <span className="text-slate-400 block">Location / City:</span>
                      <span className="font-semibold text-slate-800">{booking.location}</span>
                    </div>
                  )}
                  {booking.age && (
                    <div>
                      <span className="text-slate-400 block">Age:</span>
                      <span className="font-semibold text-slate-800">{booking.age} yrs</span>
                    </div>
                  )}
                  <div>
                    <span className="text-slate-400 block mb-1">Pass Category:</span>
                    <MemberTypeBadge memberType={booking.memberType} size="sm" fullLabel />
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-1">Meal Preference:</span>
                    <FoodPreferenceBadge preference={booking.foodPreference} size="sm" fullLabel />
                  </div>
                </div>

                <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Official verified delegate booking for <strong>CEDOI Convention 2026</strong>.
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-[#08537B] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Modify Details</span>
            </button>
          </div>

          {/* Right Column: Branded Direct UPI Payment Card */}
          <div className="lg:col-span-6 space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-md space-y-6">
              
              {/* Header Amount */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Total Payable Amount
                  </div>
                  <div className="text-3xl font-black text-[#08537B]">
                    ₹{amountRupees.toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-[#08537B] border border-blue-200">
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Instant UPI Pay</span>
                  </span>
                </div>
              </div>

              {/* Step 1: Scan QR or Pay via UPI */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#08537B] text-white font-black text-xs">
                    1
                  </span>
                  <span className="text-xs font-bold text-slate-800">
                    Scan UPI QR with any App
                  </span>
                </div>

                {/* QR Code Container */}
                <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50/40 border border-slate-200">
                  <div className="p-3 bg-white rounded-xl shadow-xs border border-slate-200 shrink-0">
                    <QRCodeSVG
                      value={upiUri}
                      size={140}
                      level="M"
                      includeMargin={false}
                    />
                  </div>
                  <div className="space-y-2 text-center sm:text-left flex-1">
                    <div className="text-xs font-semibold text-slate-500">
                      Supports all UPI Apps:
                    </div>
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 text-[11px] font-semibold text-slate-700">
                      <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200">GPay</span>
                      <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200">PhonePe</span>
                      <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200">Paytm</span>
                      <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200">BHIM</span>
                      <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200">CRED</span>
                    </div>

                    {/* Copy UPI ID */}
                    <div className="pt-1">
                      <div className="text-[10px] text-slate-400 mb-1">Official UPI ID:</div>
                      <div className="inline-flex items-center gap-1.5 p-1.5 rounded-lg bg-white border border-slate-300">
                        <span className="font-mono text-xs font-bold text-slate-900 px-1">
                          {UPI_ID}
                        </span>
                        <button
                          type="button"
                          onClick={handleCopyUpi}
                          className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 text-[10px] font-bold flex items-center gap-1 transition"
                        >
                          {copied ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span className="text-emerald-700">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 text-slate-600" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mobile Direct Pay Button */}
                <a
                  href={upiUri}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-900 hover:bg-black active:bg-slate-800 text-white text-xs font-bold shadow-xs transition"
                >
                  <Smartphone className="w-4 h-4 text-amber-400" />
                  <span>Tap to Pay ₹{amountRupees.toLocaleString('en-IN')} via Installed UPI App</span>
                </a>
              </div>

              {/* Step 2: Share Screenshot on WhatsApp */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-600 text-white font-black text-xs">
                    2
                  </span>
                  <span className="text-xs font-bold text-slate-800">
                    Share Receipt on WhatsApp (Instant Verification)
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  After paying, send your payment screenshot to our organizer desk on WhatsApp. Our team will verify and your QR pass will unlock immediately!
                </p>

                {/* WhatsApp CTA Button */}
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] active:bg-[#1caa51] text-white font-extrabold text-sm shadow-md transition-all cursor-pointer transform hover:-translate-y-0.5"
                >
                  <WhatsAppIcon className="w-5 h-5" />
                  <span>Share Payment Receipt on WhatsApp</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                </a>
                <div className="text-[10px] text-center text-slate-400">
                  Organizer Desk: <strong className="text-slate-600">{WHATSAPP_DISPLAY}</strong>
                </div>
              </div>

              {/* Step 3: Optional UTR Number Input */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-700 text-white font-black text-xs">
                    3
                  </span>
                  <span className="text-xs font-bold text-slate-800">
                    Optional: Submit 12-Digit UTR / Transaction No.
                  </span>
                </div>

                {existingUtr ? (
                  <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-purple-700 shrink-0" />
                      <span>
                        Submitted UTR: <strong className="font-mono">{existingUtr}</strong>
                      </span>
                    </div>
                    <span className="text-[10px] font-bold bg-purple-200 text-purple-900 px-2 py-0.5 rounded-full">
                      Recorded
                    </span>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitUtr} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. 123456789012"
                      value={utrInput}
                      onChange={(e) => setUtrInput(e.target.value)}
                      maxLength={20}
                      className="flex-1 px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#08537B]"
                    />
                    <button
                      type="submit"
                      disabled={isSubmittingUtr || !utrInput.trim()}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition"
                    >
                      {isSubmittingUtr ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Submit'}
                    </button>
                  </form>
                )}
              </div>

              {/* Security & Verification Guarantee */}
              <div className="pt-2 flex items-center justify-center gap-2 text-[11px] text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Verified Direct UPI Transfer • Official CEDOI Merchant Account</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
