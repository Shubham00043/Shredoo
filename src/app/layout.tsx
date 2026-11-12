import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
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
            baseTheme: dark,
            variables: {
              colorPrimary: '#d97706',
              colorBackground: '#15171e',
              colorNeutral: '#f3f4f6',
              colorForeground: '#f3f4f6',
              colorInputBackground: '#0c0e12',
              colorInputText: '#f3f4f6',
              colorText: '#f3f4f6',
              colorTextSecondary: '#949aa5',
              borderRadius: '0.75rem',
            },
            elements: {
              card: 'bg-lounge-surface border border-lounge-border shadow-2xl rounded-2xl',
              headerTitle: 'text-white font-bold',
              headerSubtitle: 'text-lounge-textMuted',
              socialButtonsBlockButton:
                'bg-lounge-card hover:bg-lounge-cardHover border border-lounge-border text-white',
              formButtonPrimary:
                'bg-amber-600 hover:bg-amber-700 text-white font-semibold',
              footerActionLink: 'text-amber-500 hover:text-amber-400',
              userButtonPopoverCard:
                '!bg-[#15171e] !border !border-[#282c37] !shadow-2xl !rounded-2xl overflow-hidden !text-[#f3f4f6]',
              userPreviewMainIdentifier: '!text-white !font-bold',
              userPreviewSecondaryIdentifier: '!text-[#949aa5]',
              userButtonPopoverMain: '!bg-[#15171e]',
              userButtonPopoverActions: '!bg-[#15171e]',
              userButtonPopoverActionButton:
                '!text-[#f3f4f6] hover:!text-white hover:!bg-[#222530] !rounded-xl transition',
              userButtonPopoverActionButtonIcon: '!text-amber-500 !opacity-100',
              userButtonPopoverCustomItemButton:
                '!text-[#f3f4f6] hover:!text-white hover:!bg-[#222530] !rounded-xl transition',
              userButtonPopoverCustomItemButtonIcon: '!text-amber-500 !opacity-100',
              userButtonPopoverFooter: '!bg-[#1b1e26] !border-t !border-[#282c37]',
            },
          }}
        >
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
