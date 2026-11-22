'use client';

import { useT } from '@/lib/i18n';
import { useState } from 'react';
import { format } from 'date-fns';
import { MoreVertical, Edit2, Trash2, ChevronDown, ChevronUp, Paperclip } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Avatar from '@/components/ui/Avatar';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency, categoryOf, payerIdOf } from '@/lib/utils/balance';
import type { Expense } from '@/types';
import AddExpenseModal from './AddExpenseModal';
import { paidBackNote } from '@/lib/utils/paidBack';
import { savePayments } from '@/lib/outbox';
import ReceiptPhoto from './ReceiptPhoto';
import { groupColor, type GroupColor } from '@/lib/utils/groupColor';

interface ExpenseCardProps {
  expense: Expense;
  currentUserId: string;
  onDelete?: () => void;
  onUpdate?: () => void;
  /** Override the display currency (e.g. on the dashboard, where groups differ) */
  currency?: string;
  /** Show which trip this is from (dashboard, when you're in several) */
  group?: { id: string; name: string; color?: GroupColor };
  /** People who've already paid the payer back for this expense */
  paidBack?: Set<string>;
}

export default function ExpenseCard({ expense, currentUserId, onDelete, onUpdate, currency, group, paidBack }: ExpenseCardProps) {
  const gc = group ? group.color ?? groupColor(group.id) : null;
  const { toast } = useToast();
  const supabase = createClient();
  const [expanded, setExpanded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const t = useT();

  const payer = expense.payer as any;
  const payerName = payer?.id === currentUserId
    ? t('you')
    : payer?.full_name || payer?.email || expense.payer_pending?.name || 'Unknown';
  const payerId = payerIdOf(expense);
  const isMyExpense = expense.paid_by === currentUserId;
  const cat = categoryOf(expense.category);

  const myParticipation = expense.participants?.find((p) => p.user_id === currentUserId);
  const myShare = myParticipation?.share_amount ?? 0;
  const owers = (expense.participants ?? []).filter((p) => (p.user_id ?? p.pending_member_id) !== payerId && Number(p.share_amount) > 0);
  const isPaidBack = (pid?: string | null) => !!pid && !!paidBack?.has(pid);
  const allSettled = owers.length > 0 && owers.every((p) => isPaidBack(p.user_id ?? p.pending_member_id));
  const [marking, setMarking] = useState<string | null>(null);

  // "I paid Rahul back for the dinner": a payment tied to this expense, so the plan updates around it
  async function markPaidBack(pid: string, share: number) {
    if (!payerId) return;
    setMarking(pid);
    const { error, queued } = await savePayments(supabase, [{
      group_id: expense.group_id, from_person: pid, to_person: payerId, amount: Number(share),
      date: format(new Date(), 'yyyy-MM-dd'), note: paidBackNote(expense.title), created_by: currentUserId, expense_id: expense.id,
    }], paidBackNote(expense.title));
    setMarking(null);
    if (error) { toast(error.message, 'error'); return; }
    toast(queued ? 'No signal. It’ll sync when you’re back online.' : 'Payment recorded');
    onUpdate?.();
  }

  async function handleDelete() {
    if (!confirm(t('exp.confirmDelete'))) return;
    setDeleting(true);
    if (expense.receipt_path) await supabase.storage.from('receipts').remove([expense.receipt_path]);
    const { error } = await supabase.from('expenses').delete().eq('id', expense.id);
    if (error) {
      toast('Failed to delete expense', 'error');
    } else {
      toast(t('exp.deleted'));
      onDelete?.();
    }
    setDeleting(false);
    setShowMenu(false);
  }

  const editData = {
    id: expense.id,
    title: expense.title,
    amount: expense.amount,
    date: expense.date,
    paid_by: expense.paid_by,
    paid_by_pending: expense.paid_by_pending,
    category: expense.category,
    split_type: expense.split_type,
    notes: expense.notes,
    items: expense.items ?? null,
    fx: expense.fx ?? null,
    participants: (expense.participants || []).map((p) => ({
      user_id: p.user_id,
      pending_member_id: p.pending_member_id,
      share_amount: p.share_amount,
      share_percentage: p.share_percentage,
    })),
  };

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden" style={gc ? { borderLeft: `4px solid ${gc.dot}` } : undefined}>
        <div className="flex items-start gap-3 p-4">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-lg">{cat.emoji}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                {group && gc && (
                  <span
                    className="inline-flex max-w-[11rem] items-center gap-1 rounded-full px-2 py-0.5 mb-1 text-[11px] font-semibold"
                    style={{ background: gc.bg, color: gc.fg }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: gc.dot }} aria-hidden />
                    <span className="truncate">{group.name}</span>
                  </span>
                )}
                <p className="font-semibold text-gray-900 truncate">{expense.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {t('exp.paid', { date: format(new Date(expense.date), 'MMM d'), name: payerName })}
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <div className="text-right">
                  <p className="font-bold text-gray-900">{formatCurrency(expense.amount, currency)}</p>
                  {expense.fx && <p className="text-xs text-gray-500">{formatCurrency(expense.fx.amount, expense.fx.currency)}</p>}
                  {allSettled ? (
                    <p className="text-xs text-gray-500 font-medium">✓ {t('exp.settled')}</p>
                  ) : isMyExpense ? (
                    <p className="text-xs text-green-600 font-medium">{t('exp.youPaid')}</p>
                  ) : myShare > 0 && isPaidBack(currentUserId) ? (
                    <p className="text-xs text-gray-500 font-medium">✓ {t('exp.paidBack')}</p>
                  ) : myShare > 0 ? (
                    <p className="text-xs text-red-500 font-medium">{t('exp.youOwe', { amount: formatCurrency(myShare, currency) })}</p>
                  ) : null}
                </div>
                <div className="relative">
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="p-1 hover:bg-gray-100 rounded-lg"
                  >
                    <MoreVertical size={16} className="text-gray-400" />
                  </button>
                  {showMenu && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                      <div className="absolute right-0 top-6 bg-white border border-gray-100 rounded-xl shadow-lg z-20 py-1 min-w-32">
                        <button
                          onClick={() => { setShowEdit(true); setShowMenu(false); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <Edit2 size={14} /> {t('exp.edit')}
                        </button>
                        <button
                          onClick={handleDelete}
                          disabled={deleting}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          <Trash2 size={14} /> {t('exp.delete')}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {expense.notes && (
              <p className="text-xs text-gray-500 mt-1 italic">{expense.notes}</p>
            )}

            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 mt-2 text-xs text-blue-600"
            >
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {expense.participants?.length || 0} participants · {expense.items ? 'itemized bill' : `${expense.split_type} split`}
              {expense.receipt_path && <Paperclip size={12} className="ml-1" />}
            </button>
          </div>
        </div>

        {expanded && (
          <div className="px-4 pb-4 border-t border-gray-50 pt-3">
            {expense.items && expense.items.items.length > 0 && (
              <div className="mb-3 space-y-1 text-xs text-gray-500">
                {expense.items.items.map((it, i) => (
                  <div key={i} className="flex justify-between gap-2">
                    <span className="truncate">{it.name || 'Item'} · {it.people.length} {it.people.length === 1 ? 'person' : 'people'}</span>
                    <span>{formatCurrency(it.price, expense.fx?.currency ?? currency)}</span>
                  </div>
                ))}
                {expense.items.extra !== 0 && (
                  <div className="flex justify-between"><span>Tax / service / tip</span><span>{formatCurrency(expense.items.extra, expense.fx?.currency ?? currency)}</span></div>
                )}
              </div>
            )}
            <div className="space-y-2">
              {(expense.participants ?? []).map((p) => {
                const profile = p.profile as any;
                const name = profile?.full_name || profile?.email || p.pending_member?.name || 'Unknown';
                const pid = p.user_id ?? p.pending_member_id;
                return (
                  <div key={pid ?? p.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar src={profile?.avatar_url} name={name} size="xs" />
                      <span className="text-sm text-gray-700">{name}</span>
                      {pid === payerId && (
                        <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">paid</span>
                      )}
                    </div>
                    <span className="flex items-center gap-2">
                      {pid && pid !== payerId && Number(p.share_amount) > 0 && paidBack && (
                        isPaidBack(pid) ? (
                          <span className="text-xs text-gray-500">✓ {t('exp.paidBack')}</span>
                        ) : (pid === currentUserId || payerId === currentUserId) ? (
                          <button
                            onClick={() => markPaidBack(pid, p.share_amount)}
                            disabled={marking === pid}
                            className="text-xs font-medium text-blue-600 disabled:opacity-50"
                          >
                            {marking === pid ? '…' : t('exp.markPaidBack')}
                          </button>
                        ) : null
                      )}
                      <span className="text-sm font-medium text-gray-900">{formatCurrency(p.share_amount, currency)}</span>
                    </span>
                  </div>
                );
              })}
            </div>
            <ReceiptPhoto expenseId={expense.id} groupId={expense.group_id} path={expense.receipt_path} onChange={onUpdate} />
          </div>
        )}
      </div>

      <AddExpenseModal
        open={showEdit}
        onClose={() => setShowEdit(false)}
        groupId={expense.group_id}
        expense={editData}
        onSuccess={onUpdate}
      />
    </>
  );
}
