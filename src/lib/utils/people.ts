import type { BalancePerson } from './balance';

type Member = { user_id: string; nickname?: string | null; weight?: number | null; profile?: { full_name?: string | null; email?: string | null; avatar_url?: string | null } | null };
type Pending = { id: string; name: string; weight?: number | null; claimed_by?: string | null };

/** How the trip shows someone: the admin's nickname, else their own name, else their email. */
export const memberName = (m: Pick<Member, 'nickname' | 'profile'>) => m.nickname || m.profile?.full_name || m.profile?.email || 'Unknown';

/** Everyone on a trip — joined members, then people added by name who haven't joined. */
export function tripPersons(group: { members?: Member[] | null; pending_members?: Pending[] | null }): (BalancePerson & { weight: number })[] {
  return [
    ...(group.members ?? []).map((m) => ({ id: m.user_id, name: memberName(m), avatar_url: m.profile?.avatar_url ?? undefined, weight: m.weight ?? 1 })),
    ...(group.pending_members ?? []).filter((p) => !p.claimed_by).map((p) => ({ id: p.id, name: p.name, is_pending: true, weight: p.weight ?? 1 })),
  ];
}
