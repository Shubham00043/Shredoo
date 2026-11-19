'use client';

import React, { useEffect, Suspense } from 'react';
import { SignIn, useUser } from '@clerk/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Radio, Loader2, ArrowRight } from 'lucide-react';

function SignInContent() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect_url') || '/';

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.replace(redirectUrl);
    }
  }, [isLoaded, isSignedIn, redirectUrl, router]);

  if (isLoaded && isSignedIn) {
    return (
      <div className="p-8 rounded-2xl bg-lounge-surface border border-lounge-border flex flex-col items-center justify-center space-y-4 text-center">
        <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
          <Loader2 size={24} className="animate-spin text-amber-500" />
        </div>
        <div>
          <h2 className="text-base font-bold text-white">Already Signed In</h2>
          <p className="text-xs text-lounge-textMuted mt-1">
            Welcome back, {user?.fullName || user?.username || 'Listener'}! Entering lounge...
          </p>
        </div>
        <Link
          href={redirectUrl}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition shadow-md shadow-amber-950/40"
        >
          Enter Lounge Now <ArrowRight size={14} />
        </Link>
      </div>
    );
  }

  return (
    <SignIn
      routing="path"
      path="/sign-in"
      signUpUrl="/sign-up"
      fallbackRedirectUrl="/"
    />
  );
}

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-lounge-bg text-lounge-textPrimary flex flex-col justify-center items-center p-4 sm:p-6">
      {/* Brand Header */}
      <div className="text-center mb-8 space-y-2">
        <Link href="/" className="inline-flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-lounge-surface border border-lounge-border flex items-center justify-center text-amber-500 shadow-lg">
            <Radio size={20} />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white">
            SHRED<span className="text-amber-500">oo</span>
          </span>
        </Link>
        <p className="text-xs text-lounge-textMuted max-w-sm">
          A private, collaborative music lounge. Sign in with Google or Email to enter your rooms.
        </p>
      </div>

      {/* Clerk SignIn with active signed-in guard */}
      <div className="w-full max-w-md">
        <Suspense
          fallback={
            <div className="p-8 rounded-2xl bg-lounge-surface border border-lounge-border flex flex-col items-center justify-center space-y-3">
              <Loader2 size={24} className="animate-spin text-amber-500" />
              <p className="text-xs text-lounge-textMuted">Loading sign in...</p>
            </div>
          }
        >
          <SignInContent />
        </Suspense>
      </div>

      {/* Footer note */}
      <div className="mt-8 text-center text-[11px] text-lounge-textMuted">
        <Link href="/forgot-password" className="hover:text-amber-400 transition underline underline-offset-4">
          Need help signing in or reset password?
        </Link>
      </div>
    </div>
  );
}
