import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CEDOI — Digital Event Ticketing | Building Outstanding Entrepreneurs',
  description:
    'The official ticketing platform for CEDOI conferences, summits, and executive workshops. Secure digital reservations, encrypted QR admissions, and instant PDF delivery.',
  icons: {
    icon: '/brand/logo.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full scroll-smooth overflow-x-hidden">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="flex flex-col min-h-screen overflow-x-hidden w-full max-w-full">
        {children}
      </body>
    </html>
  );
}
