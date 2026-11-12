'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { Navbar } from '@/components/Navbar';
import {
  User,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Loader2,
  ShieldAlert,
} from 'lucide-react';

export default function SetupUsernamePage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState<{
    valid?: boolean;
    available?: boolean;
    normalized?: string;
    error?: string;
    suggestions?: string[];
  }>({});
  const [claiming, setClaiming] = useState(false);
  const [success, setSuccess] = useState(false);

  // Pre-fill initial suggestion from Clerk profile
  useEffect(() => {
    if (isLoaded && user) {
      const initial = user.username || user.firstName?.toLowerCase().replace(/[^a-z0-9_]/g, '') || '';
      if (initial && !username) {
        setUsername(initial);
      }
    }
  }, [isLoaded, user]);

  // Debounced real-time availability check
  useEffect(() => {
    if (!username.trim()) {
      setStatus({});
      setChecking(false);
      return;
    }

    setChecking(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/username/check?username=${encodeURIComponent(username.trim())}`);
        const data = await res.json();
        setStatus(data);
      } catch (err) {
        setStatus({ error: 'Network error checking availability.' });
      } finally {
        setChecking(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [username]);

  const handleClaim = async (selectedUsername?: string) => {
    const toClaim = (selectedUsername || username).trim();
    if (!toClaim) return;

    setClaiming(true);
    try {
      const res = await fetch('/api/username/reserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: toClaim }),
      });
      const data = await res.json();

      if (!res.ok) {
        setStatus({
          valid: false,
          available: false,
          error: data.error || 'Failed to claim username.',
        });
        setClaiming(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/');
        router.refresh();
      }, 1000);
    } catch (err: any) {
      setStatus({
        valid: false,
        available: false,
        error: err?.message || 'Server error reserving username.',
      });
      setClaiming(false);
    }
  };

  return (
    <div className="min-h-screen bg-lounge-bg text-lounge-textPrimary flex flex-col">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-lounge-surface border border-lounge-border rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto shadow-inner">
              <User size={22} />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Choose Your Lounge Identity
            </h1>
            <p className="text-xs text-lounge-textMuted max-w-xs mx-auto">
              Every SHREDoo listener has a globally unique handle. Case-insensitive, 3-20 characters.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (status.available && !checking) {
                handleClaim();
              }
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-semibold text-lounge-textSecondary uppercase tracking-wider mb-2">
                Unique Handle
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-amber-500">
                  @
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="your_handle"
                  maxLength={20}
                  className="w-full pl-8 pr-10 py-3 rounded-xl bg-lounge-card border border-lounge-border text-sm font-medium text-white placeholder-lounge-textMuted focus:outline-none focus:border-amber-500 transition"
                  autoFocus
                />
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                  {checking && <Loader2 size={16} className="text-amber-500 animate-spin" />}
                  {!checking && status.available && (
                    <CheckCircle2 size={16} className="text-emerald-400" />
                  )}
                  {!checking && status.valid === false && (
                    <AlertCircle size={16} className="text-rose-400" />
                  )}
                  {!checking && status.available === false && status.valid && (
                    <AlertCircle size={16} className="text-amber-400" />
                  )}
                </div>
              </div>
            </div>

            {/* Real-time Status Badges */}
            {username.trim() && !checking && (
              <div className="space-y-3">
                {status.available && (
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
                    <CheckCircle2 size={14} className="shrink-0" />
                    <span>
                      <strong>@{status.normalized}</strong> is available!
                    </span>
                  </div>
                )}

                {!status.available && status.error && (
                  <div className="flex items-start gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                    <ShieldAlert size={14} className="shrink-0 mt-0.5 text-rose-400" />
                    <span>{status.error}</span>
                  </div>
                )}

                {/* Suggested Alternatives */}
                {status.suggestions && status.suggestions.length > 0 && (
                  <div className="p-3 rounded-2xl bg-lounge-card border border-lounge-border space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                      <Sparkles size={13} />
                      <span>Suggested Alternatives:</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {status.suggestions.map((sug) => (
                        <button
                          key={sug}
                          type="button"
                          onClick={() => {
                            setUsername(sug);
                            handleClaim(sug);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-lounge-surface hover:bg-amber-600/20 border border-lounge-border hover:border-amber-500/40 text-xs text-white transition cursor-pointer"
                        >
                          @{sug}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={!status.available || checking || claiming || success}
              className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition flex items-center justify-center gap-2 shadow-lg shadow-amber-950/40"
            >
              {claiming ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Reserving...
                </>
              ) : success ? (
                <>
                  <CheckCircle2 size={16} className="text-emerald-400" /> Identity Reserved!
                </>
              ) : (
                <>
                  Claim Handle <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

