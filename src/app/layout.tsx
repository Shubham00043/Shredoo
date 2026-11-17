import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { loungeClerkTheme } from '@/lib/clerk-theme';
import './globals.css';

export const metadata: Metadata = {
  title: 'SHREDoo – Private Collaborative Listening Lounge',
  description:
    'A modern private music-listening lounge with real-time LiveKit voice chat, independent music and voice mixers, and curated catalogues.',
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
        </ClerkProvider>
      </body>
    </html>
  );
}
