import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import {
  Calendar,
  MapPin,
  Clock,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Award,
  Users,
  CheckCircle2,
  Star,
  Lightbulb,
  Utensils,
  Ticket,
  Gift,
} from 'lucide-react';
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
  const eventSlug = event?.slug || 'cedoi-awards-2026';

  const highlights = [
    {
      icon: Users,
      title: '1500 Business Leaders',
      description: 'Connect with founders & top entrepreneurs across Tamil Nadu.',
      badge: 'Networking',
      color: 'bg-blue-50 text-[#08537B] border-blue-100',
    },
    {
      icon: Lightbulb,
      title: 'Knowledge Updates',
      description: 'High-impact business growth insights & market trends.',
      badge: 'Insights',
      color: 'bg-amber-50 text-[#EE8518] border-amber-100',
    },
    {
      icon: Star,
      title: 'Live Entertainment',
      description: 'Electrifying celebrity shows & star performances.',
      badge: 'Celebrities',
      color: 'bg-purple-50 text-purple-700 border-purple-100',
    },
    {
      icon: Award,
      title: 'Visionary Keynotes',
      description: 'Inspiring addresses from leading industry icons.',
      badge: 'Keynotes',
      color: 'bg-rose-50 text-rose-700 border-rose-100',
    },
    {
      icon: Utensils,
      title: 'Gourmet Dining',
      description: 'Multi-course banquet lunch, refreshments & high tea.',
      badge: 'Banquet',
      color: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    },
    {
      icon: Ticket,
      title: '₹10,000 Vouchers',
      description: 'Exclusive partner coupons & business voucher booklet.',
      badge: '₹10,000 Value',
      color: 'bg-amber-50 text-[#EE8518] border-amber-100',
    },
    {
      icon: Gift,
      title: 'Return Gift & Draw',
      description: 'Official celebration gift hamper & mega lucky draw entry.',
      badge: 'Mega Draw',
      color: 'bg-sky-50 text-[#08537B] border-sky-100',
    },
    {
      icon: ShieldCheck,
      title: 'Awards Ceremony',
      description: 'Recognizing outstanding business leaders and achievements.',
      badge: 'Honors',
      color: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 w-full overflow-x-hidden">
      <Navbar />

      <main className="flex-1 w-full overflow-x-hidden">
        {/* Hero Section with Integrated Event Pass Highlights & Book Ticket CTA */}
        <section className="relative overflow-hidden brand-hero-bg pt-8 pb-12 sm:pt-14 sm:pb-20 border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full bg-[#EE8518]/10 border border-[#EE8518]/30 text-[#EE8518] text-[11px] sm:text-xs font-bold uppercase tracking-wider mb-4 sm:mb-6">
                <Sparkles className="w-3.5 h-3.5 text-[#EE8518] shrink-0" />
                <span>Recognise • Celebrate • Inspire</span>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-tight break-words">
                CEDOI AWARDS 2026
              </h1>

              <p className="mt-2.5 sm:mt-3 text-xs sm:text-base font-bold text-[#EE8518] tracking-wider sm:tracking-widest uppercase">
                Be a part of the Biggest Entrepreneurship Celebration in Tamilnadu!
              </p>

              <p className="mt-3 sm:mt-5 text-sm sm:text-base text-slate-600 leading-relaxed max-w-3xl">
                Be there. Be a part of something bigger! Join 1,500 visionary business owners for a grand celebration packed with celebrity entertainment, master knowledge updates, motivational addresses, gourmet lunch, and return gifts.
              </p>

              {/* Event Metadata Highlights: Date, Timing, Location */}
              <div className="mt-6 sm:mt-7 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 pt-5 sm:pt-6 border-t border-slate-200">
                <div className="flex items-center sm:items-start gap-3 p-3 sm:p-0 rounded-xl bg-white/80 sm:bg-transparent border sm:border-0 border-slate-200/80 shadow-xs sm:shadow-none">
                  <div className="w-9 h-9 rounded-lg bg-[#08537B]/10 flex items-center justify-center text-[#08537B] shrink-0">
                    <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase">Date</div>
                    <div className="text-xs sm:text-sm font-bold text-slate-900">Saturday, Oct 10, 2026</div>
                  </div>
                </div>

                <div className="flex items-center sm:items-start gap-3 p-3 sm:p-0 rounded-xl bg-white/80 sm:bg-transparent border sm:border-0 border-slate-200/80 shadow-xs sm:shadow-none">
                  <div className="w-9 h-9 rounded-lg bg-[#08537B]/10 flex items-center justify-center text-[#08537B] shrink-0">
                    <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase">Timing</div>
                    <div className="text-xs sm:text-sm font-bold text-slate-900">09:00 AM – 06:00 PM IST</div>
                  </div>
                </div>

                <div className="flex items-center sm:items-start gap-3 p-3 sm:p-0 rounded-xl bg-white/80 sm:bg-transparent border sm:border-0 border-slate-200/80 shadow-xs sm:shadow-none">
                  <div className="w-9 h-9 rounded-lg bg-[#08537B]/10 flex items-center justify-center text-[#08537B] shrink-0">
                    <MapPin className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase">Location</div>
                    <div className="text-xs sm:text-sm font-bold text-slate-900">{event?.venue || 'Velammal Ida Scudder Auditorium, Madurai'}</div>
                  </div>
                </div>
              </div>

              {/* Highlighted Event Pass Inclusions Box (Directly in Hero) */}
              <div className="mt-7 sm:mt-8 p-5 sm:p-6 rounded-2xl bg-white/95 border-2 border-[#08537B]/20 shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#EE8518]">
                      All-Inclusive Pass
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                      Event Pass
                    </h2>
                  </div>
                  <div className="inline-flex items-baseline gap-2 px-3.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-2xl sm:text-3xl font-black text-[#08537B]">
                      ₹1,499
                    </span>
                    <span className="text-xs text-slate-500 font-medium">/ person (All-inclusive)</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 my-4 text-xs text-slate-700">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Access to 1500 Business Owners networking hub</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Unlimited celebrity entertainment & performances</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Visionary keynote speeches & industry knowledge updates</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Elaborate gourmet lunch & beverage service</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>₹10,000 Worth</strong> Discount Coupons voucher booklet</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Official celebration Return Gift & Lucky Draw entry</span>
                  </div>
                </div>

                {/* Primary Call to Action Button */}
                <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <Link
                    href={`/events/${eventSlug}/tickets`}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-[#EE8518] hover:bg-[#d26b0f] active:bg-[#ab4e10] text-white font-bold text-sm sm:text-base rounded-xl shadow-md transition-all group text-center"
                  >
                    <span>Book Tickets</span>
                    <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform shrink-0" />
                  </Link>

                  <Link
                    href={`/events/${eventSlug}`}
                    className="sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs sm:text-sm rounded-xl border border-slate-300 transition-colors text-center"
                  >
                    <span>Event Details</span>
                  </Link>
                </div>
              </div>

              {/* Trust Badges */}
              <div className="mt-5 sm:mt-6 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-xs text-slate-500">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Verified Checkout</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#08537B] shrink-0" />
                  <span>Instant Scannable Digital QR Pass</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Program Highlights Section - 2 columns on mobile view to avoid long scroll */}
        <section className="py-10 sm:py-16 bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
              <span className="text-xs font-bold uppercase tracking-widest text-[#EE8518]">
                Recognise • Celebrate • Inspire
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
                Program Highlights
              </h2>
              <p className="mt-1.5 text-xs sm:text-sm text-slate-500">
                What makes CEDOI Awards 2026 the biggest celebration in Tamil Nadu.
              </p>
            </div>

            {/* 2-column mobile grid: grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 */}
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
              {highlights.map((item, idx) => {
                const IconComponent = item.icon;
                return (
                  <div
                    key={idx}
                    className="p-3.5 sm:p-5 rounded-2xl bg-slate-50/80 border border-slate-200/80 flex flex-col justify-between hover:shadow-md transition-all hover:bg-white"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2.5">
                        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center border ${item.color} shrink-0`}>
                          <IconComponent className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-200/60 text-slate-700">
                          {item.badge}
                        </span>
                      </div>
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 mb-1 leading-tight">
                        {item.title}
                      </h3>
                      <p className="text-[11px] sm:text-xs text-slate-500 leading-snug">
                        {item.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
