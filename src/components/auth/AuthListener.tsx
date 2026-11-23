'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { clearOfflineCache } from '@/components/pwa/Pwa';

export default function AuthListener() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        router.refresh();
      }
      if (event === 'SIGNED_OUT') {
        clearOfflineCache();
        router.push('/login');
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  return null;
}
