'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Group } from '@/types';

export function useGroups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data } = await supabase
      .from('group_members')
      .select(`
        group:groups (
          id, name, description, created_by, invite_code, created_at, updated_at,
          member_count:group_members(count),
          expenses(count)
        )
      `)
      .eq('user_id', user.id)
      .order('joined_at', { ascending: false });

    if (data) {
      const g = data
        .map((d) => d.group)
        .filter(Boolean)
        .map((g: any) => ({
          ...g,
          member_count: g.member_count?.[0]?.count ?? 0,
          total_expenses: g.expenses?.[0]?.count ?? 0,
        }));
      setGroups(g as Group[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return { groups, loading, refetch: load };
}

export function useGroup(groupId: string) {
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const load = useCallback(async () => {
    setLoading(true);

    const [{ data }, { data: pendingData }] = await Promise.all([
      supabase
        .from('groups')
        .select(`
          *,
          members:group_members(
            id, user_id, role, joined_at,
            profile:profiles(id, email, full_name, avatar_url)
          )
        `)
        .eq('id', groupId)
        .single(),
      // Separate query so a missing table doesn't break the whole page
      supabase
        .from('pending_members')
        .select('id, name, email, invite_token, claimed_by, claimed_at, created_at')
        .eq('group_id', groupId),
    ]);

    setGroup(data ? { ...data, pending_members: pendingData ?? [] } as Group : null);
    setLoading(false);
  }, [groupId]);

  useEffect(() => { load(); }, [load]);

  return { group, loading, refetch: load };
}
