import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { Calendar, MapPin, Clock, ArrowRight, ShieldCheck, Sparkles, Award, Users, CheckCircle2 } from 'lucide-react';
import { apiClient } from '../lib/api-client';
import { PublicEventDto } from '@cedoi/contracts';
import { formatPaise } from '../lib/formatters';

async function getPublishedEvent(): Promise<PublicEventDto | null> {
  try {
    const events = await apiClient<PublicEventDto[]>('api/v1/events', { cache: 'no-store' });
    return events.length > 0 ? events[0] : null;
  } catch (e) {
    return null;
  }
}

export default async function HomePage() {
  const event = await getPublishedEvent();

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden brand-hero-bg pt-12 pb-20 sm:pt-16 sm:pb-28 border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EE8518]/10 border border-[#EE8518]/30 text-[#EE8518] text-xs font-bold uppercase tracking-wider mb-6">
                <Sparkles className="w-3.5 h-3.5 text-[#EE8518]" />
                <span>Annual Flagship Summit 2026</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight">
                CEDOI Entrepreneur Summit 2026
              </h1>

              <p className="mt-3 text-sm sm:text-base font-bold text-[#EE8518] tracking-widest uppercase">
                BUILDING OUTSTANDING ENTREPRENEURS
              </p>

              <p className="mt-6 text-base sm:text-lg text-slate-600 leading-relaxed">
                The premier gathering of visionary founders, angel syndicates, venture capitalists, and industry leaders. Immerse yourself in high-impact keynote sessions, masterclasses, and executive networking.
              </p>

              {/* Event Metadata Highlights */}
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-slate-200">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#08537B]/10 flex items-center justify-center text-[#08537B] shrink-0 mt-0.5">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-500 uppercase">Date</div>
                    <div className="text-sm font-bold text-slate-900">Sunday, Oct 25, 2026</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#08537B]/10 flex items-center justify-center text-[#08537B] shrink-0 mt-0.5">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-500 uppercase">Timing</div>
                    <div className="text-sm font-bold text-slate-900">09:00 AM – 06:00 PM IST</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#08537B]/10 flex items-center justify-center text-[#08537B] shrink-0 mt-0.5">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-500 uppercase">Location</div>
                    <div className="text-sm font-bold text-slate-900">{event?.venue || 'Courtyard by Marriott, Madurai'}</div>
                  </div>
                </div>
              </div>

              {/* Primary Call to Action */}
              <div className="mt-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <Link
                  href={event ? `/events/${event.slug}/tickets` : '/events/cedoi-summit-2026/tickets'}
                  className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 bg-[#EE8518] hover:bg-[#d26b0f] active:bg-[#ab4e10] text-white font-bold text-base rounded-[12px] shadow-md transition-all group"
                >
                  <span>Book Tickets Now</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link
                  href={event ? `/events/${event.slug}` : '/events/cedoi-summit-2026'}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-sm rounded-[12px] border border-slate-300 transition-colors"
                >
                  <span>View Summit Agenda</span>
                </Link>
              </div>

              {/* Trust badges */}
              <div className="mt-8 flex items-center gap-6 text-xs text-slate-500">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Verified Razorpay Checkout</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#08537B]" />
                  <span>Instant Scannable Digital Passes</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Categories Preview Section */}
        {event && (
          <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Admission Passes & Categories
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Transparent pricing with verified server-side availability guarantees.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {event.ticketTypes.map((category) => (
                <div
                  key={category.id}
                  className="p-6 rounded-[18px] bg-white border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-bold text-slate-900">{category.name}</h3>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#08537B]/10 text-[#08537B]">
                        {category.remainingCapacity} Left
                      </span>
                    </div>

                    <div className="mt-3 mb-4">
                      <span className="text-3xl font-black text-[#08537B]">
                        {formatPaise(category.unitPricePaise)}
                      </span>
                      <span className="text-xs text-slate-400 ml-1">/ person</span>
                    </div>

                    <p className="text-xs text-slate-500 leading-relaxed">
                      {category.description}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100">
                    <Link
                      href={`/events/${event.slug}/tickets`}
                      className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-[10px] bg-slate-100 hover:bg-[#08537B] hover:text-white text-slate-800 text-xs font-bold transition-all"
                    >
                      <span>Select Pass</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Why Attend Section */}
        <section className="py-16 bg-white border-y border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-[12px] bg-[#08537B]/10 text-[#08537B] flex items-center justify-center shrink-0">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">World-Class Speakers</h3>
                  <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                    Gain deep tactical insights from founders who scaled unicorn startups and prominent venture capital partners.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-[12px] bg-[#EE8518]/10 text-[#EE8518] flex items-center justify-center shrink-0">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Curated Networking</h3>
                  <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                    Connect with over 2,000 driven entrepreneurs, potential co-founders, corporate partners, and early-stage angel investors.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-[12px] bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Venture Showcase</h3>
                  <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                    Live demo lounges featuring groundbreaking products across AI, deep tech, fintech, consumer, and enterprise SaaS.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
