'use client';

import { useEffect, useState } from 'react';
import { createClient, getAuthUser } from '@/lib/supabase/client';
import type { Profile } from '@/types';

export function useUser() {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const authUser = await getAuthUser(supabase);
      if (!authUser) { setLoading(false); return; }

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      setUser(data);
      setLoading(false);
    }
    load();
  }, []);

  return { user, loading };
}
