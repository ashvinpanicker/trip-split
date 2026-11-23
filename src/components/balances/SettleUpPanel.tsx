'use client';

import type { PayMethod } from '@/lib/utils/payMethods';
import { useMemo, useState } from 'react';
import { Check, ChevronDown, Copy, FileText, Share2 } from 'lucide-react';
import { format } from 'date-fns';
import AddUpiInline from './AddUpiInline';
import RecordPayment from './RecordPayment';
import Card from '@/components/ui/Card';
import BalanceList from './BalanceList';
import SettlementList from './SettlementList';
import { formatCurrency, getActiveCurrency } from '@/lib/utils/balance';
import { SETTLE_MODES, type SettleMode } from '@/lib/utils/balance';
import type { Balance, Settlement } from '@/types';

interface SettleUpPanelProps {
  balances: Balance[];
  /** Who genuinely owes whom (netted per pair), to mark payments that go to someone else */
  byPerson: Settlement[];
  /** The plan for this trip's settle-up mode (settlePlan) */
  plan: Settlement[];
  /** Group setting, changed by admins in Group settings */
  mode: SettleMode;
  isAdmin: boolean;
  /** "Record payments" feature: manual payments of any amount */
  canRecord: boolean;
  onOpenPerson: (personId: string) => void;
  currentUserId: string;
  groupId: string;
  groupName: string;
  payMethods: Record<string, PayMethod[]>;
  onRecorded: () => void;
}

export default function SettleUpPanel({
  balances, byPerson, plan, mode, isAdmin, canRecord, onOpenPerson,
  currentUserId, groupId, groupName, payMethods, onRecorded,
}: SettleUpPanelProps) {
  const [showAll, setShowAll] = useState(false);

  const modeInfo = SETTLE_MODES.find((m) => m.key === mode)!;
  const realPairs = useMemo(() => new Set(byPerson.map((s) => `${s.from_id}>${s.to_id}`)), [byPerson]);
  const mine = (s: Settlement) => s.from_id === currentUserId || s.to_id === currentUserId;
  // Your payments first, then biggest amounts
  const sorted = useMemo(
    () => [...plan].sort((a, b) => Number(mine(b)) - Number(mine(a)) || b.amount - a.amount),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [plan, currentUserId]
  );

  const me = balances.find((b) => b.person_id === currentUserId)?.net_balance ?? 0;
  const iOwe = plan.filter((s) => s.from_id === currentUserId);
  const owedToMe = plan.filter((s) => s.to_id === currentUserId);

  // UPI ID next to each payee, so people can pay straight from the WhatsApp message
  const upiOf = (id: string) => payMethods?.[id]?.find((m) => m.type === 'upi')?.value;
  function shareText() {
    const lines = plan.map((s) => {
      const upi = upiOf(s.to_id);
      return `• ${s.from_name} → ${s.to_name}: ${formatCurrency(s.amount)}${upi ? ` (UPI: ${upi})` : ''}`;
    });
    const when = format(new Date(), 'd MMM, h:mm a');
    return `💸 ${groupName}: settle up (${plan.length} payment${plan.length === 1 ? '' : 's'})\nUpdated ${when}\n\n${lines.join('\n')}\n\n` +
      `Paid? Tap “I’ve paid” in TripSplit so you’re off the list.\n` +
      `Check the maths: ${window.location.origin}/groups/${groupId}/statement`;
  }
  const [copied, setCopied] = useState(false);
  async function copyText() {
    try { await navigator.clipboard.writeText(shareText()); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { prompt('Copy the message:', shareText()); }
  }

  return (
    <Card padding="none" className="overflow-hidden">
      {/* Your status */}
      <div className={`px-4 py-4 ${me > 0 ? 'bg-green-50' : me < 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
        <p className="text-xs font-medium text-gray-500">Your status</p>
        {me === 0 ? (
          <p className="text-lg font-bold text-gray-900">You&apos;re all settled 🎉</p>
        ) : me > 0 ? (
          <p className="text-lg font-bold text-green-700">You get back {formatCurrency(me)}</p>
        ) : (
          <p className="text-lg font-bold text-red-600">You owe {formatCurrency(-me)}</p>
        )}
        {(iOwe.length > 0 || owedToMe.length > 0) && (
          <p className="text-xs text-gray-500 mt-0.5">
            {iOwe.length > 0 && `${iOwe.length} payment${iOwe.length > 1 ? 's' : ''} to make`}
            {iOwe.length > 0 && owedToMe.length > 0 && ' · '}
            {owedToMe.length > 0 && `${owedToMe.length} to receive`}
          </p>
        )}
      </div>

      <div className="p-4 space-y-3">
        {/* How payments are worked out (changed by admins in Group settings) */}
        {(canRecord || isAdmin) && plan.length > 0 && (
          <div className="rounded-xl bg-gray-50 px-3 py-2.5">
            <p className="text-sm font-semibold text-gray-900">{modeInfo.label}</p>
            <p className="text-xs text-gray-500">{modeInfo.hint}</p>
            {isAdmin && <p className="text-xs text-gray-500 mt-1">Change it in People → Group settings.</p>}
          </div>
        )}

        {owedToMe.length > 0 && !upiOf(currentUserId) && getActiveCurrency() === 'INR' && (
          <AddUpiInline userId={currentUserId} existing={payMethods?.[currentUserId] ?? []} onSaved={() => location.reload()} />
        )}

        <SettlementList
          settlements={sorted}
          currentUserId={currentUserId}
          groupId={groupId}
          groupName={groupName}
          payMethods={payMethods}
          onRecorded={onRecorded}
          onOpenPerson={onOpenPerson}
          isRerouted={mode === 'fewest' ? (s) => !realPairs.has(`${s.from_id}>${s.to_id}`) : undefined}
        />

        {plan.length > 0 && (
          <div className="flex gap-2">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(typeof window !== 'undefined' ? shareText() : '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl bg-[#25D366] text-white text-sm font-semibold"
            >
              <Share2 size={16} /> Share on WhatsApp
            </a>
            <button
              onClick={copyText}
              className="flex items-center justify-center gap-1.5 h-10 px-4 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700"
            >
              {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        )}
        {canRecord && <RecordPayment
          persons={balances.map((b) => ({ id: b.person_id, name: b.user_name }))}
          groupId={groupId}
          currentUserId={currentUserId}
          onRecorded={onRecorded}
        />}
        <a href={`/groups/${groupId}/statement`} className="flex items-center justify-center gap-1.5 text-sm font-medium text-blue-600">
          <FileText size={15} /> Check the maths (PDF)
        </a>
      </div>

      {/* Everyone's balance, collapsed by default; tap a person for the breakdown */}
      <button
        onClick={() => setShowAll((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm font-medium text-gray-700"
        aria-expanded={showAll}
      >
        Everyone&apos;s balance
        <ChevronDown size={16} className={`transition-transform ${showAll ? 'rotate-180' : ''}`} />
      </button>
      {showAll && (
        <div className="px-4 pb-4">
          <p className="text-xs text-gray-500 mb-1">Tap someone to see what&apos;s between you.</p>
          <BalanceList balances={balances} currentUserId={currentUserId} onSelect={onOpenPerson} />
        </div>
      )}
    </Card>
  );
}
