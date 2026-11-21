'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { createClient } from '@/lib/supabase/client';
import Button from '@/components/ui/Button';

/**
 * Google sign-in that stays on gotripsplit.app.
 *
 * With NEXT_PUBLIC_GOOGLE_CLIENT_ID set, Google's own button runs on our domain and hands an ID token
 * to Supabase (signInWithIdToken), so people never see a *.supabase.co address. Without it, or if
 * Google's script is blocked, it falls back to the standard redirect flow.
 */
const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

type GoogleId = {
  accounts: {
    id: {
      initialize: (o: Record<string, unknown>) => void;
      renderButton: (el: HTMLElement, o: Record<string, unknown>) => void;
    };
  };
};

async function sha256Hex(s: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const GoogleLogo = () => (
  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" aria-hidden>
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

export default function GoogleSignIn({
  next = '/dashboard',
  label = 'Continue with Google',
  onError,
  className = '',
}: { next?: string; label?: string; onError?: (msg: string) => void; className?: string }) {
  const supabase = createClient();
  const box = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<'loading' | 'google' | 'redirect'>(CLIENT_ID ? 'loading' : 'redirect');
  const [busy, setBusy] = useState(false);

  async function redirectFlow() {
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/api/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (error) {
      onError?.(error.message);
      setBusy(false);
    }
  }

  async function setUp() {
    const g = (window as unknown as { google?: GoogleId }).google;
    if (!g || !box.current) return setMode('redirect');
    // The raw nonce goes to Supabase; Google signs the hashed one into the token
    const raw = crypto.randomUUID() + crypto.randomUUID();
    const hashed = await sha256Hex(raw);
    g.accounts.id.initialize({
      client_id: CLIENT_ID,
      nonce: hashed,
      use_fedcm_for_prompt: true,
      callback: async ({ credential }: { credential: string }) => {
        setBusy(true);
        const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: credential, nonce: raw });
        if (error) {
          onError?.(error.message);
          setBusy(false);
          return;
        }
        // Full load so every page (join flow included) starts from the signed-in state
        location.assign(next);
      },
    });
    g.accounts.id.renderButton(box.current, {
      theme: 'outline',
      size: 'large',
      shape: 'pill',
      text: 'continue_with',
      logo_alignment: 'center',
      width: Math.min(box.current.offsetWidth || 320, 400),
    });
    setMode('google');
  }

  // If Google's script never loads (blocked, offline), fall back after a few seconds
  useEffect(() => {
    if (mode !== 'loading') return;
    const t = setTimeout(() => setMode((m) => (m === 'loading' ? 'redirect' : m)), 4000);
    return () => clearTimeout(t);
  }, [mode]);

  return (
    <div className={className}>
      {CLIENT_ID && (
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="afterInteractive"
          onReady={() => { void setUp(); }}
          onError={() => setMode('redirect')}
        />
      )}
      {mode !== 'redirect' && (
        <div className="relative min-h-[44px]">
          <div ref={box} className={`flex justify-center ${busy ? 'opacity-50 pointer-events-none' : ''}`} />
          {busy && <p className="text-center text-sm text-gray-500 mt-2">Signing you in…</p>}
        </div>
      )}
      {mode === 'redirect' && (
        <Button type="button" variant="secondary" fullWidth size="lg" loading={busy} onClick={redirectFlow}>
          <GoogleLogo />
          {label}
        </Button>
      )}
    </div>
  );
}
