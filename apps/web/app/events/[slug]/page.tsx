import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Navbar } from '../../../components/layout/Navbar';
import { Footer } from '../../../components/layout/Footer';
import { apiClient } from '../../../lib/api-client';
import { PublicEventDto } from '@cedoi/contracts';
import { formatEventDate, formatEventTime, formatPaise } from '../../../lib/formatters';
import { Calendar, MapPin, Clock, ArrowRight, ShieldCheck, Check, Sparkles, AlertCircle } from 'lucide-react';

async function getEvent(slug: string): Promise<PublicEventDto | null> {
  try {
    return await apiClient<PublicEventDto>(`api/v1/events/${slug}`, { cache: 'no-store' });
  } catch {
    return null;
  }
}

export default async function EventDetailPage({ params }: { params: { slug: string } }) {
  const event = await getEvent(params.slug);

  if (!event) {
    notFound();
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 w-full overflow-x-hidden">
      <Navbar />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 overflow-x-hidden">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-slate-500 mb-6">
          <Link href="/" className="hover:text-[#08537B]">Home</Link>
          <span>/</span>
          <Link href="/" className="hover:text-[#08537B]">Events</Link>
          <span>/</span>
          <span className="text-slate-800 font-semibold">{event.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Info Column */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-[18px] p-6 sm:p-8 border border-slate-200 shadow-sm">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EE8518]/10 text-[#EE8518] text-xs font-bold uppercase tracking-wider mb-4">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Published Event</span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
                {event.name}
              </h1>

              {event.tagline && (
                <p className="mt-2 text-xs sm:text-sm font-bold text-[#EE8518] tracking-widest uppercase">
                  {event.tagline}
                </p>
              )}

              <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#08537B]/10 flex items-center justify-center text-[#08537B] shrink-0">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 font-medium">Event Date</div>
                    <div className="font-bold text-slate-900">{formatEventDate(event.startsAt, event.timezone)}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#08537B]/10 flex items-center justify-center text-[#08537B] shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 font-medium">Session Hours</div>
                    <div className="font-bold text-slate-900">
                      {formatEventTime(event.startsAt, event.timezone)} – {formatEventTime(event.endsAt, event.timezone)}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 sm:col-span-2">
                  <div className="w-9 h-9 rounded-lg bg-[#08537B]/10 flex items-center justify-center text-[#08537B] shrink-0 mt-0.5">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 font-medium">Venue & Location</div>
                    <div className="font-bold text-slate-900">{event.venue}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{event.address}</div>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100">
                <h2 className="text-base font-bold text-slate-900 mb-3">About the Event & Awards Celebration</h2>
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                  {event.description}
                </p>
              </div>
            </div>

            {/* Entry Guidelines Card */}
            <div className="bg-slate-50 rounded-[18px] p-6 border border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#08537B]" />
                <span>Admission Protocol & Gate Guidelines</span>
              </h3>
              <ul className="space-y-2 text-xs text-slate-600">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Each ticket represents one single-entry admission. No re-entry is permitted in V1.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Present your digital ticket QR on your mobile browser or printed A4 PDF at the gate.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Gates open 1 hour prior to official keynote commencement.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Sticky Booking Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-28 bg-white rounded-[18px] p-6 border border-slate-200 shadow-sm">
              <h3 className="text-base font-bold text-slate-900 mb-4">Tickets & Passes</h3>

              <div className="space-y-3 mb-6">
                {event.ticketTypes.map((t) => (
                  <div key={t.id} className="p-3.5 rounded-[12px] bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-900">{t.name}</div>
                      <div className="text-[11px] text-slate-500">{t.remainingCapacity} remaining</div>
                    </div>
                    <div className="text-sm font-extrabold text-[#08537B]">
                      {formatPaise(t.unitPricePaise)}
                    </div>
                  </div>
                ))}
              </div>

              <Link
                href={`/events/${event.slug}/tickets`}
                className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-[12px] bg-[#EE8518] hover:bg-[#d26b0f] active:bg-[#ab4e10] text-white font-bold text-sm shadow-sm transition-colors"
              >
                <span>Select Tickets & Book</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
