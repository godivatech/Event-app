'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Navbar } from '../../../../components/layout/Navbar';
import { Footer } from '../../../../components/layout/Footer';
import { StepIndicator } from '../../../../components/booking/StepIndicator';
import { TicketCard } from '../../../../components/booking/TicketCard';
import Link from 'next/link';
import { apiClient, ApiError } from '../../../../lib/api-client';
import { PublicEventDto, ReservationResponseDto } from '@cedoi/contracts';
import { formatPaise } from '../../../../lib/formatters';
import { VegVectorIcon, NonVegVectorIcon } from '@cedoi/ui';
import {
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Briefcase,
  MapPin,
  Utensils,
  CheckCircle2,
  Award,
  Building2,
  User,
} from 'lucide-react';
import { TicketSelectionSkeleton } from '../../../../components/skeletons';

export default function TicketSelectionPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [event, setEvent] = useState<PublicEventDto | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [location, setLocation] = useState('');
  const [age, setAge] = useState('');
  const [ageWarning, setAgeWarning] = useState<string | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [termsError, setTermsError] = useState(false);
  const [memberType, setMemberType] = useState<'MEMBER' | 'NON_MEMBER'>('MEMBER');
  const [membershipCode, setMembershipCode] = useState('');
  const [membershipCodeError, setMembershipCodeError] = useState<string | null>(null);
  const [foodPreference, setFoodPreference] = useState<'VEG' | 'NON_VEG'>('VEG');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [ticketError, setTicketError] = useState(false);

  useEffect(() => {
    async function loadEvent() {
      try {
        const data = await apiClient<PublicEventDto>(`api/v1/events/${slug}`);
        setEvent(data);
        const initialQty: Record<string, number> = {};
        data.ticketTypes.forEach((tt) => {
          initialQty[tt.id] = 0;
        });

        // Restore form draft from sessionStorage if user previously filled it
        if (typeof window !== 'undefined') {
          try {
            const savedDraft = sessionStorage.getItem(`cedoi_ticket_draft_${slug}`);
            if (savedDraft) {
              const parsed = JSON.parse(savedDraft);
              if (parsed.customerName) setCustomerName(parsed.customerName);
              if (parsed.customerPhone) setCustomerPhone(parsed.customerPhone);
              if (parsed.customerEmail) setCustomerEmail(parsed.customerEmail);
              if (parsed.businessName) setBusinessName(parsed.businessName);
              if (parsed.location) setLocation(parsed.location);
              if (parsed.age) setAge(parsed.age);
              if (parsed.memberType === 'MEMBER' || parsed.memberType === 'NON_MEMBER') {
                setMemberType(parsed.memberType);
              }
              if (parsed.membershipCode && typeof parsed.membershipCode === 'string') {
                setMembershipCode(parsed.membershipCode);
              }
              if (parsed.foodPreference === 'VEG' || parsed.foodPreference === 'NON_VEG') {
                setFoodPreference(parsed.foodPreference);
              }
              if (typeof parsed.agreedToTerms === 'boolean') {
                setAgreedToTerms(parsed.agreedToTerms);
              }
              if (parsed.quantities && typeof parsed.quantities === 'object') {
                Object.keys(parsed.quantities).forEach((k) => {
                  if (initialQty[k] !== undefined) {
                    initialQty[k] = parsed.quantities[k];
                  }
                });
              }
            }
          } catch (e) {
            // Ignore parse errors
          }
        }

        setQuantities(initialQty);
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to load event details.');
      } finally {
        setIsLoading(false);
      }
    }
    loadEvent();
  }, [slug]);

  // Auto-save form draft to sessionStorage whenever any field changes
  useEffect(() => {
    if (isLoading || typeof window === 'undefined') return;
    try {
      const draft = {
        quantities,
        customerName,
        customerPhone,
        customerEmail,
        businessName,
        location,
        age,
        memberType,
        membershipCode,
        foodPreference,
        agreedToTerms,
      };
      sessionStorage.setItem(`cedoi_ticket_draft_${slug}`, JSON.stringify(draft));
    } catch (e) {
      // Storage error safeguard
    }
  }, [
    isLoading,
    slug,
    quantities,
    customerName,
    customerPhone,
    customerEmail,
    businessName,
    location,
    age,
    memberType,
    membershipCode,
    foodPreference,
    agreedToTerms,
  ]);

  const handleMemberTypeChange = (type: 'MEMBER' | 'NON_MEMBER') => {
    setMemberType(type);
    setErrorMessage(null);
    if (type === 'NON_MEMBER') {
      setMembershipCodeError(null);
    }
  };

  const handleQuantityChange = (ticketTypeId: string, qty: number) => {
    setQuantities((prev) => ({
      ...prev,
      [ticketTypeId]: qty,
    }));
    setErrorMessage(null);
    setTicketError(false);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Keep only numeric characters
    let digits = e.target.value.replace(/\D/g, '');
    // If user pastes +91 or 91 with full number, strip country code
    if (digits.startsWith('91') && digits.length > 10) {
      digits = digits.slice(2);
    }
    // Hard-cap at exactly 10 digits
    if (digits.length > 10) {
      digits = digits.slice(0, 10);
    }
    setCustomerPhone(digits);
    setErrorMessage(null);
  };

  const handleAgeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setAge(val);
    setErrorMessage(null);
    if (!val) {
      setAgeWarning(null);
      return;
    }
    const num = parseInt(val, 10);
    if (!isNaN(num) && num < 18) {
      setAgeWarning('Admission is strictly restricted to delegates aged 18 and above.');
    } else {
      setAgeWarning(null);
    }
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
      setTicketError(true);
      setErrorMessage('Please select at least 1 ticket category above to proceed.');
      if (typeof document !== 'undefined') {
        const elem = document.getElementById('ticket-selection-section');
        if (elem) {
          elem.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
      return;
    }

    if (!customerName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    const digits = customerPhone.replace(/\D/g, '');
    if (digits.length !== 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }
    const formattedPhone = `+91${digits}`;

    if (!customerEmail.trim()) {
      setErrorMessage('Please enter your email address for ticket confirmation.');
      return;
    }

    if (!businessName.trim()) {
      setErrorMessage('Please enter your business or company name.');
      return;
    }

    if (!location.trim()) {
      setErrorMessage('Please enter your city or location.');
      return;
    }

    if (!age.trim()) {
      setErrorMessage('Please enter your age. Admission is restricted to delegates aged 18 and above.');
      return;
    }

    const parsedAge = parseInt(age, 10);
    if (isNaN(parsedAge) || parsedAge < 18) {
      setErrorMessage('Admission is strictly restricted to delegates aged 18 and above.');
      return;
    }

    // Strict validation for CEDOI members
    if (memberType === 'MEMBER') {
      const trimmedCode = membershipCode.trim();
      if (!trimmedCode) {
        setMembershipCodeError('Please enter your CEDOI Membership ID or Code.');
        setErrorMessage('CEDOI Membership ID / Code is required for member registrations.');
        if (typeof document !== 'undefined') {
          const elem = document.getElementById('membership-code-input');
          if (elem) {
            elem.scrollIntoView({ behavior: 'smooth', block: 'center' });
            elem.focus();
          }
        }
        return;
      }
      if (trimmedCode.length < 3) {
        setMembershipCodeError('Membership ID / Code must be at least 3 characters.');
        setErrorMessage('Please enter a valid CEDOI Membership ID (minimum 3 characters).');
        return;
      }
    }

    if (!agreedToTerms) {
      setTermsError(true);
      if (typeof document !== 'undefined') {
        const elem = document.getElementById('terms-section');
        if (elem) {
          elem.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
      return;
    }

    const items = Object.entries(quantities)
      .filter(([_, q]) => q > 0)
      .map(([ticketTypeId, quantity]) => ({ ticketTypeId, quantity }));

    const cleanedMembershipCode =
      memberType === 'MEMBER' ? membershipCode.trim().toUpperCase() : undefined;

    setIsSubmitting(true);
    try {
      const reservation = await apiClient<ReservationResponseDto>('api/v1/bookings/reserve', {
        method: 'POST',
        body: JSON.stringify({
          eventId: event!.id,
          customerName: customerName.trim(),
          customerPhone: formattedPhone,
          customerEmail: customerEmail.trim() || undefined,
          businessName: businessName.trim(),
          location: location.trim(),
          age: parsedAge,
          agreedToTerms: true,
          memberType,
          membershipCode: cleanedMembershipCode,
          foodPreference,
          items,
        }),
      });

      // Clear saved draft upon successful reservation creation
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.removeItem(`cedoi_ticket_draft_${slug}`);
        } catch (e) {
          // Ignore
        }
      }

      // If Member, tickets and scannable QR passes are issued instantly! Direct route to pass display.
      if (reservation.isMember || memberType === 'MEMBER') {
        router.push(`/booking/${reservation.bookingNumber}/success`);
      } else {
        // Non-members proceed to Review & Online Payment
        router.push(`/booking/${reservation.bookingNumber}`);
      }
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
    <div className="flex flex-col min-h-screen bg-slate-50 w-full overflow-x-hidden">
      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8 w-full overflow-x-hidden">
        <StepIndicator currentStep={1} />

        <div className="text-center max-w-2xl mx-auto mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Select Your Tickets
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            {event.name} • {event.venue || 'Velammal Ida Scudder Auditorium, Madurai'}
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
          <div id="ticket-selection-section" className="space-y-4 scroll-mt-24">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <span>1. Choose Category & Quantities</span>
                <span className="text-red-500">*</span>
              </h2>
              <span
                className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                  totalTickets > 0
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {totalTickets} ticket{totalTickets === 1 ? '' : 's'} selected
              </span>
            </div>

            {ticketError && (
              <div className="p-3.5 rounded-xl bg-amber-50 border-2 border-amber-400 text-amber-900 text-xs font-semibold flex items-center gap-2.5 animate-pulse shadow-sm">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Please choose at least 1 pass by clicking the <strong>+</strong> button on any category below.</span>
              </div>
            )}

            <div className={`space-y-3 p-1 rounded-2xl transition-all ${ticketError ? 'ring-2 ring-amber-400 ring-offset-2' : ''}`}>
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
                Information used for delegate accreditation, custom event badges, and banquet catering arrangements.
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
                  placeholder="Enter your full name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-[10px] border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#08537B]/20 focus:border-[#08537B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-0 inset-y-0 flex items-center pl-3 pr-2.5 border-r border-slate-200 bg-slate-50 rounded-l-[10px] text-xs font-bold text-slate-600 select-none pointer-events-none">
                    +91
                  </div>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={10}
                    required
                    placeholder="Enter 10-digit mobile number"
                    value={customerPhone}
                    onChange={handlePhoneChange}
                    className="w-full h-11 pl-14 pr-3.5 rounded-[10px] border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#08537B]/20 focus:border-[#08537B]"
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                  <span>Used for SMS updates & ticket recovery.</span>
                  <span className={`font-mono font-medium ${customerPhone.length === 10 ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                    {customerPhone.length}/10
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Email ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="Enter your email address"
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
                    placeholder="Enter your business or company name"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full h-11 pl-10 pr-3.5 rounded-[10px] border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#08537B]/20 focus:border-[#08537B]"
                  />
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  City / Location <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Enter your city or location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full h-11 pl-10 pr-3.5 rounded-[10px] border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#08537B]/20 focus:border-[#08537B]"
                  />
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Age (Years) <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                    18+ Only
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min={18}
                    max={120}
                    required
                    placeholder="e.g. 28"
                    value={age}
                    onChange={handleAgeChange}
                    className={`w-full h-11 pl-10 pr-3.5 rounded-[10px] border text-sm text-slate-900 focus:outline-none focus:ring-2 ${
                      ageWarning
                        ? 'border-rose-400 bg-rose-50/40 focus:ring-rose-200 focus:border-rose-500'
                        : 'border-slate-300 focus:ring-[#08537B]/20 focus:border-[#08537B]'
                    }`}
                  />
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
                {ageWarning ? (
                  <p className="text-[11px] font-semibold text-rose-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{ageWarning}</span>
                  </p>
                ) : (
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Only delegates aged 18 and above are accepted.
                  </span>
                )}
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
                  onClick={() => handleMemberTypeChange('MEMBER')}
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
                  onClick={() => handleMemberTypeChange('NON_MEMBER')}
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

              {/* Conditional Membership ID Input for CEDOI Members */}
              {memberType === 'MEMBER' && (
                <div
                  id="membership-code-section"
                  className="mt-4 p-4 rounded-[14px] bg-blue-50/70 border-2 border-blue-200 animate-in fade-in slide-in-from-top-2 duration-200"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="membership-code-input"
                      className="block text-xs font-bold text-[#08537B] uppercase tracking-wider"
                    >
                      CEDOI Membership ID / Member Code <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-[#08537B] border border-blue-200">
                      Required for Member Passes
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      id="membership-code-input"
                      type="text"
                      required
                      placeholder="Enter your CEDOI Member Code"
                      value={membershipCode}
                      onChange={(e) => {
                        setMembershipCode(e.target.value.toUpperCase());
                        setMembershipCodeError(null);
                        setErrorMessage(null);
                      }}
                      className={`w-full h-11 pl-10 pr-3.5 rounded-[10px] border text-sm font-mono uppercase text-slate-900 bg-white placeholder:normal-case placeholder:font-sans placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                        membershipCodeError
                          ? 'border-rose-400 bg-rose-50/30 focus:ring-rose-200 focus:border-rose-500'
                          : 'border-blue-300 focus:ring-[#08537B]/20 focus:border-[#08537B]'
                      }`}
                    />
                    <Award className="w-4 h-4 text-[#08537B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                  {membershipCodeError ? (
                    <p className="text-[11px] font-semibold text-rose-600 mt-1.5 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{membershipCodeError}</span>
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-600 mt-1.5 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                      <span>
                        Enter your valid CEDOI membership code. Direct pass issuance with internal offline verification.
                      </span>
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Food / Catering Preference */}
            <div className="pt-3 border-t border-slate-100">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Celebration Lunch Banquet Preference <span className="text-red-500">*</span>
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
                      Full day access to grand gourmet vegetarian banquet & high-tea refreshments.
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
                      Full day access to grand specialty non-veg delicacies banquet & high-tea refreshments.
                    </p>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Terms & Conditions Agreement */}
          <div
            id="terms-section"
            className={`p-4 sm:p-5 rounded-[16px] border transition-all ${
              termsError
                ? 'bg-rose-50/70 border-rose-400 ring-2 ring-rose-400/20 shadow-xs'
                : 'bg-white border-slate-200 shadow-xs'
            }`}
          >
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => {
                  setAgreedToTerms(e.target.checked);
                  setTermsError(false);
                }}
                className={`w-4 h-4 rounded text-[#08537B] focus:ring-[#08537B] cursor-pointer shrink-0 ${
                  termsError ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-300'
                }`}
              />
              <span className="text-xs sm:text-sm text-slate-700 font-medium">
                I confirm that all delegates are above 18 years of age and agree to the{' '}
                <Link
                  href="/terms"
                  target="_blank"
                  className="text-[#08537B] font-bold underline hover:text-[#063d5a]"
                >
                  Terms & Conditions
                </Link>.
              </span>
            </label>

            {termsError && (
              <div className="mt-2.5 pt-2.5 border-t border-rose-200/80 text-xs font-semibold text-rose-600 flex items-center gap-1.5 pl-7 animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>Please check this box to confirm you are above 18 and agree to the Terms & Conditions.</span>
              </div>
            )}
          </div>

          {/* Sticky Checkout Bar */}
          <div className="p-5 rounded-[18px] bg-[#08537B] text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              {totalTickets === 0 ? (
                <div>
                  <div className="text-xs text-amber-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>No Tickets Selected</span>
                  </div>
                  <div className="text-xs text-[#D5EBF7] mt-0.5">
                    Select at least 1 pass category above to proceed to review.
                  </div>
                </div>
              ) : memberType === 'MEMBER' ? (
                <div>
                  <div className="text-xs text-emerald-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                    <span>CEDOI Member Registration ({totalTickets} admission{totalTickets === 1 ? '' : 's'})</span>
                  </div>
                  <div className="text-xs text-[#D5EBF7] mt-0.5">
                    Direct Pass Issuance • Instant scannable QR ticket generation
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-xs text-[#D5EBF7] font-semibold uppercase tracking-wider">
                    Total Order Amount ({totalTickets} admission{totalTickets === 1 ? '' : 's'})
                  </div>
                  <div className="text-2xl font-black">{formatPaise(totalPaise)}</div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-[12px] font-bold text-sm shadow-sm transition-all ${
                totalTickets === 0
                  ? 'bg-amber-500 hover:bg-amber-600 text-white cursor-pointer'
                  : 'bg-[#EE8518] hover:bg-[#d26b0f] active:bg-[#ab4e10] text-white'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{memberType === 'MEMBER' ? 'Issuing Member Passes...' : 'Booking Your Pass...'}</span>
                </>
              ) : totalTickets === 0 ? (
                <>
                  <span>Select Tickets to Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : memberType === 'MEMBER' ? (
                <>
                  <span>Confirm Member Registration & Get Passes</span>
                  <ArrowRight className="w-4 h-4" />
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
