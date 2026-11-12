import { Suspense } from 'react';
import { SignUp } from '@clerk/nextjs';
import Link from 'next/link';
import { Radio, Loader2 } from 'lucide-react';

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-lounge-bg text-lounge-textPrimary flex flex-col justify-center items-center p-4 sm:p-6">
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
          Create your Shredoo account with Google or Email to host your own listening lounges.
        </p>
      </div>

      <div className="w-full max-w-md">
        <Suspense
          fallback={
            <div className="p-8 rounded-2xl bg-lounge-surface border border-lounge-border flex flex-col items-center justify-center space-y-3">
              <Loader2 size={24} className="animate-spin text-amber-500" />
              <p className="text-xs text-lounge-textMuted">Loading sign up...</p>
            </div>
          }
        >
          <SignUp
            routing="path"
            path="/sign-up"
            signInUrl="/sign-in"
            fallbackRedirectUrl="/"
          />
        </Suspense>
      </div>
    </div>
  );
}

