'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { MoreVertical, Edit2, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Avatar from '@/components/ui/Avatar';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency } from '@/lib/utils/balance';
import type { Expense } from '@/types';
import AddExpenseModal from './AddExpenseModal';

interface ExpenseCardProps {
  expense: Expense;
  currentUserId: string;
  onDelete?: () => void;
  onUpdate?: () => void;
}

export default function ExpenseCard({ expense, currentUserId, onDelete, onUpdate }: ExpenseCardProps) {
  const { toast } = useToast();
  const supabase = createClient();
  const [expanded, setExpanded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const payer = expense.payer as any;
  const payerName = payer?.full_name || payer?.email || 'Unknown';
  const isMyExpense = expense.paid_by === currentUserId;

  const myParticipation = expense.participants?.find((p) => p.user_id === currentUserId);
  const myShare = myParticipation?.share_amount ?? 0;

  async function handleDelete() {
    if (!confirm('Delete this expense?')) return;
    setDeleting(true);
    const { error } = await supabase.from('expenses').delete().eq('id', expense.id);
    if (error) {
      toast('Failed to delete expense', 'error');
    } else {
      toast('Expense deleted');
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
    split_type: expense.split_type,
    notes: expense.notes,
    participants: (expense.participants || []).map((p) => ({
      user_id: p.user_id,
      pending_member_id: p.pending_member_id,
      share_amount: p.share_amount,
      share_percentage: p.share_percentage,
    })),
  };

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex items-start gap-3 p-4">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-lg">🧾</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 truncate">{expense.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {format(new Date(expense.date), 'MMM d, yyyy')} · {payerName} paid
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <div className="text-right">
                  <p className="font-bold text-gray-900">{formatCurrency(expense.amount)}</p>
                  {isMyExpense ? (
                    <p className="text-xs text-green-600 font-medium">you paid</p>
                  ) : myShare > 0 ? (
                    <p className="text-xs text-red-500 font-medium">you owe {formatCurrency(myShare)}</p>
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
                          <Edit2 size={14} /> Edit
                        </button>
                        <button
                          onClick={handleDelete}
                          disabled={deleting}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          <Trash2 size={14} /> Delete
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
              {expense.participants?.length || 0} participants · {expense.split_type} split
            </button>
          </div>
        </div>

        {expanded && expense.participants && expense.participants.length > 0 && (
          <div className="px-4 pb-4 border-t border-gray-50 pt-3">
            <div className="space-y-2">
              {expense.participants.map((p) => {
                const profile = p.profile as any;
                const name = profile?.full_name || profile?.email || 'Unknown';
                return (
                  <div key={p.user_id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar src={profile?.avatar_url} name={name} size="xs" />
                      <span className="text-sm text-gray-700">{name}</span>
                      {p.user_id === expense.paid_by && (
                        <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">paid</span>
                      )}
                    </div>
                    <span className="text-sm font-medium text-gray-900">{formatCurrency(p.share_amount)}</span>
                  </div>
                );
              })}
            </div>
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
