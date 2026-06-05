'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { DollarSign, Calendar, ChevronDown, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { calculateEqualSplits, calculatePercentageSplits } from '@/lib/utils/balance';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Avatar from '@/components/ui/Avatar';
import { useToast } from '@/components/ui/Toast';
import type { Group, GroupMember, SplitType } from '@/types';

interface AddExpenseModalProps {
  open: boolean;
  onClose: () => void;
  groupId: string | null;
  onSuccess?: () => void;
  expense?: {
    id: string;
    title: string;
    amount: number;
    date: string;
    paid_by: string;
    split_type: SplitType;
    notes: string | null;
    participants: { user_id: string; share_amount: number; share_percentage: number | null }[];
  } | null;
}

export default function AddExpenseModal({ open, onClose, groupId: initialGroupId, onSuccess, expense }: AddExpenseModalProps) {
  const { toast } = useToast();
  const supabase = createClient();
  const isEditing = !!expense;

  const [step, setStep] = useState<'group' | 'form'>(initialGroupId ? 'form' : 'group');
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(initialGroupId);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Form state
  const [title, setTitle] = useState(expense?.title ?? '');
  const [amount, setAmount] = useState(expense?.amount?.toString() ?? '');
  const [date, setDate] = useState(expense?.date ?? format(new Date(), 'yyyy-MM-dd'));
  const [paidBy, setPaidBy] = useState(expense?.paid_by ?? '');
  const [splitType, setSplitType] = useState<SplitType>(expense?.split_type ?? 'equal');
  const [notes, setNotes] = useState(expense?.notes ?? '');
  const [participantInputs, setParticipantInputs] = useState<Record<string, { included: boolean; amount: string; percentage: string }>>({});

  useEffect(() => {
    if (!open) return;
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      if (!initialGroupId) {
        const { data: memberships } = await supabase
          .from('group_members')
          .select('group:groups(id, name, description, invite_code, created_at, updated_at, created_by)')
          .eq('user_id', user.id);
        if (memberships) {
          setGroups(memberships.map((m: any) => m.group).filter(Boolean));
        }
      }
    }
    init();
  }, [open, initialGroupId]);

  useEffect(() => {
    if (!selectedGroupId) return;
    async function loadMembers() {
      const { data } = await supabase
        .from('group_members')
        .select('id, user_id, role, joined_at, profile:profiles(id, email, full_name, avatar_url)')
        .eq('group_id', selectedGroupId);

      const m = (data || []) as unknown as GroupMember[];
      setMembers(m);

      if (!paidBy && currentUserId) {
        setPaidBy(currentUserId);
      }

      // Init participant inputs
      const inputs: Record<string, { included: boolean; amount: string; percentage: string }> = {};
      for (const member of m) {
        const existing = expense?.participants.find((p) => p.user_id === member.user_id);
        inputs[member.user_id] = {
          included: existing ? true : true,
          amount: existing ? existing.share_amount.toString() : '',
          percentage: existing?.share_percentage ? existing.share_percentage.toString() : '',
        };
      }
      setParticipantInputs(inputs);
    }
    loadMembers();
  }, [selectedGroupId, currentUserId, expense]);

  function getIncludedParticipants() {
    return Object.entries(participantInputs)
      .filter(([, v]) => v.included)
      .map(([id]) => id);
  }

  function computeShares(): Record<string, number> {
    const included = getIncludedParticipants();
    const total = parseFloat(amount) || 0;
    if (!total || !included.length) return {};

    if (splitType === 'equal') {
      return calculateEqualSplits(total, included);
    }
    if (splitType === 'percentage') {
      const percentages: Record<string, number> = {};
      for (const id of included) {
        percentages[id] = parseFloat(participantInputs[id]?.percentage) || 0;
      }
      return calculatePercentageSplits(total, percentages);
    }
    // fixed
    const shares: Record<string, number> = {};
    for (const id of included) {
      shares[id] = parseFloat(participantInputs[id]?.amount) || 0;
    }
    return shares;
  }

  function validateForm(): string | null {
    if (!title.trim()) return 'Please enter a title';
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return 'Please enter a valid amount';
    if (!paidBy) return 'Please select who paid';
    const included = getIncludedParticipants();
    if (!included.length) return 'Please select at least one participant';

    if (splitType === 'percentage') {
      const total = included.reduce((s, id) => s + (parseFloat(participantInputs[id]?.percentage) || 0), 0);
      if (Math.abs(total - 100) > 0.5) return `Percentages must add up to 100% (currently ${total.toFixed(1)}%)`;
    }
    if (splitType === 'fixed') {
      const shares = computeShares();
      const total = Object.values(shares).reduce((s, v) => s + v, 0);
      if (Math.abs(total - amt) > 0.01) return `Fixed amounts must add up to ₹${amt.toFixed(2)} (currently ₹${total.toFixed(2)})`;
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validateForm();
    if (err) { toast(err, 'error'); return; }

    setLoading(true);
    const shares = computeShares();
    const included = getIncludedParticipants();

    try {
      if (isEditing && expense) {
        // Update expense
        const { error: expErr } = await supabase
          .from('expenses')
          .update({ title, amount: parseFloat(amount), date, paid_by: paidBy, split_type: splitType, notes: notes || null })
          .eq('id', expense.id);
        if (expErr) throw expErr;

        // Delete old participants and re-insert
        await supabase.from('expense_participants').delete().eq('expense_id', expense.id);
        const participantsData = included.map((userId) => ({
          expense_id: expense.id,
          user_id: userId,
          share_amount: shares[userId],
          share_percentage: splitType === 'percentage' ? parseFloat(participantInputs[userId]?.percentage) || null : null,
        }));
        const { error: partErr } = await supabase.from('expense_participants').insert(participantsData);
        if (partErr) throw partErr;

        toast('Expense updated');
      } else {
        // Create expense
        const { data: { user } } = await supabase.auth.getUser();
        const { data: expData, error: expErr } = await supabase
          .from('expenses')
          .insert({
            group_id: selectedGroupId,
            title,
            amount: parseFloat(amount),
            date,
            paid_by: paidBy,
            split_type: splitType,
            notes: notes || null,
            created_by: user!.id,
          })
          .select()
          .single();
        if (expErr) throw expErr;

        const participantsData = included.map((userId) => ({
          expense_id: expData.id,
          user_id: userId,
          share_amount: shares[userId],
          share_percentage: splitType === 'percentage' ? parseFloat(participantInputs[userId]?.percentage) || null : null,
        }));
        const { error: partErr } = await supabase.from('expense_participants').insert(participantsData);
        if (partErr) throw partErr;

        toast('Expense added');
      }

      onSuccess?.();
      onClose();
      resetForm();
    } catch (err: any) {
      toast(err.message || 'Something went wrong', 'error');
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setTitle(''); setAmount(''); setDate(format(new Date(), 'yyyy-MM-dd'));
    setPaidBy(''); setSplitType('equal'); setNotes('');
    setParticipantInputs({});
    if (!initialGroupId) { setStep('group'); setSelectedGroupId(null); }
  }

  const included = getIncludedParticipants();
  const shares = computeShares();

  if (step === 'group') {
    return (
      <Modal open={open} onClose={onClose} title="Select Group">
        <div className="p-4 space-y-2">
          {groups.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-8">
              You&apos;re not in any groups yet. Create or join one first.
            </p>
          )}
          {groups.map((g) => (
            <button
              key={g.id}
              onClick={() => { setSelectedGroupId(g.id); setStep('form'); }}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 border border-gray-100 text-left"
            >
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <span className="text-lg">{g.name[0]}</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">{g.name}</p>
                {g.description && <p className="text-xs text-gray-500">{g.description}</p>}
              </div>
            </button>
          ))}
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? 'Edit Expense' : 'Add Expense'} size="lg">
      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        <Input
          label="Title"
          placeholder="e.g. Dinner at restaurant"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Amount (₹)"
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            leftIcon={<span className="text-sm font-medium">₹</span>}
            min="0.01"
            step="0.01"
            required
          />
          <Input
            label="Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            leftIcon={<Calendar size={14} />}
            required
          />
        </div>

        {/* Paid by */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">Paid by</label>
          <div className="flex gap-2 flex-wrap">
            {members.map((m) => {
              const profile = m.profile as any;
              const name = profile?.full_name || profile?.email || 'Unknown';
              const isSelected = paidBy === m.user_id;
              return (
                <button
                  key={m.user_id}
                  type="button"
                  onClick={() => setPaidBy(m.user_id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition-colors ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Avatar src={profile?.avatar_url} name={name} size="xs" />
                  {name.split(' ')[0]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Split type */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">Split type</label>
          <div className="flex gap-2">
            {(['equal', 'percentage', 'fixed'] as SplitType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setSplitType(type)}
                className={`flex-1 py-2 rounded-xl border text-sm font-medium capitalize transition-colors ${
                  splitType === type
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-200'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Participants */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            Participants ({included.length}/{members.length})
          </label>
          <div className="space-y-2">
            {members.map((m) => {
              const profile = m.profile as any;
              const name = profile?.full_name || profile?.email || 'Unknown';
              const input = participantInputs[m.user_id] || { included: true, amount: '', percentage: '' };
              const share = shares[m.user_id];

              return (
                <div key={m.user_id} className="flex items-center gap-3 p-2.5 rounded-xl border border-gray-100 bg-gray-50">
                  <button
                    type="button"
                    onClick={() => setParticipantInputs((prev) => ({
                      ...prev,
                      [m.user_id]: { ...prev[m.user_id], included: !prev[m.user_id]?.included },
                    }))}
                    className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border transition-colors ${
                      input.included ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'
                    }`}
                  >
                    {input.included && <Check size={12} className="text-white" />}
                  </button>
                  <Avatar src={profile?.avatar_url} name={name} size="sm" />
                  <span className="flex-1 text-sm font-medium text-gray-900">{name}</span>

                  {input.included && splitType === 'percentage' && (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={input.percentage}
                        onChange={(e) => setParticipantInputs((prev) => ({
                          ...prev, [m.user_id]: { ...prev[m.user_id], percentage: e.target.value }
                        }))}
                        className="w-16 text-sm border border-gray-200 rounded-lg px-2 py-1 text-right"
                        placeholder="0"
                        min="0"
                        max="100"
                        step="0.1"
                      />
                      <span className="text-gray-500 text-sm">%</span>
                    </div>
                  )}

                  {input.included && splitType === 'fixed' && (
                    <div className="flex items-center gap-1">
                      <span className="text-gray-500 text-sm">₹</span>
                      <input
                        type="number"
                        value={input.amount}
                        onChange={(e) => setParticipantInputs((prev) => ({
                          ...prev, [m.user_id]: { ...prev[m.user_id], amount: e.target.value }
                        }))}
                        className="w-20 text-sm border border-gray-200 rounded-lg px-2 py-1 text-right"
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  )}

                  {input.included && splitType === 'equal' && share !== undefined && (
                    <span className="text-sm text-gray-500">₹{share.toFixed(2)}</span>
                  )}

                  {!input.included && (
                    <span className="text-xs text-gray-400">Excluded</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <Input
          label="Notes (optional)"
          placeholder="Add a note..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" fullWidth onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" fullWidth loading={loading}>
            {isEditing ? 'Update' : 'Add Expense'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
