'use client';

import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

export function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already in standalone PWA mode
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isStandaloneMode) {
      setIsStandalone(true);
      return;
    }

    // Check if dismissed in this session
    if (sessionStorage.getItem('shredoo_pwa_dismissed') === 'true') {
      return;
    }

    // Check iOS
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua);
    setIsIos(isIosDevice);

    // Capture standard PWA install prompt (Chrome/Edge/Android)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // On iOS Safari, show helper after 3s if on mobile
    if (isIosDevice && !isStandaloneMode) {
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 3000);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setShowBanner(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    sessionStorage.setItem('shredoo_pwa_dismissed', 'true');
  };

  if (!showBanner || isStandalone) {
    return null;
  }

  return (
    <aside
      aria-label="App Installation"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-50 bg-lounge-surface/95 backdrop-blur-md border border-amber-500/40 p-4 rounded-2xl shadow-2xl shadow-amber-950/50 animate-in fade-in slide-in-from-bottom-4 duration-300"
    >
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 flex-shrink-0">
          <Smartphone size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-white tracking-wide">
              Install SHREDoo Mobile App
            </h4>
            <button
              onClick={handleDismiss}
              className="text-lounge-textMuted hover:text-white transition p-1"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
          <p className="text-[11px] text-lounge-textMuted mt-1 leading-relaxed">
            {isIos
              ? 'Tap Share ⎋ and choose "Add to Home Screen" to install SHREDoo on your phone.'
              : 'Add to your home screen for full-screen listening, background voice, and instant access.'}
          </p>

          {!isIos && deferredPrompt && (
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={handleInstallClick}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold transition shadow-md shadow-amber-950/40"
              >
                <Download size={13} /> Install Now
              </button>
              <button
                onClick={handleDismiss}
                className="px-2.5 py-1.5 text-[11px] text-lounge-textMuted hover:text-white transition"
              >
                Maybe later
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
