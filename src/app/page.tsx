'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { Navbar } from '@/components/Navbar';
import { AcceptanceTestPanel } from '@/components/AcceptanceTestPanel';
import { Room } from '@/types';
import {
  Plus,
  Key,
  Radio,
  Users,
  ArrowRight,
  Disc3,
  ShieldCheck,
  Headphones,
  Sliders,
  Settings,
  Lock,
  Loader2,
} from 'lucide-react';

export default function DashboardPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const [ownedRooms, setOwnedRooms] = useState<Room[]>([]);
  const [joinedRooms, setJoinedRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [codeQuery, setCodeQuery] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [isLookingUpCode, setIsLookingUpCode] = useState(false);

  const currentUserId = user?.id || '';
  const currentUserName = user?.fullName || user?.username || 'Shredoo Listener';
  const currentUserAvatar = user?.imageUrl || (user?.id ? `https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}` : 'https://api.dicebear.com/7.x/bottts/svg?seed=Guest');

  const fetchRooms = async () => {
    try {
      const res = await fetch('/api/rooms', {
        headers: {
          'x-shredoo-user-id': currentUserId,
        },
      });
      const data = await res.json();
      if (data.owned) setOwnedRooms(data.owned);
      if (data.joined) setJoinedRooms(data.joined);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, [currentUserId]);

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = codeQuery.trim();
    if (!raw) return;

    // 1. If user entered a full URL or relative path with /room/
    if (raw.includes('/room/')) {
      const match = raw.match(/\/room\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        window.location.href = `/room/${match[1]}`;
        return;
      }
    }

    // 2. If user entered a direct room ID (e.g. room-...)
    if (raw.toLowerCase().startsWith('room-')) {
      window.location.href = `/room/${raw.toLowerCase()}`;
      return;
    }

    const clean = raw.toUpperCase();

    // 3. Check if code matches any known room locally first
    const foundLocal = [...ownedRooms, ...joinedRooms].find(
      (r) => (r.inviteCode && r.inviteCode.toUpperCase() === clean) || r.id === raw
    );
    if (foundLocal) {
      window.location.href = `/room/${foundLocal.id}`;
      return;
    }

    // 4. Call room lookup API
    setIsLookingUpCode(true);
    setCodeError(null);
    try {
      const res = await fetch(`/api/rooms/lookup?code=${encodeURIComponent(clean)}`);
      const data = await res.json();
      if (!res.ok || !data.found) {
        setCodeError(data.error || `No listening room found for code "${clean}". Please verify with the host.`);
        return;
      }

      window.location.href = `/room/${data.roomId}`;
    } catch (err: any) {
      setCodeError(err.message || 'Error looking up room code. Please try again.');
    } finally {
      setIsLookingUpCode(false);
    }
  };

  return (
    <div className="min-h-screen bg-lounge-bg text-lounge-textPrimary flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-10">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-lounge-border">
          <div className="flex items-center gap-4">
            <img
              src={currentUserAvatar}
              alt={currentUserName}
              className="w-14 h-14 rounded-2xl object-cover bg-lounge-surface border border-lounge-border shadow-md"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Welcome back, {currentUserName}
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  Private Lounge
                </span>
              </div>
              <p className="text-xs text-lounge-textMuted mt-0.5">
                Listen collaboratively with independent volume mixers and crystal-clear voice.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/create"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-lg shadow-amber-950/40"
            >
              <Plus size={15} /> Create a Room
            </Link>
          </div>
        </div>

        {/* Quick Actions Bar: Direct Room Code Entry */}
        <div className="p-5 rounded-2xl bg-lounge-surface border border-lounge-border flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Key size={15} className="text-amber-500" /> Have an Invitation Code or Room Link?
            </h3>
            <p className="text-xs text-lounge-textMuted mt-0.5">
              Enter invite code or room ID to join your friends instantly.
            </p>
          </div>

          <div className="w-full md:w-auto">
            <form onSubmit={handleJoinByCode} className="flex items-center gap-2 w-full md:w-auto">
              <input
                type="text"
                value={codeQuery}
                onChange={(e) => {
                  setCodeQuery(e.target.value.toUpperCase());
                  setCodeError(null);
                }}
                placeholder="e.g. SH4A8KLU or room ID"
                className="px-3.5 py-2 rounded-xl bg-lounge-bg border border-lounge-border text-white text-xs font-mono uppercase tracking-wider focus:outline-none focus:border-amber-500 w-full sm:w-56"
              />
              <button
                type="submit"
                disabled={isLookingUpCode || !codeQuery.trim()}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-xs font-semibold text-white transition flex-shrink-0 flex items-center gap-1.5 shadow-md shadow-amber-950/30"
              >
                {isLookingUpCode ? <Loader2 size={13} className="animate-spin" /> : null}
                <span>Join Room</span>
              </button>
            </form>
            {codeError && (
              <p className="text-xs text-rose-400 mt-2 font-medium bg-rose-950/40 border border-rose-900/60 px-3 py-1.5 rounded-lg">
                {codeError}
              </p>
            )}
          </div>
        </div>

        {/* Section 1: My Listening Rooms (Owned by user) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Radio size={16} className="text-amber-500" /> My Listening Rooms ({ownedRooms.length})
              </h2>
              <p className="text-xs text-lounge-textMuted">
                Rooms you own with complete host administrative controls
              </p>
            </div>
            <Link
              href="/create"
              className="text-xs font-semibold text-amber-500 hover:text-amber-400 transition"
            >
              + New Room
            </Link>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-lounge-textMuted">Loading your rooms...</div>
          ) : ownedRooms.length === 0 ? (
            <div className="p-8 rounded-2xl bg-lounge-surface border border-dashed border-lounge-border text-center space-y-2">
              <Disc3 size={32} className="mx-auto text-lounge-textMuted" />
              <p className="text-xs font-medium text-lounge-textSecondary">No rooms created yet</p>
              <p className="text-[11px] text-lounge-textMuted max-w-sm mx-auto">
                Create a private room to listen to independent or Indian music together with friends.
              </p>
              <Link
                href="/create"
                className="inline-block mt-1 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition"
              >
                Create Room
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {ownedRooms.map((room) => (
                <div
                  key={room.id}
                  className="rounded-2xl bg-lounge-surface border border-lounge-border hover:border-lounge-borderSubtle transition flex flex-col justify-between overflow-hidden shadow-sm group"
                >
                  <div className="relative h-36 overflow-hidden">
                    <img
                      src={room.coverImage}
                      alt={room.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-lounge-surface via-black/40 to-transparent" />
                    <div className="absolute top-3 right-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-black/60 backdrop-blur-md text-amber-400 border border-white/10">
                        {room.inviteCode}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-white truncate">{room.name}</h3>
                        <span className="text-[11px] text-lounge-textMuted font-mono flex items-center gap-1">
                          <Users size={12} /> {room.maxCapacity} max
                        </span>
                      </div>
                      <p className="text-xs text-lounge-textMuted line-clamp-2 mt-1">{room.description}</p>
                    </div>

                    <div className="pt-3 border-t border-lounge-border flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-amber-400 flex items-center gap-1">
                        <Settings size={12} /> Host Control
                      </span>
                      <Link
                        href={`/room/${room.id}`}
                        className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition flex items-center gap-1"
                      >
                        Enter Lounge <ArrowRight size={13} />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 2: Recently Joined Rooms */}
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Headphones size={16} className="text-amber-500" /> Recently Joined Lounges
            </h2>
            <p className="text-xs text-lounge-textMuted">
              Private rooms shared with you by friends
            </p>
          </div>

          {joinedRooms.length === 0 ? (
            <div className="p-6 rounded-2xl bg-lounge-surface border border-lounge-border text-center text-xs text-lounge-textMuted">
              No joined friend rooms yet. Use an invitation code to enter your friends&apos; rooms.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {joinedRooms.map((room) => (
                <div
                  key={room.id}
                  className="rounded-2xl bg-lounge-surface border border-lounge-border hover:border-lounge-borderSubtle transition flex flex-col justify-between overflow-hidden shadow-sm"
                >
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-white truncate">{room.name}</h3>
                      <span className="text-[10px] font-mono text-lounge-textMuted bg-lounge-bg px-2 py-0.5 rounded border border-lounge-border">
                        Host: {room.hostName}
                      </span>
                    </div>
                    <p className="text-xs text-lounge-textMuted line-clamp-2">{room.description}</p>
                  </div>

                  <div className="px-4 py-3 border-t border-lounge-border bg-lounge-card flex items-center justify-between">
                    <span className="text-[11px] text-lounge-textMuted">Member</span>
                    <Link
                      href={`/room/${room.id}`}
                      className="px-3.5 py-1.5 rounded-lg bg-lounge-bg hover:bg-lounge-surface border border-lounge-border text-white text-xs font-semibold transition"
                    >
                      Join Room
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Floating Acceptance Test Panel for rapid verification */}
      <AcceptanceTestPanel onTestCompleted={fetchRooms} />
    </div>
  );
}
