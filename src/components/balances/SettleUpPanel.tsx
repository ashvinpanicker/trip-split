'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, Sparkles, Share2 } from 'lucide-react';
import Card from '@/components/ui/Card';
import BalanceList from './BalanceList';
import SettlementList from './SettlementList';
import { formatCurrency } from '@/lib/utils/balance';
import type { Balance, Settlement } from '@/types';

interface SettleUpPanelProps {
  balances: Balance[];
  smart: Settlement[];
  direct: Settlement[];
  currentUserId: string;
  groupId: string;
  groupName: string;
  upiIds: Record<string, string | null | undefined>;
  onRecorded: () => void;
}

export default function SettleUpPanel({
  balances, smart, direct, currentUserId, groupId, groupName, upiIds, onRecorded,
}: SettleUpPanelProps) {
  const [mode, setMode] = useState<'smart' | 'direct'>('smart');
  const [showAll, setShowAll] = useState(false);

  const plan = mode === 'smart' ? smart : direct;
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
  const saved = direct.length - smart.length;

  function shareText() {
    const lines = smart.map((s) => `• ${s.from_name} → ${s.to_name}: ${formatCurrency(s.amount)}`);
    return `💸 ${groupName} — settle up (${smart.length} payment${smart.length === 1 ? '' : 's'})\n\n${lines.join('\n')}\n\nPay via the app: ${window.location.origin}/groups/${groupId}`;
  }

  return (
    <Card padding="none" className="overflow-hidden">
      {/* Your status */}
      <div className={`px-4 py-4 ${me > 0.005 ? 'bg-green-50' : me < -0.005 ? 'bg-red-50' : 'bg-gray-50'}`}>
        <p className="text-xs font-medium text-gray-500">Your status</p>
        {Math.abs(me) < 0.005 ? (
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
        {/* Mode toggle */}
        {plan.length + direct.length > 0 && (
          <>
            <div className="grid grid-cols-2 gap-1 p-1 bg-gray-100 rounded-xl">
              {(['smart', 'direct'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`flex items-center justify-center gap-1.5 h-9 rounded-lg text-sm font-medium transition-colors ${
                    mode === m ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                  }`}
                >
                  {m === 'smart' && <Sparkles size={14} className={mode === m ? 'text-blue-600' : ''} />}
                  {m === 'smart' ? `Smart · ${smart.length}` : `Direct · ${direct.length}`}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500">
              {mode === 'smart'
                ? saved > 0
                  ? `Fewest payments possible — ${saved} fewer than paying everyone back directly.`
                  : 'Fewest payments possible.'
                : 'Everyone pays back exactly who paid for them.'}
            </p>
          </>
        )}

        <SettlementList
          settlements={sorted}
          currentUserId={currentUserId}
          groupId={groupId}
          groupName={groupName}
          upiIds={upiIds}
          onRecorded={onRecorded}
        />

        {smart.length > 0 && (
          <a
            href={`https://wa.me/?text=${encodeURIComponent(typeof window !== 'undefined' ? shareText() : '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 h-10 rounded-xl bg-[#25D366] text-white text-sm font-semibold"
          >
            <Share2 size={16} /> Share plan on WhatsApp
          </a>
        )}
      </div>

      {/* Everyone's balance, collapsed by default */}
      <button
        onClick={() => setShowAll((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm font-medium text-gray-700"
      >
        Everyone&apos;s balance
        <ChevronDown size={16} className={`transition-transform ${showAll ? 'rotate-180' : ''}`} />
      </button>
      {showAll && (
        <div className="px-4 pb-4">
          <BalanceList balances={balances} currentUserId={currentUserId} />
        </div>
      )}
    </Card>
  );
}
