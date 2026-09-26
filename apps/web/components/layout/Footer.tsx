import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-auto bg-[#F7F7F7] text-gray-600 border-t border-gray-200 w-full overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Col */}
          <div className="md:col-span-2">
            <div className="mb-4">
              <div className="relative h-12 w-44 sm:h-16 sm:w-56 overflow-hidden flex items-center">
                <Image
                  src="/brand/logo.png"
                  alt="CEDOI"
                  fill
                  className="object-contain object-left scale-[2.2] sm:scale-[2.5] origin-left"
                />
              </div>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 max-w-md leading-relaxed">
              CEDOI empowers visionary innovators, startup founders, and enterprise executives through premier flagship conferences, tactical masterclasses, and executive networks.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 mb-3">
              Event Ticketing
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm text-gray-600">
              <li>
                <Link href="/" className="hover:text-gray-900 transition-colors">
                  Event Details
                </Link>
              </li>
              <li>
                <Link href="/events/cedoi-awards-2026/tickets" className="hover:text-gray-900 transition-colors">
                  Book Admission Tickets
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-gray-900 transition-colors">
                  Terms of Admission (18+)
                </Link>
              </li>
              <li>
                <Link href="/help" className="hover:text-gray-900 transition-colors">
                  Help & Organizer Contact
                </Link>
              </li>
              <li>
                <Link href="/scanner/login" className="hover:text-gray-900 transition-colors">
                  Scanner Staff Login
                </Link>
              </li>
            </ul>
          </div>

          {/* Security & Verification */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 mb-3">
              Trust & Security
            </h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              All transactions are processed through a secured payment infrastructure. Admission passes feature 256-bit cryptographically unique QR credentials verified at the gate.
            </p>
            <div className="mt-4 pt-4 border-t border-gray-200 text-[11px] sm:text-xs text-gray-400">
              Currency: INR (₹) • Asia/Kolkata Timezone
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 gap-4 text-center sm:text-left">
          <p>© {new Date().getFullYear()} CEDOI. All rights reserved.</p>
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-4 sm:gap-6">
            <Link href="/terms" className="hover:text-gray-900 transition-colors">Terms of Admission</Link>
            <Link href="/help" className="hover:text-gray-900 transition-colors">Privacy Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
