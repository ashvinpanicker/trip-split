'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Button from '@/components/ui/Button';

export default function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const supabase = createClient();
  const [status, setStatus] = useState<'loading' | 'joining' | 'success' | 'error' | 'auth'>('loading');
  const [message, setMessage] = useState('');
  const [groupName, setGroupName] = useState('');

  useEffect(() => {
    async function handleJoin() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setStatus('auth');
        return;
      }

      const { data: group } = await supabase
        .from('groups')
        .select('id, name')
        .eq('invite_code', code)
        .single();

      if (!group) {
        setMessage('Invalid invite link. The group may not exist.');
        setStatus('error');
        return;
      }

      setGroupName(group.name);

      const { data: existing } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', group.id)
        .eq('user_id', user.id)
        .single();

      if (existing) {
        router.replace(`/groups/${group.id}`);
        return;
      }

      setStatus('joining');
      const { error } = await supabase.from('group_members').insert({
        group_id: group.id,
        user_id: user.id,
        role: 'member',
      });

      if (error) {
        setMessage(error.message);
        setStatus('error');
      } else {
        setStatus('success');
        setTimeout(() => router.replace(`/groups/${group.id}`), 1500);
      }
    }

    handleJoin();
  }, [code]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 max-w-sm w-full text-center">
        {status === 'loading' && (
          <>
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Checking invite link...</p>
          </>
        )}
        {status === 'joining' && (
          <>
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Joining group...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="text-4xl mb-3">🎉</div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Joined!</h2>
            <p className="text-gray-500">Welcome to <strong>{groupName}</strong>. Redirecting...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="text-4xl mb-3">❌</div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Oops!</h2>
            <p className="text-gray-500 mb-4">{message}</p>
            <Button onClick={() => router.push('/groups')} fullWidth>Go to Groups</Button>
          </>
        )}
        {status === 'auth' && (
          <>
            <div className="text-4xl mb-3">🔐</div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Sign in first</h2>
            <p className="text-gray-500 mb-4">You need an account to join a group.</p>
            <Button onClick={() => router.push(`/login?next=/join/${code}`)} fullWidth>
              Sign in
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
