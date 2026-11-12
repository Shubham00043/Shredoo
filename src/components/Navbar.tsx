'use client';

import React from 'react';
import Link from 'next/link';
import { useUser, UserButton } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
import {
  Radio,
  Plus,
  Headphones,
  User,
  Sliders,
  LogIn,
  Mic,
  ShieldAlert,
} from 'lucide-react';

export function Navbar() {
  const { isLoaded, isSignedIn, user } = useUser();

  const userAvatar = user?.imageUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=Listener';
  const userName = user?.firstName || user?.username || 'Listener';

  return (
    <nav className="border-b border-lounge-border bg-lounge-surface/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-lounge-card border border-lounge-border flex items-center justify-center text-amber-500 shadow-sm group-hover:border-amber-500/40 transition">
            <Radio size={18} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-bold tracking-tight text-white group-hover:text-amber-400 transition">
                SHRED<span className="text-amber-500">oo</span>
              </span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20">
                LOUNGE
              </span>
            </div>
          </div>
        </Link>

        {/* Center / Navigation Links */}
        <div className="hidden md:flex items-center gap-1 text-xs font-medium text-lounge-textSecondary">
          <Link
            href="/"
            className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-lounge-card transition"
          >
            Dashboard
          </Link>

          <Link
            href="/test/audio"
            className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-lounge-card transition flex items-center gap-1.5"
          >
            <Headphones size={13} className="text-amber-500" /> Try Audio
          </Link>

          <Link
            href="/test/voice"
            className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-lounge-card transition flex items-center gap-1.5"
          >
            <Mic size={13} className="text-emerald-400" /> Test Voice
          </Link>
        </div>

        {/* Right Actions: Create Room + User Profile */}
        <div className="flex items-center gap-3">
          <Link
            href="/create"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition shadow-md shadow-amber-950/40"
          >
            <Plus size={14} /> Create Room
          </Link>

          {isLoaded && isSignedIn ? (
            <div className="flex items-center">
              <UserButton
                showName
                appearance={{
                  baseTheme: dark,
                  variables: {
                    colorPrimary: '#d97706',
                    colorBackground: '#15171e',
                    colorNeutral: '#f3f4f6',
                    colorForeground: '#f3f4f6',
                    colorText: '#f3f4f6',
                    colorTextSecondary: '#949aa5',
                    colorInputBackground: '#0c0e12',
                    colorInputText: '#f3f4f6',
                  },
                  elements: {
                    userButtonAvatarBox: 'w-8 h-8 rounded-xl border border-lounge-border',
                    userButtonOuterIdentifier:
                      'text-xs font-semibold pl-1 text-lounge-textPrimary',
                    userButtonBox:
                      'flex-row-reverse gap-2 p-1 pl-3 rounded-xl bg-lounge-card hover:bg-lounge-cardHover border border-lounge-border transition',
                    userButtonPopoverCard:
                      '!bg-[#15171e] !border !border-[#282c37] !shadow-2xl !rounded-2xl overflow-hidden !text-[#f3f4f6]',
                    userPreviewMainIdentifier: '!text-white !font-bold',
                    userPreviewSecondaryIdentifier: '!text-[#949aa5]',
                    userButtonPopoverMain: '!bg-[#15171e]',
                    userButtonPopoverActions: '!bg-[#15171e]',
                    userButtonPopoverActionButton:
                      '!text-[#f3f4f6] hover:!text-white hover:!bg-[#222530] !rounded-xl transition flex items-center',
                    userButtonPopoverActionButtonIcon: '!text-amber-500 !opacity-100',
                    userButtonPopoverCustomItemButton:
                      '!text-[#f3f4f6] hover:!text-white hover:!bg-[#222530] !rounded-xl transition flex items-center',
                    userButtonPopoverCustomItemButtonIcon: '!text-amber-500 !opacity-100',
                    userButtonPopoverFooter: '!bg-[#1b1e26] !border-t !border-[#282c37]',
                  },
                }}
              >
                <UserButton.MenuItems>
                  <UserButton.Link
                    label="My Profile & Rooms"
                    labelIcon={<User size={14} className="text-amber-500" />}
                    href="/profile"
                  />
                  <UserButton.Link
                    label="Admin Lounge"
                    labelIcon={<ShieldAlert size={14} className="text-amber-500" />}
                    href="/admin"
                  />
                </UserButton.MenuItems>
              </UserButton>
            </div>
          ) : (
            <Link
              href="/sign-in"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-lounge-card hover:bg-lounge-cardHover border border-lounge-border text-xs text-white font-semibold transition"
            >
              <LogIn size={14} /> Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
