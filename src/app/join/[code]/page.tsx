'use client';

import { useEffect, useState, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SplitSquareHorizontal, Users, Mail, Lock, User } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

type Status = 'loading' | 'ready' | 'processing' | 'confirm_email' | 'success' | 'error';
type AuthMode = 'signup' | 'signin';

interface GroupInfo {
  id: string;
  name: string;
  description: string | null;
  member_count: number;
}

interface PendingInfo {
  id: string;
  name: string;
  group_name: string;
  group_invite_code: string;
}

export default function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const personalToken = searchParams.get('for');
  const supabase = createClient();

  const [status, setStatus] = useState<Status>('loading');
  const [authMode, setAuthMode] = useState<AuthMode>('signup');
  const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(null);
  const [pendingInfo, setPendingInfo] = useState<PendingInfo | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    async function init() {
      // Check if already signed in
      const { data: { user } } = await supabase.auth.getUser();

      // Load group info (public function, no auth needed)
      const { data: groupData } = await supabase.rpc('get_group_by_invite_code', { p_code: code });
      if (!groupData?.[0]) {
        setErrorMsg('This invite link is invalid or has expired.');
        setStatus('error');
        return;
      }
      setGroupInfo(groupData[0] as GroupInfo);

      // Load personal token info if present
      if (personalToken) {
        const { data: pendingData } = await supabase.rpc('get_pending_member_info', { p_token: personalToken });
        if (pendingData?.[0]) {
          setPendingInfo(pendingData[0] as PendingInfo);
          setName(pendingData[0].name); // Pre-fill name
        }
      }

      // If already signed in, join + claim immediately
      if (user) {
        await doJoin(user.id);
        return;
      }

      setStatus('ready');
    }
    init();
  }, [code, personalToken]);

  async function doJoin(userId?: string) {
    setStatus('processing');

    if (personalToken) {
      // Claim personal slot (also joins the group)
      const { data, error } = await supabase.rpc('claim_pending_member', { p_invite_token: personalToken });
      if (error || data?.error) {
        // Fallback: just join the group
        await joinByCode();
      } else {
        setStatus('success');
        setTimeout(() => router.replace(`/groups/${data.group_id}`), 1200);
      }
    } else {
      await joinByCode();
    }
  }

  async function joinByCode() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !groupInfo) return;

    // Check already member
    const { data: existing } = await supabase
      .from('group_members')
      .select('id')
      .eq('group_id', groupInfo.id)
      .eq('user_id', user.id)
      .single();

    if (!existing) {
      await supabase.from('group_members').insert({
        group_id: groupInfo.id,
        user_id: user.id,
        role: 'member',
      });
    }

    setStatus('success');
    setTimeout(() => router.replace(`/groups/${groupInfo.id}`), 1200);
  }

  async function handleGoogleLogin() {
    setFormLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback?next=/join/${code}${personalToken ? `?for=${personalToken}` : ''}`,
      },
    });
    if (error) { setFormError(error.message); setFormLoading(false); }
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    if (password.length < 6) { setFormError('Password must be at least 6 characters'); return; }
    setFormLoading(true);

    if (authMode === 'signup') {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: name } },
      });
      if (error) { setFormError(error.message); setFormLoading(false); return; }

      if (data.session) {
        // No email confirmation required — proceed
        await doJoin(data.user!.id);
      } else {
        // Email confirmation required
        setStatus('confirm_email');
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setFormError(error.message); setFormLoading(false); return; }
      await doJoin(data.user.id);
    }
    setFormLoading(false);
  }

  // ── Loading ────────────────────────────────────────────────
  if (status === 'loading' || status === 'processing') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">{status === 'processing' ? 'Joining group…' : 'Loading…'}</p>
        </div>
      </div>
    );
  }

  // ── Success ────────────────────────────────────────────────
  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-5xl mb-3">🎉</p>
          <h2 className="text-xl font-bold text-gray-900">You&apos;re in!</h2>
          <p className="text-gray-500 mt-1">Taking you to {groupInfo?.name}…</p>
        </div>
      </div>
    );
  }

  // ── Confirm email ─────────────────────────────────────────
  if (status === 'confirm_email') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 max-w-sm w-full text-center">
          <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail size={24} className="text-blue-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Check your email</h2>
          <p className="text-gray-500 text-sm">
            We sent a confirmation link to <strong>{email}</strong>. Click it to finish joining <strong>{groupInfo?.name}</strong>.
          </p>
        </div>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────
  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 max-w-sm w-full text-center">
          <p className="text-4xl mb-3">❌</p>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Invalid link</h2>
          <p className="text-gray-500 text-sm mb-6">{errorMsg}</p>
          <Button onClick={() => router.push('/login')} fullWidth>Go to app</Button>
        </div>
      </div>
    );
  }

  // ── Sign up / sign in ─────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mb-3 shadow-lg shadow-blue-200">
            <SplitSquareHorizontal size={28} className="text-white" />
          </div>
          <p className="text-gray-500 text-sm">You&apos;ve been invited to</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-0.5">{groupInfo?.name}</h1>
          {pendingInfo && (
            <div className="mt-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 text-center">
              <p className="text-sm text-amber-800">
                Expenses are waiting for <strong>{pendingInfo.name}</strong> to claim
              </p>
            </div>
          )}
          {groupInfo && (
            <div className="flex items-center gap-1.5 mt-2 text-gray-500 text-sm">
              <Users size={14} />
              {groupInfo.member_count} {groupInfo.member_count === 1 ? 'member' : 'members'}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Auth mode toggle */}
          <div className="flex border-b border-gray-100">
            <button
              onClick={() => setAuthMode('signup')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${authMode === 'signup' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
            >
              Create account
            </button>
            <button
              onClick={() => setAuthMode('signin')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${authMode === 'signin' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
            >
              Sign in
            </button>
          </div>

          <div className="p-5">
            {/* Google */}
            <Button variant="secondary" fullWidth size="lg" loading={formLoading} onClick={handleGoogleLogin} className="mb-4">
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </Button>

            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100" /></div>
              <div className="relative flex justify-center"><span className="bg-white px-3 text-xs text-gray-400">or</span></div>
            </div>

            {formError && (
              <div className="mb-3 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">{formError}</div>
            )}

            <form onSubmit={handleEmailSubmit} className="space-y-3">
              {authMode === 'signup' && (
                <Input
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  leftIcon={<User size={14} />}
                  required
                />
              )}
              <Input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail size={14} />}
                required
                autoComplete="email"
              />
              <Input
                type="password"
                placeholder={authMode === 'signup' ? 'Create password (min 6 chars)' : 'Password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftIcon={<Lock size={14} />}
                required
                minLength={6}
                autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'}
              />
              <Button type="submit" fullWidth size="lg" loading={formLoading}>
                {authMode === 'signup' ? `Join ${groupInfo?.name}` : 'Sign in & join'}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
