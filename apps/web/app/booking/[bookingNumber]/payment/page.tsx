'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function PaymentPageRedirect() {
  const params = useParams();
  const router = useRouter();
  const bookingNumber = params.bookingNumber as string;

  useEffect(() => {
    router.replace(`/booking/${bookingNumber}`);
  }, [bookingNumber, router]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
      <Loader2 className="w-8 h-8 text-[#08537B] animate-spin" />
    </div>
  );
}
