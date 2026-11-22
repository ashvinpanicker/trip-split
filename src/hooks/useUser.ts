'use client';

import { useEffect, useState } from 'react';
import { useCachedState, hasCached, readSavedMe, saveMe } from './cache';
import { createClient, getAuthUser } from '@/lib/supabase/client';
import type { Profile } from '@/types';

export function useUser() {
  const [user, setUser] = useCachedState<Profile | null>('user', null);
  const [loading, setLoading] = useState(!hasCached('user'));
  const supabase = createClient();

  useEffect(() => {
    // Show the saved profile right away (after hydration), then refresh it
    if (!hasCached('user')) {
      const saved = readSavedMe<Profile>();
      if (saved) { setUser(saved); setLoading(false); }
    }
    async function load() {
      const authUser = await getAuthUser(supabase);
      if (!authUser) {
        setUser(null); saveMe(null); setLoading(false);
        // Session gone (e.g. expired): go sign in again, then come back here
        if (navigator.onLine) location.assign(`/login?next=${encodeURIComponent(location.pathname)}`);
        return;
      }

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      setUser(data);
      saveMe(data);
      setLoading(false);
    }
    load();
  }, []);

  return { user, loading };
}
