'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useSignIn } from '@clerk/nextjs';
import { Radio, ArrowLeft, Mail, Key, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
  const { isLoaded, signIn } = useSignIn();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'request' | 'reset' | 'done'>('request');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;
    setLoading(true);
    setError(null);

    try {
      await signIn.create({
        strategy: 'reset_password_email_code',
        identifier: email.trim(),
      });
      setStep('reset');
    } catch (err: any) {
      setError(err?.errors?.[0]?.message || 'Failed to send password reset code. Please check your email address.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;
    setLoading(true);
    setError(null);

    try {
      const result = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code: code.trim(),
        password: password.trim(),
      });

      if (result.status === 'complete') {
        setStep('done');
      } else {
        setError('Verification pending. Please check details.');
      }
    } catch (err: any) {
      setError(err?.errors?.[0]?.message || 'Invalid verification code or weak password.');
    } finally {
      setLoading(false);
    }
  };

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
          Password Recovery & Account Verification
        </p>
      </div>

      <div className="w-full max-w-md bg-lounge-surface border border-lounge-border rounded-2xl p-6 sm:p-8 shadow-2xl space-y-5">
        <Link
          href="/sign-in"
          className="inline-flex items-center gap-1.5 text-xs text-lounge-textMuted hover:text-white transition mb-2"
        >
          <ArrowLeft size={14} /> Back to Sign In
        </Link>

        {error && (
          <div className="p-3 rounded-xl bg-red-950/40 border border-red-900/60 text-xs text-red-300 flex items-start gap-2">
            <AlertCircle size={15} className="flex-shrink-0 mt-0.5 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {step === 'request' && (
          <form onSubmit={handleRequestCode} className="space-y-4">
            <h2 className="text-lg font-bold text-white">Reset your password</h2>
            <p className="text-xs text-lounge-textMuted leading-relaxed">
              Enter the email address registered with your Shredoo account. We will send you a verification code.
            </p>

            <div>
              <label className="block text-xs font-semibold text-lounge-textSecondary mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-3.5 text-lounge-textMuted" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-lounge-bg border border-lounge-border text-white text-xs focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-lg shadow-amber-950/40"
            >
              {loading ? 'Sending code...' : 'Send Reset Code'}
            </button>
          </form>
        )}

        {step === 'reset' && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <h2 className="text-lg font-bold text-white">Enter code & new password</h2>
            <p className="text-xs text-lounge-textMuted">
              Check your inbox at <span className="font-semibold text-white">{email}</span> for the verification code.
            </p>

            <div>
              <label className="block text-xs font-semibold text-lounge-textSecondary mb-1.5">
                Verification Code
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="6-digit code"
                className="w-full px-3.5 py-2.5 rounded-xl bg-lounge-bg border border-lounge-border text-white text-xs font-mono tracking-widest focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-lounge-textSecondary mb-1.5">
                New Password
              </label>
              <div className="relative">
                <Key size={15} className="absolute left-3.5 top-3.5 text-lounge-textMuted" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-lounge-bg border border-lounge-border text-white text-xs focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-lg shadow-amber-950/40"
            >
              {loading ? 'Resetting password...' : 'Update Password & Sign In'}
            </button>
          </form>
        )}

        {step === 'done' && (
          <div className="text-center py-4 space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800 flex items-center justify-center mx-auto">
              <CheckCircle2 size={24} />
            </div>
            <h3 className="text-base font-bold text-white">Password successfully reset!</h3>
            <p className="text-xs text-lounge-textMuted">
              Your new password is now active. You can log in and join listening rooms immediately.
            </p>
            <Link
              href="/sign-in"
              className="inline-block px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition"
            >
              Continue to Sign In
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

