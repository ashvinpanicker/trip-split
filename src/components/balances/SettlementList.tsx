'use client';

import { useT } from '@/lib/i18n';
import { useEffect, useState } from 'react';
import { ArrowRight, Check, Copy, ExternalLink, MessageCircle } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, getActiveCurrency } from '@/lib/utils/balance';
import { payActions, type PayMethod } from '@/lib/utils/payMethods';
import type { Settlement } from '@/types';

interface SettlementListProps {
  settlements: Settlement[];
  currentUserId: string;
  /** When set, each row gets "Mark paid" (and pay buttons where possible). */
  groupId?: string;
  groupName?: string;
  /** person id → ways they can be paid (UPI, PayPal, crypto…) */
  payMethods?: Record<string, PayMethod[]>;
  onRecorded?: () => void;
  /** Open "You & X" for the other person on rows that involve you */
  onOpenPerson?: (personId: string) => void;
  /** Rows that aren't a real "who owes whom" debt (only possible when payments are simplified) */
  isRerouted?: (s: Settlement) => boolean;
}

export default function SettlementList({
  settlements, currentUserId, groupId, groupName, payMethods = {}, onRecorded, onOpenPerson, isRerouted,
}: SettlementListProps) {
  const { toast } = useToast();
  const t = useT();
  const [savingIdx, setSavingIdx] = useState<number | null>(null);
  // Personal "your balance" links (no sign-in) for people who owe you; falls back to the trip page
  const [links, setLinks] = useState<Record<string, string>>({});
  const debtorKey = settlements.filter((x) => x.to_id === currentUserId).map((x) => x.from_id).sort().join(',');
  useEffect(() => {
    if (!groupId || !debtorKey) return;
    const supabase = createClient();
    Promise.all(debtorKey.split(',').map(async (pid) => {
      const { data, error } = await supabase.rpc('balance_link_for', { p_group_id: groupId, p_person_id: pid });
      return [pid, error || !data ? null : `${location.origin}/s/${data}`] as const;
    })).then((rows) => setLinks(Object.fromEntries(rows.filter(([, u]) => u) as [string, string][])));
  }, [groupId, debtorKey]);
  const remindText = (s: Settlement) =>
    t('settle.remindText', {
      name: s.from_name.split(' ')[0], trip: groupName ?? 'TripSplit', amount: formatCurrency(s.amount),
      link: links[s.from_id] ?? `${typeof location !== 'undefined' ? location.origin : 'https://gotripsplit.app'}/groups/${groupId}`,
    });

  async function copyAddress(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast(`Copied ${label} address. Check the network before sending.`);
    } catch {
      prompt(`Copy ${label} address:`, value);
    }
  }

  if (settlements.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-2xl mb-2">🎉</p>
        <p className="text-gray-600 font-medium">{t('settle.done')}</p>
        <p className="text-gray-400 text-sm">{t('settle.none')}</p>
      </div>
    );
  }

  async function markPaid(s: Settlement, idx: number) {
    if (!groupId) return;
    const who = s.from_id === currentUserId ? t('you') : s.from_name;
    if (!confirm(t('settle.confirm', { who, to: s.to_id === currentUserId ? t('you') : s.to_name, amount: formatCurrency(s.amount) }))) return;
    setSavingIdx(idx);
    const supabase = createClient();
    const { error } = await supabase.from('settlements').insert({
      group_id: groupId,
      from_person: s.from_id,
      to_person: s.to_id,
      amount: s.amount,
      created_by: currentUserId,
    });
    setSavingIdx(null);
    if (error) {
      toast(error.message.includes('settlements') ? 'Run supabase/goa_upgrade.sql first' : error.message, 'error');
      return;
    }
    toast(t('settle.recorded'));
    onRecorded?.();
  }

  return (
    <div className="space-y-3">
      {settlements.map((s, i) => {
        const isYouPaying = s.from_id === currentUserId;
        const isYouReceiving = s.to_id === currentUserId;
        const actions = isYouPaying
          ? payActions(payMethods[s.to_id] ?? [], s.amount, getActiveCurrency(), `${groupName ?? 'TripSplit'} settle-up`, s.to_name)
          : [];

        return (
          <div
            key={`${s.from_id}-${s.to_id}`}
            className={`p-3 rounded-xl border ${
              isYouPaying ? 'bg-red-50 border-red-100' : isYouReceiving ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Avatar name={isYouPaying ? t('you') : s.from_name} size="sm" />
                <p className="text-sm font-medium text-gray-900 truncate">{isYouPaying ? t('you') : s.from_name}</p>
              </div>
              <div className="flex flex-col items-center">
                <span className={`text-sm font-bold ${isYouPaying ? 'text-red-600' : isYouReceiving ? 'text-green-600' : 'text-gray-900'}`}>
                  {formatCurrency(s.amount)}
                </span>
                <ArrowRight size={14} className="text-gray-400" />
              </div>
              <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                <p className="text-sm font-medium text-gray-900 truncate text-right">{isYouReceiving ? t('you') : s.to_name}</p>
                <Avatar name={isYouReceiving ? t('you') : s.to_name} size="sm" />
              </div>
            </div>

            {(isRerouted?.(s) || (onOpenPerson && (isYouPaying || isYouReceiving))) && (
              <div className="flex items-center justify-between gap-2 mt-1.5 text-xs">
                <span className="text-gray-500">{isRerouted?.(s) ? 'Simplified: covers debts between others' : ''}</span>
                {onOpenPerson && (isYouPaying || isYouReceiving) && (
                  <button
                    onClick={() => onOpenPerson(isYouPaying ? s.to_id : s.from_id)}
                    className="font-medium text-blue-600 shrink-0"
                  >
                    {t('settle.breakdown')}
                  </button>
                )}
              </div>
            )}

            {groupId && !(isYouPaying || isYouReceiving) && (
              <div className="flex justify-end mt-1.5">
                <button
                  onClick={() => markPaid(s, i)}
                  disabled={savingIdx !== null}
                  className="text-xs font-medium text-gray-500 hover:text-blue-600 disabled:opacity-50"
                >
                  {savingIdx === i ? t('settle.saving') : t('settle.markPaid')}
                </button>
              </div>
            )}

            {groupId && (isYouPaying || isYouReceiving) && (
              <div className="mt-3 space-y-2">
                {actions.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {actions.map((a, k) =>
                      a.href ? (
                        <a
                          key={`${a.type}-${a.value}`}
                          href={a.href}
                          target={a.href.startsWith('https:') ? '_blank' : undefined}
                          rel="noopener noreferrer"
                          className={`flex-1 min-w-[7.5rem] flex items-center justify-center gap-1.5 h-9 rounded-lg text-sm font-medium ${
                            k === 0 ? 'bg-blue-600 text-white active:bg-blue-700' : 'bg-white border border-blue-200 text-blue-700'
                          }`}
                        >
                          {t('settle.payVia', { method: a.label })} {a.href.startsWith('https:') && <ExternalLink size={12} />}
                        </a>
                      ) : (
                        <button
                          key={`${a.type}-${a.value}`}
                          onClick={() => copyAddress(a.label, a.value)}
                          className="flex-1 min-w-[7.5rem] flex items-center justify-center gap-1.5 h-9 rounded-lg bg-white border border-gray-200 text-gray-700 text-sm font-medium"
                        >
                          <Copy size={13} /> {t('settle.address', { method: a.label })}
                        </button>
                      ),
                    )}
                  </div>
                )}
              <div className="flex gap-2">
                {isYouReceiving && (
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(remindText(s))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg bg-white border border-green-200 text-green-700 text-sm font-medium"
                  >
                    <MessageCircle size={14} /> {t('settle.remind')}
                  </a>
                )}
                <button
                  onClick={() => markPaid(s, i)}
                  disabled={savingIdx !== null}
                  className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg bg-white border border-gray-200 text-gray-700 text-sm font-medium active:bg-gray-50 disabled:opacity-50"
                >
                  <Check size={14} /> {savingIdx === i ? t('settle.saving') : isYouReceiving ? t('settle.gotIt') : t('settle.markPaid')}
                </button>
              </div>
              </div>
            )}
          </div>
        );
      })}
      {groupId && (
        <p className="text-xs text-gray-400 text-center">
          <a href="/profile" className="underline">{t('settle.addMethods')}</a>
        </p>
      )}
    </div>
  );
}
