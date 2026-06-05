'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Expense } from '@/types';

export function useExpenses(groupId: string) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('expenses')
      .select(`
        *,
        payer:profiles!expenses_paid_by_fkey(id, email, full_name, avatar_url),
        participants:expense_participants(
          id, user_id, share_amount, share_percentage,
          profile:profiles(id, email, full_name, avatar_url)
        )
      `)
      .eq('group_id', groupId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    setExpenses((data || []) as Expense[]);
    setLoading(false);
  }, [groupId]);

  useEffect(() => { load(); }, [load]);

  return { expenses, loading, refetch: load };
}

export function useAllExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      // Get all groups user belongs to
      const { data: memberships } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id);

      if (!memberships?.length) { setLoading(false); return; }

      const groupIds = memberships.map((m) => m.group_id);

      const { data } = await supabase
        .from('expenses')
        .select(`
          *,
          payer:profiles!expenses_paid_by_fkey(id, email, full_name, avatar_url),
          participants:expense_participants(
            id, user_id, share_amount, share_percentage,
            profile:profiles(id, email, full_name, avatar_url)
          )
        `)
        .in('group_id', groupIds)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(50);

      setExpenses((data || []) as Expense[]);
      setLoading(false);
    }
    load();
  }, []);

  return { expenses, loading };
}
