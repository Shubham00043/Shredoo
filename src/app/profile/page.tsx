'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useUser, SignOutButton } from '@clerk/nextjs';
import { Navbar } from '@/components/Navbar';
import {
  User,
  Mail,
  ShieldCheck,
  Calendar,
  LogOut,
  Radio,
  Users,
  CheckCircle2,
  RefreshCw,
  ArrowLeft,
} from 'lucide-react';
import { Room } from '@/types';

export default function ProfilePage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const [synced, setSynced] = useState(false);
  const [userRooms, setUserRooms] = useState<Room[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);

  // Sync profile to Firestore
  useEffect(() => {
    if (isSignedIn && user) {
      const syncProfile = async () => {
        try {
          const res = await fetch('/api/user/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user.id,
              username: user.fullName || user.username || 'Shredoo Listener',
              avatarUrl: user.imageUrl,
              email: user.primaryEmailAddress?.emailAddress || '',
            }),
          });
          if (res.ok) setSynced(true);
        } catch (e) {
          console.error(e);
        }
      };

      syncProfile();

      // Fetch user's rooms
      const fetchRooms = async () => {
        try {
          const res = await fetch('/api/rooms', {
            headers: { 'x-shredoo-user-id': user.id },
          });
          const data = await res.json();
          if (data.rooms) {
            setUserRooms(data.rooms.filter((r: Room) => r.hostId === user.id));
          }
        } catch (e) {
          console.error(e);
        } finally {
          setLoadingRooms(false);
        }
      };
      fetchRooms();
    } else {
      setLoadingRooms(false);
    }
  }, [isSignedIn, user]);

  const displayName = user?.fullName || user?.username || 'Shredoo Listener';
  const displayEmail = user?.primaryEmailAddress?.emailAddress || 'Not configured';
  const displayAvatar = user?.imageUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=Listener';

  return (
    <div className="min-h-screen bg-lounge-bg text-lounge-textPrimary flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-10 w-full space-y-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-lounge-textMuted hover:text-white transition"
        >
          <ArrowLeft size={14} /> Back to Dashboard
        </Link>

        {/* Profile Card */}
        <div className="bg-lounge-surface border border-lounge-border rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-8 border-b border-lounge-border">
            <div className="relative">
              <img
                src={displayAvatar}
                alt={displayName}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover bg-lounge-bg border-2 border-lounge-border shadow-xl"
              />
              <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-lounge-surface" />
            </div>

            <div className="flex-1 text-center sm:text-left space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-bold text-white tracking-tight">{displayName}</h1>
                  <p className="text-xs text-lounge-textMuted font-mono flex items-center justify-center sm:justify-start gap-1.5 mt-0.5">
                    <Mail size={13} /> {displayEmail}
                  </p>
                </div>

                <div className="flex items-center justify-center gap-2">
                  <SignOutButton redirectUrl="/sign-in">
                    <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-lounge-card hover:bg-lounge-cardHover border border-lounge-border text-xs text-gray-300 hover:text-white font-semibold transition">
                      <LogOut size={14} /> Sign Out
                    </button>
                  </SignOutButton>
                </div>
              </div>

              {/* Status tags */}
              <div className="flex items-center justify-center sm:justify-start gap-2 pt-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                  <ShieldCheck size={13} /> Clerk Google Authenticated
                </span>
                {synced && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 size={13} /> Firestore Profile Synced
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Account Details Roster */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6">
            <div className="p-4 rounded-2xl bg-lounge-bg border border-lounge-border space-y-1">
              <span className="text-[11px] font-medium text-lounge-textMuted flex items-center gap-1.5">
                <Radio size={14} className="text-amber-500" /> My Hosted Rooms
              </span>
              <p className="text-xl font-bold text-white font-mono">{userRooms.length}</p>
            </div>

            <div className="p-4 rounded-2xl bg-lounge-bg border border-lounge-border space-y-1">
              <span className="text-[11px] font-medium text-lounge-textMuted flex items-center gap-1.5">
                <Users size={14} className="text-cyan-400" /> Max Capacity
              </span>
              <p className="text-xl font-bold text-white font-mono">5 per room</p>
            </div>

            <div className="p-4 rounded-2xl bg-lounge-bg border border-lounge-border space-y-1">
              <span className="text-[11px] font-medium text-lounge-textMuted flex items-center gap-1.5">
                <Calendar size={14} className="text-emerald-400" /> Account Status
              </span>
              <p className="text-xl font-bold text-white font-mono">Active Lounge</p>
            </div>
          </div>
        </div>

        {/* User's Hosted Rooms */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Radio size={18} className="text-amber-500" /> Rooms Managed by You
            </h2>
            <Link
              href="/create"
              className="text-xs font-semibold text-amber-500 hover:text-amber-400 transition"
            >
              + Create New Room
            </Link>
          </div>

          {loadingRooms ? (
            <div className="p-8 text-center text-xs text-lounge-textMuted">Loading your rooms...</div>
          ) : userRooms.length === 0 ? (
            <div className="p-8 rounded-2xl bg-lounge-surface border border-dashed border-lounge-border text-center space-y-2">
              <p className="text-xs text-lounge-textSecondary">You have not created any listening rooms yet.</p>
              <Link
                href="/create"
                className="inline-block px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition"
              >
                Create your first private room
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {userRooms.map((room) => (
                <div
                  key={room.id}
                  className="p-4 rounded-2xl bg-lounge-surface border border-lounge-border hover:border-lounge-borderSubtle transition flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-white">{room.name}</h3>
                      <p className="text-xs text-lounge-textMuted line-clamp-1">{room.description}</p>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-lounge-bg text-amber-400 border border-lounge-border">
                      {room.inviteCode}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-lounge-border flex items-center justify-between text-xs">
                    <span className="text-[11px] text-lounge-textMuted font-mono">Max {room.maxCapacity}</span>
                    <Link
                      href={`/room/${room.id}`}
                      className="px-3 py-1.5 rounded-lg bg-lounge-card hover:bg-lounge-cardHover text-white text-xs font-semibold transition"
                    >
                      Enter & Manage
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

