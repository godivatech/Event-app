import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#F7F7F7] flex flex-col items-center justify-center p-6 text-center font-sans antialiased">
      <div className="w-full max-w-md space-y-6">
        <div className="relative h-16 w-56 mx-auto overflow-hidden flex items-center justify-center">
          <Image
            src="/brand/logo.png"
            alt="CEDOI"
            fill
            priority
            className="object-contain scale-[2.5]"
          />
        </div>

        <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-sm space-y-4">
          <div className="text-5xl font-extrabold text-[#08537B]">404</div>
          <h1 className="text-xl font-bold text-gray-900">Page Not Found</h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            The page you are looking for does not exist or has been moved.
          </p>

          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 w-full py-3 px-6 rounded-xl bg-[#EE8518] hover:bg-[#d6720f] active:bg-[#ab4e10] text-white font-bold text-sm shadow-sm transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Event Home</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
