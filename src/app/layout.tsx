import type { Metadata, Viewport } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { loungeClerkTheme } from '@/lib/clerk-theme';
import { PWAInstallBanner } from '@/components/PWAInstallBanner';
import './globals.css';

export const viewport: Viewport = {
  themeColor: '#0c0e12',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'SHREDoo – Private Collaborative Listening Lounge',
  description:
    'A modern private music-listening lounge with real-time LiveKit voice chat, independent music and voice mixers, and shared playlist uploads.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '48x48' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SHREDoo',
  },
};

const CLERK_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
  'pk_test_ZW5hYmxlZC10ZXJtaXRlLTEyMjUuY2xlcmsuYWNjb3VudHMuZGV2JA';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className="bg-lounge-bg text-lounge-textPrimary min-h-screen antialiased selection:bg-amber-600/30 selection:text-white"
        suppressHydrationWarning
      >
        <ClerkProvider
          publishableKey={CLERK_PUBLISHABLE_KEY}
          appearance={loungeClerkTheme as any}
        >
          {children}
          <PWAInstallBanner />
        </ClerkProvider>
      </body>
    </html>
  );
}
