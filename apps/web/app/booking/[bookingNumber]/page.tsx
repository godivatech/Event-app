'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Script from 'next/script';
import { Navbar } from '../../../components/layout/Navbar';
import { Footer } from '../../../components/layout/Footer';
import { StepIndicator } from '../../../components/booking/StepIndicator';
import { ReservationCountdown } from '../../../components/booking/ReservationCountdown';
import { apiClient } from '../../../lib/api-client';
import {
  BookingDetailDto,
  RazorpayOrderResponseDto,
  PaymentVerificationResultDto,
} from '@cedoi/contracts';
import { formatPaise, formatEventDate } from '../../../lib/formatters';
import { FoodPreferenceBadge, MemberTypeBadge } from '@cedoi/ui';
import {
  ArrowLeft,
  ShieldCheck,
  Key,
  Copy,
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
  const [orderData, setOrderData] = useState<RazorpayOrderResponseDto | null>(null);
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [razorpayReady, setRazorpayReady] = useState(false);

  useEffect(() => {
    // Read cached recovery code from session stash if available
    if (typeof window !== 'undefined') {
      const stashed = sessionStorage.getItem(`recovery_${bookingNumber}`);
      if (stashed) setRecoveryCode(stashed);
    }

    async function loadData() {
      try {
        const bookingData = await apiClient<BookingDetailDto>(`api/v1/bookings/${bookingNumber}`);
        setBooking(bookingData);

        if (bookingData.status === 'CONFIRMED') {
          router.replace(`/booking/${bookingNumber}/success`);
          return;
        }

        // Pre-initialize payment order for seamless direct checkout
        const order = await apiClient<RazorpayOrderResponseDto>('api/v1/payments/create-order', {
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

  const copyRecoveryCode = () => {
    if (recoveryCode) {
      navigator.clipboard.writeText(recoveryCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Open Official Razorpay Checkout Modal
  const handleOpenRazorpay = () => {
    if (!orderData) return;

    if (typeof (window as any).Razorpay === 'undefined') {
      setErrorMessage('Razorpay SDK is loading. You can also use the Instant Test-Mode Payment below.');
      return;
    }

    const options = {
      key: orderData.keyId,
      amount: orderData.amountPaise,
      currency: orderData.currency,
      name: 'CEDOI Ticketing',
      description: `Admission Booking ${orderData.bookingNumber}`,
      image: '/brand/logo.png',
      order_id: orderData.orderId,
      prefill: {
        name: orderData.customerName,
        contact: orderData.customerPhone,
        email: orderData.customerEmail || undefined,
      },
      theme: {
        color: '#08537B',
      },
      handler: async function (response: any) {
        await verifyCapturedPayment({
          bookingNumber: orderData.bookingNumber,
          razorpayOrderId: response.razorpay_order_id,
          razorpayPaymentId: response.razorpay_payment_id,
          razorpaySignature: response.razorpay_signature,
        });
      },
      modal: {
        ondismiss: function () {
          setIsProcessing(false);
        },
      },
    };

    setIsProcessing(true);
    const rzp = new (window as any).Razorpay(options);
    rzp.open();
  };

  // Test-Mode Payment Simulation Harness
  const handleSimulateTestPayment = async () => {
    if (!orderData) return;
    setIsProcessing(true);

    const testPaymentId = `pay_test_${Date.now()}`;
    const testSignature = `sig_test_${Date.now()}`;

    await verifyCapturedPayment({
      bookingNumber: orderData.bookingNumber,
      razorpayOrderId: orderData.orderId,
      razorpayPaymentId: testPaymentId,
      razorpaySignature: testSignature,
    });
  };

  const verifyCapturedPayment = async (payload: {
    bookingNumber: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }) => {
    try {
      const result = await apiClient<PaymentVerificationResultDto>('api/v1/payments/verify', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (result.status === 'CONFIRMED') {
        router.push(`/booking/${bookingNumber}/success`);
      } else {
        setErrorMessage(`Payment result: ${result.status}. Please check your booking status.`);
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
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        onLoad={() => setRazorpayReady(true)}
      />

      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
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
            {/* Essential Recovery Code Box */}
            {recoveryCode && (
              <div className="p-5 rounded-[16px] bg-amber-50 border-2 border-amber-300 shadow-sm">
                <div className="flex items-start gap-3">
                  <Key className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-amber-900">Your Ticket Recovery Code</h3>
                    <p className="mt-1 text-xs text-amber-800 leading-relaxed">
                      Save this unguessable code to access or re-download your passes anytime without logging in:
                    </p>

                    <div className="mt-3 flex items-center gap-2">
                      <div className="px-4 py-2 bg-white rounded-[8px] font-mono text-base font-bold text-slate-900 tracking-wider border border-amber-200 select-all">
                        {recoveryCode}
                      </div>
                      <button
                        type="button"
                        onClick={copyRecoveryCode}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[8px] bg-amber-200 hover:bg-amber-300 text-amber-900 text-xs font-semibold transition-colors"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5 text-amber-900" />}
                        <span>{copied ? 'Copied!' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

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
                  <div>
                    <span className="text-slate-400 block mb-1">Membership Status:</span>
                    <MemberTypeBadge memberType={booking.memberType} size="sm" fullLabel />
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-1">Meal / Catering:</span>
                    <FoodPreferenceBadge preference={booking.foodPreference} size="sm" fullLabel />
                  </div>
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
                  <span>Razorpay Payment Gateway</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Pay securely via UPI (Google Pay, PhonePe, Paytm), Credit/Debit Cards, or NetBanking.
                </p>

                {/* Primary Razorpay Action Button */}
                <button
                  type="button"
                  onClick={handleOpenRazorpay}
                  disabled={isProcessing || !orderData}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-[12px] bg-[#EE8518] hover:bg-[#d26b0f] active:bg-[#ab4e10] disabled:opacity-50 text-white font-bold text-sm shadow-md transition-all"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Processing Payment...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Pay {formatPaise(booking.totalPaise)} with Razorpay</span>
                    </>
                  )}
                </button>
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
