'use client';

import { savePayments } from '@/lib/outbox';
import { useT } from '@/lib/i18n';
import { useEffect, useState } from 'react';
import { ArrowRight, Check, Copy, ExternalLink, MessageCircle, QrCode } from 'lucide-react';
import UpiQr from './UpiQr';
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
  /** One line explaining a payment (fewest-payments plans) */
  why?: (s: Settlement) => string | null;
}

export default function SettlementList({
  settlements, currentUserId, groupId, groupName, payMethods = {}, onRecorded, onOpenPerson, why,
}: SettlementListProps) {
  const { toast } = useToast();
  const t = useT();
  const [savingIdx, setSavingIdx] = useState<number | null>(null);
  const [qrIdx, setQrIdx] = useState<number | null>(null);
  // Tapped "Pay via UPI" and came back to the app? Ask whether it went through, so it gets marked here
  const [askIdx, setAskIdx] = useState<number | null>(null);
  const tappedPay = (idx: number) => { try { sessionStorage.setItem('tripsplit:paying', JSON.stringify({ idx, at: Date.now() })); } catch {} };
  useEffect(() => {
    const check = () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const p = JSON.parse(sessionStorage.getItem('tripsplit:paying') || 'null');
        if (p && Date.now() - p.at < 30 * 60_000 && Date.now() - p.at > 2_000) setAskIdx(p.idx);
      } catch {}
    };
    document.addEventListener('visibilitychange', check);
    return () => document.removeEventListener('visibilitychange', check);
  }, []);
  const doneAsking = () => { setAskIdx(null); try { sessionStorage.removeItem('tripsplit:paying'); } catch {} };
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
      toast(label === 'UPI' ? 'Copied UPI ID' : `Copied ${label} address. Check the network before sending.`);
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

  async function markPaid(s: Settlement, idx: number, confirmed = false) {
    if (!groupId) return;
    const who = s.from_id === currentUserId ? t('you') : s.from_name;
    if (!confirmed && !confirm(t('settle.confirm', { who, to: s.to_id === currentUserId ? t('you') : s.to_name, amount: formatCurrency(s.amount) }))) return;
    setSavingIdx(idx);
    const { error, queued } = await savePayments(createClient(), [{
      group_id: groupId, from_person: s.from_id, to_person: s.to_id, amount: s.amount,
      date: new Date().toISOString().slice(0, 10), note: null, created_by: currentUserId,
    }], `${s.from_name} → ${s.to_name}`);
    setSavingIdx(null);
    if (error) { toast(error.message, 'error'); return; }
    toast(queued ? 'No signal. It’ll sync when you’re back online.' : t('settle.recorded'));
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
        // UPI ID as text too: on iPhones the pay link often can't pick an app, so people paste the ID instead
        const payeeUpi = isYouPaying ? actions.find((a) => a.type === 'upi')?.value : undefined;
        // When you're owed: a QR of your own UPI with the amount, for the other person to scan
        const myUpiLink = isYouReceiving
          ? payActions((payMethods[currentUserId] ?? []).filter((m) => m.type === 'upi'), s.amount, getActiveCurrency(), `${groupName ?? 'TripSplit'} settle-up`, s.to_name)[0]?.href
          : undefined;

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

            {(why?.(s) || (onOpenPerson && (isYouPaying || isYouReceiving))) && (
              <div className="flex items-start justify-between gap-2 mt-1.5 text-xs">
                <span className="text-gray-600">{why?.(s)}</span>
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
                          onClick={() => tappedPay(i)}
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
                {askIdx === i && isYouPaying && (
                  <div role="alert" className="rounded-xl bg-green-50 border border-green-200 p-3 space-y-2">
                    <p className="text-sm font-medium text-gray-900">{t('settle.didYouPay', { name: s.to_name.split(' ')[0], amount: formatCurrency(s.amount) })}</p>
                    <div className="flex gap-2">
                      <button onClick={() => { doneAsking(); markPaid(s, i, true); }} className="flex-1 h-9 rounded-lg bg-green-600 text-white text-sm font-semibold">{t('settle.yesPaid')}</button>
                      <button onClick={doneAsking} className="flex-1 h-9 rounded-lg border border-gray-200 bg-white text-sm text-gray-700">{t('settle.notYet')}</button>
                    </div>
                  </div>
                )}
                {payeeUpi && (
                  <button onClick={() => copyAddress('UPI', payeeUpi)} className="w-full text-xs text-gray-600 text-left">
                    UPI ID: <span className="font-medium text-gray-900">{payeeUpi}</span> · <span className="text-blue-600 font-medium">Copy</span>
                  </button>
                )}
                {myUpiLink && qrIdx === i && (
                  <UpiQr link={myUpiLink} label={`Scan with any UPI app to pay ${formatCurrency(s.amount)}`} />
                )}
              <div className="flex gap-2">
                {myUpiLink && (
                  <button
                    onClick={() => setQrIdx(qrIdx === i ? null : i)}
                    className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg bg-white border border-blue-200 text-blue-700 text-sm font-medium"
                  >
                    <QrCode size={14} /> {qrIdx === i ? 'Hide QR' : 'Show QR'}
                  </button>
                )}
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
                  // The payer is the one who wants off the hook, so for them this is the main button
                  className={`flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg text-sm font-medium disabled:opacity-50 ${
                    isYouPaying ? 'bg-green-600 text-white font-semibold' : 'bg-white border border-gray-200 text-gray-700'
                  }`}
                >
                  <Check size={14} /> {savingIdx === i ? t('settle.saving') : isYouReceiving ? t('settle.gotIt') : t('settle.iPaid')}
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
