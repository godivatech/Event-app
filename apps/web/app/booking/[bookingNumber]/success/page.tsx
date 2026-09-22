'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Navbar } from '../../../../components/layout/Navbar';
import { Footer } from '../../../../components/layout/Footer';
import { StepIndicator } from '../../../../components/booking/StepIndicator';
import { apiClient } from '../../../../lib/api-client';
import { BookingDetailDto } from '@cedoi/contracts';
import { formatEventDate, formatEventTime } from '../../../../lib/formatters';
import { FoodPreferenceBadge, MemberTypeBadge } from '@cedoi/ui';
import { QRCodeSVG } from 'qrcode.react';
import {
  CheckCircle,
  Download,
  Calendar,
  MapPin,
  Clock,
  Printer,
  ShieldCheck,
  Loader2,
  AlertCircle,
  Ticket as TicketIcon,
} from 'lucide-react';
import { BookingSuccessSkeleton } from '../../../../components/skeletons';

export default function BookingSuccessPage() {
  const params = useParams();
  const bookingNumber = params.bookingNumber as string;

  const [booking, setBooking] = useState<BookingDetailDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    async function loadConfirmedBooking() {
      try {
        const data = await apiClient<BookingDetailDto>(`api/v1/bookings/${bookingNumber}`);
        setBooking(data);
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to load confirmed booking details.');
      } finally {
        setIsLoading(false);
      }
    }

    loadConfirmedBooking();
  }, [bookingNumber]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!booking) return;
    setIsDownloading(true);
    setDownloadError(null);
    try {
      const response = await fetch(`/api/v1/tickets/${booking.bookingNumber}/pdf`, {
        method: 'GET',
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error(`Download failed (${response.status}). Please try again.`);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CEDOI_${booking.bookingNumber}_Tickets.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setDownloadError(err.message || 'Could not download PDF. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50">
        <Navbar />
        <BookingSuccessSkeleton />
        <Footer />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50">
        <Navbar />
        <div className="flex-1 max-w-md mx-auto p-8 text-center">
          <h2 className="text-lg font-bold text-slate-900">Booking Confirmation</h2>
          <p className="mt-2 text-xs text-slate-500">{errorMessage || 'Unable to access booking.'}</p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 w-full overflow-x-hidden">
      <div className="no-print">
        <Navbar />
      </div>

      <main className="flex-1 max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8 w-full overflow-x-hidden">
        <div className="no-print">
          <StepIndicator currentStep={3} />

          {/* Success Header Banner */}
          <div className="p-6 sm:p-8 rounded-[18px] bg-emerald-50 border border-emerald-200 text-center mb-8 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto mb-3 shadow-sm">
              <CheckCircle className="w-7 h-7" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              Payment Successful
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
              Your Booking is Confirmed!
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
              We have reserved your admissions. Present these QR codes at the gate or download your PDF ticket booklet below.
            </p>

            <div className="mt-5 inline-flex items-center gap-3 px-4 py-2 rounded-[10px] bg-white border border-emerald-200 text-xs font-mono font-bold text-slate-800">
              <span>Booking Number:</span>
              <span className="text-[#08537B] text-sm">{booking.bookingNumber}</span>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isDownloading}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-[12px] bg-[#08537B] hover:bg-[#064364] active:bg-[#053752] disabled:opacity-60 text-white font-bold text-xs sm:text-sm shadow-md transition-all"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Preparing PDF...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Download Ticket PDF</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-[12px] bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs sm:text-sm border border-slate-300 transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>Print Passes</span>
              </button>
            </div>

            {downloadError && (
              <div className="mt-3 flex items-center gap-2 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-[10px] px-4 py-2.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{downloadError}</span>
              </div>
            )}
          </div>
        </div>

        {/* Digital Admission Tickets List */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <TicketIcon className="w-5 h-5 text-[#08537B]" />
              <span>Digital Admission Passes ({booking.tickets?.length || 0})</span>
            </h2>
            <span className="text-xs text-slate-500">One scannable QR per attendee</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {booking.tickets?.map((ticket) => (
              <div
                key={ticket.id}
                className="bg-white rounded-[18px] border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between print-page-break"
              >
                {/* Brand Header */}
                <div className="bg-[#08537B] p-4 text-white flex items-center justify-between">
                  <div>
                    <div className="text-lg font-black tracking-tight">CEDOI</div>
                    <div className="text-[9px] font-bold text-[#EE8518] uppercase tracking-wider">
                      BUILDING OUTSTANDING ENTREPRENEURS
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white/20 text-white uppercase">
                      {ticket.status}
                    </span>
                    <div className="text-[10px] text-[#D5EBF7] mt-0.5">
                      Pass #{ticket.admissionIndex} of {booking.tickets?.length}
                    </div>
                  </div>
                </div>

                {/* Ticket Details & QR */}
                <div className="p-6 flex-1 flex flex-col items-center text-center">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#EE8518]">
                    {ticket.ticketTypeName}
                  </span>
                  <h3 className="text-base font-bold text-slate-900 mt-1 max-w-xs">
                    {booking.eventName}
                  </h3>

                  <div className="my-5 p-3 bg-white rounded-[14px] border-2 border-slate-200 shadow-sm">
                    {ticket.qrData ? (
                      <QRCodeSVG
                        value={ticket.qrData}
                        size={160}
                        level="H"
                        includeMargin={false}
                        fgColor="#031E2D"
                      />
                    ) : (
                      <div className="w-40 h-40 flex items-center justify-center text-xs text-slate-400">
                        QR Unavailable
                      </div>
                    )}
                  </div>

                  <div className="w-full pt-4 border-t border-slate-100 grid grid-cols-2 gap-2 text-left text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                        Ticket Number
                      </span>
                      <span className="font-mono font-bold text-slate-800">
                        {ticket.ticketNumber}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                        Attendee Name
                      </span>
                      <span className="font-semibold text-slate-800 truncate block">
                        {ticket.attendeeName || booking.customerName}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                        Company / Business
                      </span>
                      <span className="font-semibold text-slate-800 truncate block">
                        {ticket.businessName || booking.businessName || 'Independent'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                        City / Location
                      </span>
                      <span className="font-semibold text-slate-800 truncate block">
                        {ticket.location || booking.location || 'Madurai'}
                      </span>
                    </div>

                    <div className="pt-1">
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold mb-0.5">
                        Membership
                      </span>
                      <MemberTypeBadge
                        memberType={ticket.memberType || booking.memberType}
                        size="sm"
                      />
                    </div>

                    <div className="pt-1">
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold mb-0.5">
                        Lunch Preference
                      </span>
                      <FoodPreferenceBadge
                        preference={ticket.foodPreference || booking.foodPreference}
                        size="sm"
                      />
                    </div>

                    <div className="col-span-2 pt-2 text-[11px] text-slate-500 border-t border-slate-50 mt-1">
                      <div className="flex items-center gap-1 font-medium text-slate-700">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{booking.eventVenue}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] mt-0.5">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{formatEventDate(booking.eventStartsAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Entry Terms Strip */}
                <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-100 text-[10px] text-slate-500 flex items-center justify-between">
                  <span>Single-entry only. Non-transferable.</span>
                  <span className="font-mono">{booking.bookingNumber}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <div className="no-print">
        <Footer />
      </div>
    </div>
  );
}
