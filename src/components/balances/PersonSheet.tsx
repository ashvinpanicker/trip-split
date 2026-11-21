'use client';

import { format } from 'date-fns';
import Modal from '@/components/ui/Modal';
import Avatar from '@/components/ui/Avatar';
import { formatCurrency, pairBreakdown } from '@/lib/utils/balance';
import type { Expense, ExpenseParticipant, SettlementRecord } from '@/types';

interface PersonSheetProps {
  open: boolean;
  onClose: () => void;
  me: string;
  other: { id: string; name: string; avatar_url?: string | null } | null;
  expenses: (Expense & { participants: ExpenseParticipant[] })[];
  payments: SettlementRecord[];
}

/** "You & Rahul": every expense and payment between two people, adding up to one number. */
export default function PersonSheet({ open, onClose, me, other, expenses, payments }: PersonSheetProps) {
  if (!other) return null;
  const { items, net } = pairBreakdown(me, other.id, expenses, payments);
  const first = other.name.split(' ')[0];

  return (
    <Modal open={open} onClose={onClose} title={`You & ${first}`}>
      <div className="p-4 space-y-4">
        <div className={`flex items-center gap-3 rounded-2xl p-4 ${net > 0 ? 'bg-green-50' : net < 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
          <Avatar src={other.avatar_url} name={other.name} size="md" />
          <p className={`text-lg font-bold ${net > 0 ? 'text-green-700' : net < 0 ? 'text-red-600' : 'text-gray-900'}`}>
            {net > 0 ? `${first} owes you ${formatCurrency(net)}` : net < 0 ? `You owe ${first} ${formatCurrency(-net)}` : `You and ${first} are square`}
          </p>
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">No shared expenses between you two yet.</p>
        ) : (
          <div className="divide-y divide-gray-100 border-y border-gray-100">
            {items.map((it) => (
              <div key={it.kind + it.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{it.kind === 'payment' ? (it.amount < 0 ? `${first} paid you` : `You paid ${first}`) : it.title}</p>
                  <p className="text-xs text-gray-500">
                    {it.date ? format(new Date(it.date), 'MMM d') : ''}
                    {it.kind === 'expense' && (it.amount > 0 ? ` · you paid, ${first}'s share` : ` · ${first} paid, your share`)}
                  </p>
                </div>
                <span className={`text-sm font-semibold tabular-nums shrink-0 ${it.amount > 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {it.amount > 0 ? '+' : '−'}{formatCurrency(Math.abs(it.amount))}
                </span>
              </div>
            ))}
          </div>
        )}

        {items.length > 0 && (
          <div className="flex items-center justify-between text-sm font-semibold">
            <span className="text-gray-700">Net</span>
            <span className={`tabular-nums ${net > 0 ? 'text-green-600' : net < 0 ? 'text-red-500' : 'text-gray-900'}`}>
              {net > 0 ? '+' : net < 0 ? '−' : ''}{formatCurrency(Math.abs(net))}
            </span>
          </div>
        )}
        <p className="text-xs text-gray-400">
          + means {first} owes you for it, − means you owe {first}.
        </p>
      </div>
    </Modal>
  );
}
