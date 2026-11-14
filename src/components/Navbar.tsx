'use client';

import React from 'react';
import Link from 'next/link';
import { useUser, UserButton } from '@clerk/nextjs';
import { loungeClerkTheme } from '@/lib/clerk-theme';
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
                  baseTheme: loungeClerkTheme as any,
                }}
              >
                <UserButton.MenuItems>
                  <UserButton.Link
                    label="My Profile & Rooms"
                    labelIcon={<User size={14} className="text-amber-500" stroke="#d97706" />}
                    href="/profile"
                  />
                  <UserButton.Link
                    label="Admin Lounge"
                    labelIcon={<ShieldAlert size={14} className="text-amber-500" stroke="#d97706" />}
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
