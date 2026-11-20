'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils/balance';

type Activity = { id: number; actor: string | null; action: string; data: Record<string, string | number | boolean | null>; created_at: string };

interface ActivityFeedProps {
  groupId: string;
  currentUserId: string;
  nameOf: (id: string) => string;
}

const icon: Record<string, string> = {
  expense_added: '➕', expense_edited: '✏️', expense_deleted: '🗑️',
  payment_recorded: '💸', payment_deleted: '↩️',
  person_added: '👤', name_claimed: '🙋', member_joined: '🙋',
  role_changed: '⭐', setting_changed: '⚙️',
};

function describe(a: Activity): string {
  const d = a.data || {};
  const amt = (v: unknown) => formatCurrency(Number(v));
  switch (a.action) {
    case 'expense_added': return `added “${d.title}” ${amt(d.amount)}${d.payer ? `, paid by ${d.payer}` : ''}`;
    case 'expense_edited':
      if (Number(d.old_amount) !== Number(d.amount)) return `edited “${d.title}”: ${amt(d.old_amount)} → ${amt(d.amount)}`;
      if (d.old_title && d.old_title !== d.title) return `renamed “${d.old_title}” to “${d.title}”`;
      return `edited “${d.title}”`;
    case 'expense_deleted': return `deleted “${d.title}” ${amt(d.amount)}`;
    case 'payment_recorded': return `recorded ${d.from} paid ${d.to} ${amt(d.amount)}`;
    case 'payment_deleted': return `removed a payment: ${d.from} → ${d.to} ${amt(d.amount)}`;
    case 'person_added': return `added ${d.name}`;
    case 'name_claimed': return `joined as ${d.name}`;
    case 'member_joined': return `joined the group`;
    case 'role_changed': return d.role === 'admin' ? `made ${d.name} an admin` : `removed ${d.name} as admin`;
    case 'setting_changed': return d.simplify_debts ? 'turned on simplified payments' : 'turned off simplified payments';
    default: return a.action.replace(/_/g, ' ');
  }
}

/** Who did what, newest first. Written by database triggers, so it can't be skipped or edited from the app. */
export default function ActivityFeed({ groupId, currentUserId, nameOf }: ActivityFeedProps) {
  const [items, setItems] = useState<Activity[] | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await createClient()
      .from('activity_log')
      .select('id, actor, action, data, created_at')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })
      .limit(200);
    setItems(error ? [] : (data as Activity[]));
  }, [groupId]);

  useEffect(() => {
    load();
    const onChange = () => load();
    window.addEventListener('tripsplit:expenses-changed', onChange);
    return () => window.removeEventListener('tripsplit:expenses-changed', onChange);
  }, [load]);

  if (items === null) return <div className="h-24 bg-gray-100 rounded-2xl animate-pulse" />;
  if (items.length === 0) {
    return <p className="text-sm text-gray-500 text-center py-10">Changes to this group will show up here, so everyone can see who added or edited what.</p>;
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
      {items.map((a) => {
        const who = a.actor ? (a.actor === currentUserId ? 'You' : nameOf(a.actor)) : 'Someone';
        return (
          <div key={a.id} className="flex gap-3 px-4 py-3">
            <span className="text-lg leading-6" aria-hidden>{icon[a.action] ?? '•'}</span>
            <div className="min-w-0">
              <p className="text-sm text-gray-900 break-words"><span className="font-semibold">{who}</span> {describe(a)}</p>
              <p className="text-xs text-gray-400">{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
