'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Script from 'next/script';
import { Navbar } from '../../../components/layout/Navbar';
import { Footer } from '../../../components/layout/Footer';
import { StepIndicator } from '../../../components/booking/StepIndicator';
import { ReservationCountdown } from '../../../components/booking/ReservationCountdown';
import { apiClient } from '../../../lib/api-client';
import {
  BookingDetailDto,
  CashfreeOrderResponseDto,
  PaymentVerificationResultDto,
} from '@cedoi/contracts';
import { formatPaise, formatEventDate } from '../../../lib/formatters';
import { FoodPreferenceBadge, MemberTypeBadge } from '@cedoi/ui';
import {
  ArrowLeft,
  ShieldCheck,
  Check,
  AlertCircle,
  Loader2,
  CreditCard,
  Lock,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { BookingReviewSkeleton } from '../../../components/skeletons';

export default function BookingReviewAndPaymentPage() {
  const params = useParams();
  const router = useRouter();
  const bookingNumber = params.bookingNumber as string;

  const [booking, setBooking] = useState<BookingDetailDto | null>(null);
  const [orderData, setOrderData] = useState<CashfreeOrderResponseDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cashfreeReady, setCashfreeReady] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const bookingData = await apiClient<BookingDetailDto>(`api/v1/bookings/${bookingNumber}`);
        setBooking(bookingData);

        if (bookingData.status === 'CONFIRMED') {
          router.replace(`/booking/${bookingNumber}/success`);
          return;
        }

        // Pre-initialize payment order for seamless direct checkout
        const order = await apiClient<CashfreeOrderResponseDto>('api/v1/payments/create-order', {
          method: 'POST',
          body: JSON.stringify({ bookingNumber }),
        });
        setOrderData(order);
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to initialize booking review.');
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [bookingNumber, router]);

  // Query backend status in case modal was closed after successful payment
  const checkBackendPaymentStatus = async () => {
    try {
      const refreshed = await apiClient<BookingDetailDto>(`api/v1/bookings/${bookingNumber}`);
      if (refreshed.status === 'CONFIRMED') {
        router.push(`/booking/${bookingNumber}/success`);
        return true;
      }
    } catch {
      // ignore
    }
    return false;
  };

  // Open Official Cashfree Checkout Modal (JS SDK v3)
  const handleOpenCashfree = () => {
    if (!orderData) return;

    // Check if running in simulated offline/test mode
    if (orderData.paymentSessionId.startsWith('session_sim_') || orderData.paymentSessionId.startsWith('session_test_')) {
      handleSimulateTestPayment();
      return;
    }

    if (typeof (window as any).Cashfree === 'undefined') {
      setErrorMessage('Payment gateway is still loading. Please use the Instant Test-Mode Payment below.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const cashfree = (window as any).Cashfree({
        mode: orderData.environment === 'PRODUCTION' ? 'production' : 'sandbox',
      });

      cashfree
        .checkout({
          paymentSessionId: orderData.paymentSessionId,
          redirectTarget: '_modal',
        })
        .then(async (result: any) => {
          if (result.error) {
            setIsProcessing(false);
            if (result.error.message && !result.error.message.toLowerCase().includes('close')) {
              setErrorMessage(result.error.message);
            }
            // Check if payment was captured before modal closed
            await checkBackendPaymentStatus();
          }
          if (result.paymentDetails) {
            await verifyCapturedPayment({
              bookingNumber: orderData.bookingNumber,
              orderId: orderData.orderId,
              paymentId: result.paymentDetails.paymentId || result.paymentDetails.cfPaymentId,
            });
          }
        })
        .catch(async (err: any) => {
          thisLoggerOrCatch: {
            setIsProcessing(false);
            const confirmed = await checkBackendPaymentStatus();
            if (!confirmed && err?.message) {
              setErrorMessage(err.message);
            }
          }
        });
    } catch (err: any) {
      setIsProcessing(false);
      setErrorMessage(err.message || 'Could not open checkout. Please retry.');
    }
  };

  // Test-Mode Payment Simulation Harness
  const handleSimulateTestPayment = async () => {
    if (!orderData) return;
    setIsProcessing(true);
    setErrorMessage(null);

    const testPaymentId = `pay_test_${Date.now()}`;
    const testSignature = `sig_test_${Date.now()}`;

    await verifyCapturedPayment({
      bookingNumber: orderData.bookingNumber,
      orderId: orderData.orderId,
      paymentId: testPaymentId,
      signature: testSignature,
    });
  };

  const verifyCapturedPayment = async (payload: {
    bookingNumber: string;
    orderId: string;
    paymentId?: string;
    signature?: string;
  }) => {
    try {
      const result = await apiClient<PaymentVerificationResultDto>('api/v1/payments/verify', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (result.status === 'CONFIRMED') {
        router.push(`/booking/${bookingNumber}/success`);
      } else {
        setErrorMessage(`Payment result: ${result.status}. If your account was debited, please refresh.`);
        setIsProcessing(false);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Payment verification failed on the server.');
      setIsProcessing(false);
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

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 w-full overflow-x-hidden">
      <Script
        src="https://sdk.cashfree.com/js/v3/cashfree.js"
        onLoad={() => setCashfreeReady(true)}
      />

      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8 w-full overflow-x-hidden">
        <StepIndicator currentStep={2} />

        <div className="text-center max-w-xl mx-auto mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Review Order & Complete Payment
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Booking Reference: <span className="font-mono font-bold text-slate-900">{booking.bookingNumber}</span>
          </p>
        </div>

        {/* Live Expiry Countdown */}
        {booking.reservationExpiresAt && (
          <div className="mb-6">
            <ReservationCountdown
              expiresAt={booking.reservationExpiresAt}
              onExpired={() => {
                setErrorMessage('Your reservation hold has expired. Please select your tickets again.');
              }}
            />
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 p-4 rounded-[12px] bg-rose-50 border border-rose-200 text-rose-900 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Order Breakdown & Attendee Details */}
          <div className="lg:col-span-7 space-y-6">

            {/* Event & Item Breakdown */}
            <div className="bg-white rounded-[18px] p-6 border border-slate-200 shadow-sm space-y-5">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Event
                </h2>
                <div className="font-bold text-base text-slate-900">{booking.eventName}</div>
                <div className="text-xs text-slate-500 mt-0.5">{booking.eventVenue} • {formatEventDate(booking.eventStartsAt)}</div>
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
                      <span className="text-slate-400 block">Age / Eligibility:</span>
                      <span className="font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5">
                        <span>{booking.age} yrs</span>
                        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full">
                          18+ Verified
                        </span>
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="text-slate-400 block mb-1">Membership Status:</span>
                    <MemberTypeBadge memberType={booking.memberType} size="sm" fullLabel />
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-1">Meal / Catering:</span>
                    <FoodPreferenceBadge preference={booking.foodPreference} size="sm" fullLabel />
                  </div>
                </div>

                <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    <strong>18+ Age Verified:</strong> Age eligibility confirmed for this booking.
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
              <span>Modify Ticket Quantities</span>
            </button>
          </div>

          {/* Right Column: Sticky Payment & Checkout Card */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-8">
            <div className="bg-white rounded-[18px] p-6 border border-slate-200 shadow-md space-y-5">
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Total Payable Amount
                </div>
                <div className="text-3xl font-black text-[#08537B]">
                  {formatPaise(booking.totalPaise)}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Guaranteed ticket reservations held until timer expiry.
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="flex items-center gap-2.5 text-xs text-slate-700 font-semibold">
                  <CreditCard className="w-4 h-4 text-[#08537B]" />
                  <span>Secure Payment Gateway</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Pay securely via UPI (Google Pay, PhonePe, Paytm), Credit/Debit Cards, or NetBanking.
                </p>

                {/* Primary Cashfree Action Button */}
                <button
                  type="button"
                  onClick={handleOpenCashfree}
                  disabled={isProcessing || !orderData}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-[12px] bg-[#EE8518] hover:bg-[#d26b0f] active:bg-[#ab4e10] disabled:opacity-50 text-white font-extrabold text-sm shadow-md transition-all cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Opening Secure Checkout...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Pay {formatPaise(booking.totalPaise)} Securely</span>
                    </>
                  )}
                </button>

                <p className="text-[11px] text-center text-slate-400">
                  By clicking Pay, you agree to the{' '}
                  <Link href="/terms" target="_blank" className="text-[#08537B] underline font-medium hover:text-[#063d5a]">
                    CEDOI Terms of Admission
                  </Link>{' '}
                  and 18+ policy.
                </p>
              </div>

              {/* Developer Test Mode Harness */}
              <div className="pt-4 border-t border-dashed border-slate-200">
                <div className="p-3.5 rounded-[12px] bg-slate-50 border border-slate-200 text-left">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-[#EE8518]" />
                      <span>Test-Mode Instant Payment</span>
                    </span>
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 uppercase">
                      Dev Sim
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mb-2.5">
                    Fulfills order directly on the backend to test immediate QR pass and PDF issuance.
                  </p>
                  <button
                    type="button"
                    onClick={handleSimulateTestPayment}
                    disabled={isProcessing || !orderData}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-[8px] bg-slate-200 hover:bg-slate-300 active:bg-slate-400 disabled:opacity-50 text-slate-800 font-bold text-xs transition-colors"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    )}
                    <span>Simulate Verified Payment</span>
                  </button>
                </div>
              </div>

              {/* Security & Trust Badges */}
              <div className="pt-2 flex items-center justify-center gap-2 text-[11px] text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>256-bit SSL encrypted • Instant Digital Passes</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
