'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Navbar } from '../../../../components/layout/Navbar';
import { Footer } from '../../../../components/layout/Footer';
import { StepIndicator } from '../../../../components/booking/StepIndicator';
import { TicketCard } from '../../../../components/booking/TicketCard';
import { apiClient, ApiError } from '../../../../lib/api-client';
import { PublicEventDto, ReservationResponseDto } from '@cedoi/contracts';
import { formatPaise } from '../../../../lib/formatters';
import { VegVectorIcon, NonVegVectorIcon } from '@cedoi/ui';
import { ArrowRight, ShieldCheck, AlertCircle, Loader2, Briefcase, MapPin, Utensils, CheckCircle2, Award, Building2 } from 'lucide-react';
import { TicketSelectionSkeleton } from '../../../../components/skeletons';

export default function TicketSelectionPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [event, setEvent] = useState<PublicEventDto | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('+91');
  const [customerEmail, setCustomerEmail] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [location, setLocation] = useState('Madurai');
  const [memberType, setMemberType] = useState<'MEMBER' | 'NON_MEMBER'>('NON_MEMBER');
  const [foodPreference, setFoodPreference] = useState<'VEG' | 'NON_VEG'>('VEG');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadEvent() {
      try {
        const data = await apiClient<PublicEventDto>(`api/v1/events/${slug}`);
        setEvent(data);
        const initialQty: Record<string, number> = {};
        data.ticketTypes.forEach((tt) => {
          initialQty[tt.id] = 0;
        });
        setQuantities(initialQty);
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to load event details.');
      } finally {
        setIsLoading(false);
      }
    }
    loadEvent();
  }, [slug]);

  const handleQuantityChange = (ticketTypeId: string, qty: number) => {
    setQuantities((prev) => ({
      ...prev,
      [ticketTypeId]: qty,
    }));
    setErrorMessage(null);
  };

  // Calculate live totals
  let totalTickets = 0;
  let totalPaise = 0;
  if (event) {
    event.ticketTypes.forEach((tt) => {
      const q = quantities[tt.id] || 0;
      totalTickets += q;
      totalPaise += q * tt.unitPricePaise;
    });
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (totalTickets === 0) {
      setErrorMessage('Please select at least 1 ticket to proceed.');
      return;
    }

    if (!customerName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    if (!customerPhone.trim() || customerPhone.trim().length < 10) {
      setErrorMessage('Please enter a valid mobile number (e.g. +919876543210).');
      return;
    }

    if (!customerEmail.trim()) {
      setErrorMessage('Please enter your email address for ticket confirmation.');
      return;
    }

    if (!businessName.trim()) {
      setErrorMessage('Please enter your business or company name.');
      return;
    }

    if (!location.trim()) {
      setErrorMessage('Please enter your city / location.');
      return;
    }

    const items = Object.entries(quantities)
      .filter(([_, q]) => q > 0)
      .map(([ticketTypeId, quantity]) => ({ ticketTypeId, quantity }));

    setIsSubmitting(true);
    try {
      const reservation = await apiClient<ReservationResponseDto>('api/v1/bookings/reserve', {
        method: 'POST',
        body: JSON.stringify({
          eventId: event!.id,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerEmail: customerEmail.trim() || undefined,
          businessName: businessName.trim(),
          location: location.trim(),
          memberType,
          foodPreference,
          items,
        }),
      });

      // Temporarily stash the recovery code in sessionStorage for immediate review
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(`recovery_${reservation.bookingNumber}`, reservation.recoveryCode);
      }

      // Navigate to Review step
      router.push(`/booking/${reservation.bookingNumber}`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to reserve tickets. Please check availability and try again.');
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50">
        <Navbar />
        <TicketSelectionSkeleton />
        <Footer />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50">
        <Navbar />
        <div className="flex-1 max-w-md mx-auto p-8 text-center">
          <h2 className="text-lg font-bold text-slate-900">Event Not Found</h2>
          <p className="mt-2 text-xs text-slate-500">The requested event could not be found or is unavailable.</p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <StepIndicator currentStep={1} />

        <div className="text-center max-w-2xl mx-auto mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Select Your Tickets
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            {event.name} • {event.venue || 'Courtyard by Marriott, Madurai'}
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 rounded-[12px] bg-rose-50 border border-rose-200 text-rose-900 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Ticket Categories List */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600">
              1. Choose Category & Quantities
            </h2>
            <div className="space-y-3">
              {event.ticketTypes.map((tt) => (
                <TicketCard
                  key={tt.id}
                  ticketType={tt}
                  quantity={quantities[tt.id] || 0}
                  onQuantityChange={(q) => handleQuantityChange(tt.id, q)}
                />
              ))}
            </div>
          </div>

          {/* Customer & Attendee Details Form */}
          <div className="bg-white rounded-[18px] p-6 border border-slate-200 shadow-sm space-y-6">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                2. Attendee & Delegate Registration Details
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Information used for delegate accreditation, custom event badges, and Marriott catering arrangements.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aarav Mehta"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-[10px] border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#08537B]/20 focus:border-[#08537B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+91 98765 43210"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-[10px] border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#08537B]/20 focus:border-[#08537B]"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Used for SMS updates and instant ticket recovery.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Email ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. aarav@acmecorp.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-[10px] border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#08537B]/20 focus:border-[#08537B]"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Your official PDF passes will be sent here.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Business / Company Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="e.g. Godiva Tech Solutions"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full h-11 pl-10 pr-3.5 rounded-[10px] border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#08537B]/20 focus:border-[#08537B]"
                  />
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  City / Location <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="e.g. Madurai, Chennai, Coimbatore..."
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full h-11 pl-10 pr-3.5 rounded-[10px] border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#08537B]/20 focus:border-[#08537B]"
                  />
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            </div>

            {/* Membership Type Selector */}
            <div className="pt-3 border-t border-slate-100">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                CEDOI Membership Status <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMemberType('MEMBER')}
                  className={`p-3.5 rounded-[12px] border text-left flex items-start gap-3 transition-all ${
                    memberType === 'MEMBER'
                      ? 'bg-blue-50/80 border-[#08537B] ring-2 ring-[#08537B]/20'
                      : 'bg-slate-50/60 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <Award className={`w-5 h-5 mt-0.5 shrink-0 ${memberType === 'MEMBER' ? 'text-[#08537B]' : 'text-slate-400'}`} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-bold ${memberType === 'MEMBER' ? 'text-[#08537B]' : 'text-slate-800'}`}>
                        CEDOI Member
                      </span>
                      {memberType === 'MEMBER' && (
                        <CheckCircle2 className="w-4 h-4 text-[#08537B]" />
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Active member of Confederation of Enterprise Development Organizations.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setMemberType('NON_MEMBER')}
                  className={`p-3.5 rounded-[12px] border text-left flex items-start gap-3 transition-all ${
                    memberType === 'NON_MEMBER'
                      ? 'bg-blue-50/80 border-[#08537B] ring-2 ring-[#08537B]/20'
                      : 'bg-slate-50/60 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <Briefcase className={`w-5 h-5 mt-0.5 shrink-0 ${memberType === 'NON_MEMBER' ? 'text-[#08537B]' : 'text-slate-400'}`} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-bold ${memberType === 'NON_MEMBER' ? 'text-[#08537B]' : 'text-slate-800'}`}>
                        Non-Member Delegate
                      </span>
                      {memberType === 'NON_MEMBER' && (
                        <CheckCircle2 className="w-4 h-4 text-[#08537B]" />
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Visiting founder, entrepreneur, investor, or general corporate attendee.
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Food / Catering Preference */}
            <div className="pt-3 border-t border-slate-100">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Marriott Buffet Lunch Preference <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFoodPreference('VEG')}
                  className={`p-3.5 rounded-[12px] border text-left flex items-start gap-3 transition-all ${
                    foodPreference === 'VEG'
                      ? 'bg-emerald-50/80 border-emerald-600 ring-2 ring-emerald-500/20'
                      : 'bg-slate-50/60 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                      foodPreference === 'VEG'
                        ? 'bg-emerald-100/70 border-emerald-300'
                        : 'bg-slate-100 border-slate-200'
                    }`}
                  >
                    <VegVectorIcon size={18} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-bold ${foodPreference === 'VEG' ? 'text-emerald-800' : 'text-slate-800'}`}>
                        Pure Vegetarian (Veg)
                      </span>
                      {foodPreference === 'VEG' && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Full day access to Courtyard by Marriott gourmet vegetarian buffet & high-tea.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFoodPreference('NON_VEG')}
                  className={`p-3.5 rounded-[12px] border text-left flex items-start gap-3 transition-all ${
                    foodPreference === 'NON_VEG'
                      ? 'bg-red-50/80 border-red-600 ring-2 ring-red-500/20'
                      : 'bg-slate-50/60 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                      foodPreference === 'NON_VEG'
                        ? 'bg-red-100/70 border-red-300'
                        : 'bg-slate-100 border-slate-200'
                    }`}
                  >
                    <NonVegVectorIcon size={18} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-bold ${foodPreference === 'NON_VEG' ? 'text-red-900' : 'text-slate-800'}`}>
                        Non-Vegetarian (Non-Veg)
                      </span>
                      {foodPreference === 'NON_VEG' && (
                        <CheckCircle2 className="w-4 h-4 text-red-600" />
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Full day access to Courtyard by Marriott specialty non-veg delicacies buffet & high-tea.
                    </p>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Sticky Checkout Bar */}
          <div className="p-5 rounded-[18px] bg-[#08537B] text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <div className="text-xs text-[#D5EBF7] font-semibold uppercase tracking-wider">
                Total Order Amount ({totalTickets} admission{totalTickets === 1 ? '' : 's'})
              </div>
              <div className="text-2xl font-black">{formatPaise(totalPaise)}</div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || totalTickets === 0}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-[12px] bg-[#EE8518] hover:bg-[#d26b0f] active:bg-[#ab4e10] disabled:opacity-50 disabled:pointer-events-none text-white font-bold text-sm shadow-sm transition-all"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Reserving Inventory...</span>
                </>
              ) : (
                <>
                  <span>Proceed to Review & Pay</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </main>

      <Footer />
    </div>
  );
}
