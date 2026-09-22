import React from 'react';
import Link from 'next/link';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import {
  ShieldAlert,
  FileText,
  UserCheck,
  CreditCard,
  Utensils,
  Camera,
  ShieldX,
  Car,
  AlertTriangle,
  Scale,
  Mail,
  ArrowLeft,
  CheckCircle2,
  Calendar,
  MapPin,
} from 'lucide-react';

export const metadata = {
  title: 'Terms of Admission & Delegate Policies | CEDOI Awards 2026',
  description:
    'Official terms and conditions, 18+ age restriction policies, delegate code of conduct, and catering regulations for CEDOI Awards 2026.',
};

export default function TermsAndConditionsPage() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 w-full">
        {/* Breadcrumb / Back Link */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/events/cedoi-awards-2026/tickets"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#08537B] hover:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Ticket Booking</span>
          </Link>
          <span className="text-[11px] font-medium text-slate-400">
            Effective Date: October 2026 Edition • Version 2.4
          </span>
        </div>

        {/* Page Header */}
        <div className="bg-white rounded-[22px] p-6 sm:p-10 border border-slate-200 shadow-sm mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-[#08537B] text-xs font-bold mb-4">
            <FileText className="w-3.5 h-3.5" />
            <span>Official Event Regulations</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Terms of Admission & Delegate Policies
          </h1>
          <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed max-w-3xl">
            Please read these terms and conditions carefully before booking admission passes for the{' '}
            <strong className="text-slate-900">CEDOI Awards 2026</strong>. By reserving, paying for, or attending with
            an admission pass, you and all delegates registered on your booking agree to be bound by the terms outlined below.
          </p>

          <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#EE8518] shrink-0" />
              <span>Saturday, October 10, 2026</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#08537B] shrink-0" />
              <span>Velammal Ida Scudder Auditorium, Madurai</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="font-bold text-rose-600">Strictly 18+ Age Restriction</span>
            </div>
          </div>
        </div>

        {/* Critical Age Notice Callout */}
        <div className="p-5 sm:p-6 rounded-[18px] bg-amber-50 border-2 border-amber-300 text-amber-950 mb-8 shadow-sm flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm font-black text-sm">
            18+
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-extrabold text-amber-950 flex items-center gap-2">
              <span>Mandatory Age Requirement (18 Years & Above)</span>
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-amber-900 leading-relaxed">
              Admission to CEDOI Awards 2026 is <strong>strictly restricted to individuals aged 18 years and older</strong>.
              Minors, children, and infants are not permitted inside the conference halls, award ceremonies, or banquet areas.
              Passes purchased for individuals under 18 will be denied entry without refund.
            </p>
          </div>
        </div>

        {/* Terms Sections */}
        <div className="space-y-6">
          {/* Section 1 */}
          <section className="bg-white rounded-[18px] p-6 sm:p-8 border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#08537B] flex items-center justify-center font-bold text-sm">
                1
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-[#08537B]" />
                <span>Eligibility, Registration & Age Policy</span>
              </h2>
            </div>
            <div className="text-xs sm:text-sm text-slate-600 leading-relaxed space-y-2 pl-11">
              <p>
                1.1. All attendees, delegates, and award nominees must be <strong>18 years of age or older</strong> on or before
                October 10, 2026.
              </p>
              <p>
                1.2. Accurate information, including full legal name, active mobile number, verifiable email address, and company/business
                designation, must be provided during booking. Providing false age declarations or falsified information constitutes a
                violation of admission rules.
              </p>
              <p>
                1.3. Gate security staff reserve the right to verify delegate eligibility and age at the venue gate.
              </p>
            </div>
          </section>

          {/* Section 2 */}
          <section className="bg-white rounded-[18px] p-6 sm:p-8 border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#08537B] flex items-center justify-center font-bold text-sm">
                2
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#08537B]" />
                <span>Admission Passes & Cryptographic QR Verification</span>
              </h2>
            </div>
            <div className="text-xs sm:text-sm text-slate-600 leading-relaxed space-y-2 pl-11">
              <p>
                2.1. Each admission pass contains a unique, cryptographically signed 256-bit QR credential. Each QR pass admits
                strictly <strong>one individual delegate</strong> and is permanently invalidated once scanned and verified at the venue gate.
              </p>
              <p>
                2.2. Duplication, digital tampering, screenshot sharing, or resale of admission QR passes is strictly prohibited.
                If duplicate QR codes are presented, only the first verified check-in will be admitted; subsequent attempts will trigger
                an immediate security exception.
              </p>
              <p>
                2.3. Digital passes displayed on a mobile device or high-resolution printed PDF passes downloaded from the official CEDOI
                ticketing portal are both accepted at check-in.
              </p>
            </div>
          </section>

          {/* Section 3 */}
          <section className="bg-white rounded-[18px] p-6 sm:p-8 border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#08537B] flex items-center justify-center font-bold text-sm">
                3
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#08537B]" />
                <span>Cancellation, Refund & Delegate Transfer Policy</span>
              </h2>
            </div>
            <div className="text-xs sm:text-sm text-slate-600 leading-relaxed space-y-2 pl-11">
              <p>
                3.1. <strong>Strict No-Refund Policy:</strong> All ticket bookings and pass reservations are strictly non-refundable and
                non-cancellable once payment has been captured and confirmed via our payment gateway (Cashfree).
              </p>
              <p>
                3.2. <strong>Delegate Name Reassignment:</strong> If a registered delegate is unable to attend due to unforeseen
                business or personal commitments, the pass may be reassigned to a qualifying colleague or business associate (aged 18+) up to
                <strong> 48 hours prior</strong> to the event date by contacting <code className="text-[#08537B] bg-blue-50 px-1.5 py-0.5 rounded">support@cedoi.org</code> with the booking number and recovery code.
              </p>
              <p>
                3.3. In the event of duplicate payment debits caused by banking gateway timeouts, verified excess amounts will be reconciled
                and refunded to the original payment source within 5 to 7 business days.
              </p>
            </div>
          </section>

          {/* Section 4 */}
          <section className="bg-white rounded-[18px] p-6 sm:p-8 border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#08537B] flex items-center justify-center font-bold text-sm">
                4
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <Utensils className="w-5 h-5 text-[#08537B]" />
                <span>Celebration Banquet & Catering Protocols</span>
              </h2>
            </div>
            <div className="text-xs sm:text-sm text-slate-600 leading-relaxed space-y-2 pl-11">
              <p>
                4.1. Each confirmed admission pass includes access to the full-day catering program, comprising welcome refreshments,
                the Grand Celebration Lunch Banquet, and evening High-Tea.
              </p>
              <p>
                4.2. Meal preferences (<strong>Pure Vegetarian</strong> or <strong>Non-Vegetarian</strong>) selected during the registration
                process are encoded into the delegate badge. Catering counters will strictly honor the dietary preference indicated on
                your pass to ensure proper hospitality inventory management.
              </p>
              <p>
                4.3. Outside food, commercial catering, beverages, and alcoholic drinks are strictly prohibited within the auditorium premises.
              </p>
            </div>
          </section>

          {/* Section 5 */}
          <section className="bg-white rounded-[18px] p-6 sm:p-8 border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#08537B] flex items-center justify-center font-bold text-sm">
                5
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <ShieldX className="w-5 h-5 text-[#08537B]" />
                <span>Delegate Code of Conduct & Venue Decorum</span>
              </h2>
            </div>
            <div className="text-xs sm:text-sm text-slate-600 leading-relaxed space-y-2 pl-11">
              <p>
                5.1. CEDOI is committed to providing a professional, respectful, and safe summit environment. Attendees are expected to
                maintain courteous business etiquette at all times.
              </p>
              <p>
                5.2. Harassment, disruptive behavior, discriminatory remarks, unauthorized sales pitches inside the main auditorium, or
                belligerence towards staff, speakers, or fellow delegates will result in immediate badge revocation and expulsion without refund.
              </p>
              <p>
                5.3. Mobile phones must be kept in silent mode inside the main auditorium during keynote addresses, panel discussions, and the
                award presentation ceremonies.
              </p>
            </div>
          </section>

          {/* Section 6 */}
          <section className="bg-white rounded-[18px] p-6 sm:p-8 border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#08537B] flex items-center justify-center font-bold text-sm">
                6
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <Camera className="w-5 h-5 text-[#08537B]" />
                <span>Media, Broadcast & Photography Consent</span>
              </h2>
            </div>
            <div className="text-xs sm:text-sm text-slate-600 leading-relaxed space-y-2 pl-11">
              <p>
                6.1. Official event photographers and accredited broadcast teams will be capturing video, still photography, and audio
                recordings throughout the summit for archival, marketing, and media dissemination.
              </p>
              <p>
                6.2. By entering the event premises, you irrevocably grant CEDOI, its media partners, and affiliates the right to use
                your likeness, photograph, voice, or video footage in promotional broadcasts, social channels, and print publications without
                financial compensation.
              </p>
            </div>
          </section>

          {/* Section 7 */}
          <section className="bg-white rounded-[18px] p-6 sm:p-8 border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#08537B] flex items-center justify-center font-bold text-sm">
                7
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-[#08537B]" />
                <span>Security Inspection, Bag Checks & Prohibited Items</span>
              </h2>
            </div>
            <div className="text-xs sm:text-sm text-slate-600 leading-relaxed space-y-2 pl-11">
              <p>
                7.1. For attendee safety, all bags, backpacks, and personal items are subject to security screening at the auditorium perimeter.
              </p>
              <p>
                7.2. Prohibited items include: weapons, firearms, sharp objects, fireworks, flammable liquids, unauthorized commercial flyers,
                and illegal narcotics. Any attendee attempting to carry prohibited items will be handed over to local law enforcement.
              </p>
            </div>
          </section>

          {/* Section 8 */}
          <section className="bg-white rounded-[18px] p-6 sm:p-8 border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#08537B] flex items-center justify-center font-bold text-sm">
                8
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <Car className="w-5 h-5 text-[#08537B]" />
                <span>Parking & Personal Property</span>
              </h2>
            </div>
            <div className="text-xs sm:text-sm text-slate-600 leading-relaxed space-y-2 pl-11">
              <p>
                8.1. Complimentary vehicle parking is provided at Velammal Ida Scudder Auditorium campus on a first-come, first-served basis.
              </p>
              <p>
                8.2. CEDOI and venue management assume no responsibility for loss, theft, or damage to personal items, laptops, or vehicles
                parked at the campus. Delegates are advised to keep personal valuables secured at all times.
              </p>
            </div>
          </section>

          {/* Section 9 */}
          <section className="bg-white rounded-[18px] p-6 sm:p-8 border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#08537B] flex items-center justify-center font-bold text-sm">
                9
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-[#08537B]" />
                <span>Force Majeure & Schedule Modifications</span>
              </h2>
            </div>
            <div className="text-xs sm:text-sm text-slate-600 leading-relaxed space-y-2 pl-11">
              <p>
                9.1. CEDOI reserves the right to make reasonable alterations to the speaker schedule, award categories, or masterclass order
                if required by operational contingencies without notice.
              </p>
              <p>
                9.2. In the event of cancellation or postponement driven by force majeure (such as natural catastrophes, pandemics, civic
                unrest, or statutory governmental orders), tickets will be transferred to the rescheduled date. CEDOI shall not be liable for
                ancillary travel or lodging expenses incurred by delegates.
              </p>
            </div>
          </section>

          {/* Section 10 */}
          <section className="bg-white rounded-[18px] p-6 sm:p-8 border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#08537B] flex items-center justify-center font-bold text-sm">
                10
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <Scale className="w-5 h-5 text-[#08537B]" />
                <span>Governing Law & Dispute Resolution</span>
              </h2>
            </div>
            <div className="text-xs sm:text-sm text-slate-600 leading-relaxed space-y-2 pl-11">
              <p>
                10.1. These Terms and Conditions shall be governed by and construed in accordance with the laws of the Republic of India.
              </p>
              <p>
                10.2. Any disputes, claims, or controversies arising out of or relating to ticket purchases or event participation shall be
                subject to the exclusive legal jurisdiction of the competent courts in <strong>Madurai, Tamil Nadu, India</strong>.
              </p>
            </div>
          </section>
        </div>

        {/* Contact & Grievance Card */}
        <div className="mt-8 p-6 sm:p-8 rounded-[20px] bg-[#08537B] text-white shadow-md flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center sm:text-left">
            <div className="text-xs text-[#D5EBF7] font-semibold uppercase tracking-wider">
              Have Questions or Need Assistance?
            </div>
            <div className="text-lg sm:text-xl font-bold">
              Organizing Secretariat & Grievance Desk
            </div>
            <p className="text-xs text-[#D5EBF7] max-w-md">
              For delegate name transfers, corporate group bookings, or special accessibility assistance, get in touch with our team.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
            <a
              href="mailto:support@cedoi.org"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-[#08537B] text-xs font-bold hover:bg-blue-50 transition-colors shadow-sm"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>support@cedoi.org</span>
            </a>
            <Link
              href="/events/cedoi-awards-2026/tickets"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#EE8518] text-white text-xs font-bold hover:bg-[#d26b0f] transition-colors shadow-sm"
            >
              <span>Book Ticket</span>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
