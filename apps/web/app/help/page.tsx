import React from 'react';
import Link from 'next/link';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import { HelpCircle, Mail, Phone, ShieldCheck, Key, Ticket, AlertTriangle } from 'lucide-react';

export default function HelpPage() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        <div className="text-center max-w-xl mx-auto mb-10">
          <div className="w-12 h-12 rounded-full bg-[#08537B]/10 text-[#08537B] flex items-center justify-center mx-auto mb-3">
            <HelpCircle className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            CEDOI Help & Support
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-500">
            Frequently asked questions, ticket recovery guidelines, and organizer contact details.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* FAQ Accordion Section */}
          <div className="md:col-span-2 space-y-4">
            <div className="bg-white rounded-[16px] p-5 border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-2">
                <Ticket className="w-4 h-4 text-[#08537B]" />
                <span>How do I enter the summit using my ticket?</span>
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Present your on-screen QR code on your mobile browser or printed A4 PDF at the designated gate (Gate A for General Admission, Gate VIP for VIP and VVIP badge holders). Staff will scan your pass using an authorized camera terminal. Each QR is valid for a single entry.
              </p>
            </div>

            <div className="bg-white rounded-[16px] p-5 border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-2">
                <Key className="w-4 h-4 text-[#EE8518]" />
                <span>What is the Recovery Code and how does it work?</span>
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                CEDOI does not force customers to create passwords or accounts. When you make a reservation, a 12-character recovery code (e.g., CEDOI-XXXX-XXXX-XXXX) is generated. This code, combined with your Booking Number, allows you to re-access and download your tickets from any device.
              </p>
            </div>

            <div className="bg-white rounded-[16px] p-5 border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>What if I lost both my browser session and recovery code?</span>
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                For security reasons, phone numbers and emails alone cannot unlock tickets. If you have lost both your device session and your recovery code, contact organizer support with your Razorpay payment transaction ID or bank statement evidence. Authorized staff can verify your payment and assist you in recovering your booking.
              </p>
            </div>

            <div className="bg-white rounded-[16px] p-5 border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>What is the cancellation and refund policy?</span>
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Admissions can be cancelled and refunded by authorized organizers prior to the summit commencement, provided none of the admissions in the booking have been checked in at the gate. Used tickets are strictly non-refundable.
              </p>
            </div>
          </div>

          {/* Organizer Contact Card */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-[18px] p-6 border border-slate-200 shadow-sm sticky top-28 space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-1">
                  Organizer Desk
                </h3>
                <p className="text-xs text-slate-500">
                  CEDOI Operations & Ticketing Support
                </p>
              </div>

              <div className="space-y-4 text-xs">
                <div className="flex items-start gap-3">
                  <Mail className="w-4 h-4 text-[#08537B] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-700 block">Email Support</span>
                    <a href="mailto:support@cedoi.org" className="text-[#08537B] hover:underline">
                      support@cedoi.org
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="w-4 h-4 text-[#08537B] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-700 block">Helpline</span>
                    <span className="text-slate-700 font-mono">+91 (80) 4123-4567</span>
                    <div className="text-[10px] text-slate-400">Mon-Fri, 9:00 AM - 6:00 PM IST</div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <Link
                  href="/recover"
                  className="w-full inline-flex items-center justify-center py-2.5 px-4 rounded-[10px] bg-[#08537B] text-white text-xs font-bold hover:bg-[#064364] transition-colors"
                >
                  Recover Booking Now
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
