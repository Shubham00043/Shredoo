import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { loungeClerkTheme } from '@/lib/clerk-theme';
import './globals.css';

export const metadata: Metadata = {
  title: 'SHREDoo – Private Collaborative Listening Lounge',
  description:
    'A modern private music-listening lounge with real-time LiveKit voice chat, independent music and voice mixers, and curated catalogues.',
};

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
          appearance={{
            baseTheme: loungeClerkTheme as any,
          }}
        >
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
