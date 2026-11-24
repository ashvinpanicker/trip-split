'use client';

import { fetchGroup } from '@/lib/data/trip';
import { useEffect, useState, useCallback } from 'react';
import { createClient, getAuthUser } from '@/lib/supabase/client';
import type { Group } from '@/types';
import { useCachedState, hasCached, useRefreshOn } from './cache';

export function useGroups() {
  const [groups, setGroups] = useCachedState<Group[]>('groups', []);
  const [loading, setLoading] = useState(!hasCached('groups'));
  const supabase = createClient();

  const load = useCallback(async () => {
    if (!hasCached('groups')) setLoading(true);
    const user = await getAuthUser(supabase);
    if (!user) { setLoading(false); return; }

    const { data } = await supabase
      .from('group_members')
      .select(`
        group:groups (
          id, name, description, created_by, invite_code, currency, kind, track_only, archived_at, created_at, updated_at,
          member_count:group_members(count),
          pending:pending_members(claimed_by),
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
          // Everyone on the trip, including people added by name who haven't joined yet
          member_count: (g.member_count?.[0]?.count ?? 0) + (g.pending ?? []).filter((p: { claimed_by: string | null }) => !p.claimed_by).length,
          total_expenses: g.expenses?.[0]?.count ?? 0,
        }));
      setGroups(g as Group[]);
    }
    setLoading(false);
  }, []);
  useRefreshOn(load);

  useEffect(() => { load(); }, [load]);

  return { groups, loading, refetch: load };
}

export function useGroup(groupId: string) {
  const [group, setGroup] = useCachedState<Group | null>(`group:${groupId}`, null);
  const [loading, setLoading] = useState(!hasCached(`group:${groupId}`));
  const supabase = createClient();

  const load = useCallback(async () => {
    if (!hasCached(`group:${groupId}`)) setLoading(true);

    const fresh = await fetchGroup(supabase, groupId);
    if (fresh) setGroup(fresh); // offline: keep what's saved
    setLoading(false);
  }, [groupId]);
  useRefreshOn(load);

  useEffect(() => { load(); }, [load]);

  return { group, loading, refetch: load };
}
