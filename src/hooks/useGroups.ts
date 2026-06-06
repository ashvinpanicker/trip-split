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
    const { data } = await supabase
      .from('groups')
      .select(`
        *,
        members:group_members(
          id, user_id, role, joined_at,
          profile:profiles(id, email, full_name, avatar_url)
        ),
        pending_members(
          id, name, email, invite_token, claimed_by, claimed_at, created_at
        )
      `)
      .eq('id', groupId)
      .single();

    setGroup(data as Group | null);
    setLoading(false);
  }, [groupId]);

  useEffect(() => { load(); }, [load]);

  return { group, loading, refetch: load };
}
