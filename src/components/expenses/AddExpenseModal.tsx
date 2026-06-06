'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Calendar, Check, UserPlus, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { calculateEqualSplits, calculatePercentageSplits } from '@/lib/utils/balance';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Avatar from '@/components/ui/Avatar';
import { useToast } from '@/components/ui/Toast';
import type { Group, ParticipantEntry, SplitType } from '@/types';

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
    participants: { user_id: string | null; pending_member_id: string | null; share_amount: number; share_percentage: number | null }[];
  } | null;
}

export default function AddExpenseModal({
  open, onClose, groupId: initialGroupId, onSuccess, expense,
}: AddExpenseModalProps) {
  const { toast } = useToast();
  const supabase = createClient();
  const isEditing = !!expense;

  const [step, setStep] = useState<'group' | 'form'>(initialGroupId ? 'form' : 'group');
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(initialGroupId);
  const [currentUserId, setCurrentUserId] = useState('');
  const [loading, setLoading] = useState(false);

  // Form
  const [title, setTitle] = useState(expense?.title ?? '');
  const [amount, setAmount] = useState(expense?.amount?.toString() ?? '');
  const [date, setDate] = useState(expense?.date ?? format(new Date(), 'yyyy-MM-dd'));
  const [paidBy, setPaidBy] = useState(expense?.paid_by ?? '');
  const [splitType, setSplitType] = useState<SplitType>(expense?.split_type ?? 'equal');
  const [notes, setNotes] = useState(expense?.notes ?? '');
  const [participants, setParticipants] = useState<ParticipantEntry[]>([]);

  // Add person inline
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [newPersonName, setNewPersonName] = useState('');
  const [addingPerson, setAddingPerson] = useState(false);

  useEffect(() => {
    if (!open) return;
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      if (!initialGroupId) {
        const { data } = await supabase
          .from('group_members')
          .select('group:groups(id, name, description, invite_code, created_at, updated_at, created_by)')
          .eq('user_id', user.id);
        if (data) setGroups(data.map((d: any) => d.group).filter(Boolean));
      }
    }
    init();
  }, [open, initialGroupId]);

  useEffect(() => {
    if (!selectedGroupId) return;
    async function loadParticipants() {
      const { data: memberData } = await supabase
        .from('group_members')
        .select('user_id, profile:profiles(id, email, full_name, avatar_url)')
        .eq('group_id', selectedGroupId);

      const { data: pendingData } = await supabase
        .from('pending_members')
        .select('id, name, email')
        .eq('group_id', selectedGroupId)
        .is('claimed_by', null);

      const items: ParticipantEntry[] = [];

      for (const m of memberData || []) {
        const p = m.profile as any;
        const existing = expense?.participants.find((ep) => ep.user_id === m.user_id);
        items.push({
          key: `u:${m.user_id}`,
          type: 'user',
          id: m.user_id,
          name: p?.full_name || p?.email || 'Unknown',
          avatar_url: p?.avatar_url,
          included: existing ? true : true,
          amount: existing ? existing.share_amount.toString() : '',
          percentage: existing?.share_percentage?.toString() ?? '',
        });
      }

      for (const pm of pendingData || []) {
        const existing = expense?.participants.find((ep) => ep.pending_member_id === pm.id);
        items.push({
          key: `p:${pm.id}`,
          type: 'pending',
          id: pm.id,
          name: pm.name,
          included: !!existing,
          amount: existing ? existing.share_amount.toString() : '',
          percentage: existing?.share_percentage?.toString() ?? '',
        });
      }

      setParticipants(items);
      if (!paidBy && currentUserId) setPaidBy(currentUserId);
    }
    loadParticipants();
  }, [selectedGroupId, currentUserId, expense]);

  function toggleParticipant(key: string) {
    setParticipants((prev) =>
      prev.map((p) => (p.key === key ? { ...p, included: !p.included } : p))
    );
  }

  function updateParticipant(key: string, field: 'amount' | 'percentage', value: string) {
    setParticipants((prev) =>
      prev.map((p) => (p.key === key ? { ...p, [field]: value } : p))
    );
  }

  function getIncluded() {
    return participants.filter((p) => p.included);
  }

  function computeShares(): Record<string, number> {
    const included = getIncluded();
    const total = parseFloat(amount) || 0;
    if (!total || !included.length) return {};

    if (splitType === 'equal') {
      return calculateEqualSplits(total, included.map((p) => p.key));
    }
    if (splitType === 'percentage') {
      const pcts: Record<string, number> = {};
      for (const p of included) pcts[p.key] = parseFloat(p.percentage) || 0;
      return calculatePercentageSplits(total, pcts);
    }
    const shares: Record<string, number> = {};
    for (const p of included) shares[p.key] = parseFloat(p.amount) || 0;
    return shares;
  }

  function validate(): string | null {
    if (!title.trim()) return 'Enter a title';
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return 'Enter a valid amount';
    if (!paidBy) return 'Select who paid';
    const included = getIncluded();
    if (!included.length) return 'Select at least one participant';
    if (splitType === 'percentage') {
      const total = included.reduce((s, p) => s + (parseFloat(p.percentage) || 0), 0);
      if (Math.abs(total - 100) > 0.5) return `Percentages must add up to 100% (currently ${total.toFixed(1)}%)`;
    }
    if (splitType === 'fixed') {
      const total = Object.values(computeShares()).reduce((s, v) => s + v, 0);
      if (Math.abs(total - amt) > 0.01) return `Amounts must add up to ₹${amt.toFixed(2)} (currently ₹${total.toFixed(2)})`;
    }
    return null;
  }

  async function addNewPerson() {
    if (!newPersonName.trim() || !selectedGroupId) return;
    setAddingPerson(true);
    const { data: { user } } = await supabase.auth.getUser();
    const id = crypto.randomUUID();

    const { error } = await supabase.from('pending_members').insert({
      id,
      group_id: selectedGroupId,
      name: newPersonName.trim(),
      created_by: user!.id,
    });

    if (error) {
      toast(error.message, 'error');
    } else {
      setParticipants((prev) => [...prev, {
        key: `p:${id}`,
        type: 'pending',
        id,
        name: newPersonName.trim(),
        included: true,
        amount: '',
        percentage: '',
      }]);
      setNewPersonName('');
      setShowAddPerson(false);
    }
    setAddingPerson(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validate();
    if (err) { toast(err, 'error'); return; }

    setLoading(true);
    const shares = computeShares();
    const included = getIncluded();

    try {
      const participantsData = included.map((p) => ({
        user_id: p.type === 'user' ? p.id : null,
        pending_member_id: p.type === 'pending' ? p.id : null,
        share_amount: shares[p.key],
        share_percentage: splitType === 'percentage' ? parseFloat(p.percentage) || null : null,
      }));

      if (isEditing && expense) {
        const { error: expErr } = await supabase
          .from('expenses')
          .update({ title, amount: parseFloat(amount), date, paid_by: paidBy, split_type: splitType, notes: notes || null })
          .eq('id', expense.id);
        if (expErr) throw expErr;

        await supabase.from('expense_participants').delete().eq('expense_id', expense.id);
        const { error: partErr } = await supabase.from('expense_participants').insert(
          participantsData.map((p) => ({ ...p, expense_id: expense.id }))
        );
        if (partErr) throw partErr;
        toast('Expense updated');
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: expData, error: expErr } = await supabase
          .from('expenses')
          .insert({
            group_id: selectedGroupId,
            title, amount: parseFloat(amount), date,
            paid_by: paidBy, split_type: splitType,
            notes: notes || null, created_by: user!.id,
          })
          .select('id')
          .single();
        if (expErr) throw expErr;

        const { error: partErr } = await supabase.from('expense_participants').insert(
          participantsData.map((p) => ({ ...p, expense_id: expData.id }))
        );
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
    setParticipants([]); setShowAddPerson(false); setNewPersonName('');
    if (!initialGroupId) { setStep('group'); setSelectedGroupId(null); }
  }

  const shares = computeShares();
  const realMembers = participants.filter((p) => p.type === 'user');

  // ── Group picker step ──────────────────────────────────────
  if (step === 'group') {
    return (
      <Modal open={open} onClose={onClose} title="Select Group">
        <div className="p-4 space-y-2">
          {groups.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-8">
              You&apos;re not in any groups yet.
            </p>
          )}
          {groups.map((g) => (
            <button
              key={g.id}
              onClick={() => { setSelectedGroupId(g.id); setStep('form'); }}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 border border-gray-100 text-left"
            >
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-lg font-bold">
                {g.name[0]}
              </div>
              <p className="font-medium text-gray-900">{g.name}</p>
            </button>
          ))}
        </div>
      </Modal>
    );
  }

  // ── Expense form step ──────────────────────────────────────
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

        {/* Paid by — only real members can be payer */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">Paid by</label>
          <div className="flex gap-2 flex-wrap">
            {realMembers.map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => setPaidBy(m.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition-colors ${
                  paidBy === m.id
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-200'
                }`}
              >
                <Avatar src={m.avatar_url} name={m.name} size="xs" />
                {m.name.split(' ')[0]}
              </button>
            ))}
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
            Participants ({getIncluded().length}/{participants.length})
          </label>
          <div className="space-y-2">
            {participants.map((p) => {
              const share = shares[p.key];
              return (
                <div key={p.key} className="flex items-center gap-3 p-2.5 rounded-xl border border-gray-100 bg-gray-50">
                  <button
                    type="button"
                    onClick={() => toggleParticipant(p.key)}
                    className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border transition-colors ${
                      p.included ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'
                    }`}
                  >
                    {p.included && <Check size={12} className="text-white" />}
                  </button>
                  <Avatar src={p.type === 'user' ? p.avatar_url : null} name={p.name} size="sm" />
                  <span className="flex-1 text-sm font-medium text-gray-900 min-w-0 truncate">
                    {p.name}
                    {p.type === 'pending' && (
                      <span className="ml-1.5 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-normal">pending</span>
                    )}
                  </span>

                  {p.included && splitType === 'percentage' && (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={p.percentage}
                        onChange={(e) => updateParticipant(p.key, 'percentage', e.target.value)}
                        className="w-16 text-sm border border-gray-200 rounded-lg px-2 py-1 text-right"
                        placeholder="0"
                        min="0" max="100" step="0.1"
                      />
                      <span className="text-gray-500 text-sm">%</span>
                    </div>
                  )}
                  {p.included && splitType === 'fixed' && (
                    <div className="flex items-center gap-1">
                      <span className="text-gray-500 text-sm">₹</span>
                      <input
                        type="number"
                        value={p.amount}
                        onChange={(e) => updateParticipant(p.key, 'amount', e.target.value)}
                        className="w-20 text-sm border border-gray-200 rounded-lg px-2 py-1 text-right"
                        placeholder="0.00"
                        min="0" step="0.01"
                      />
                    </div>
                  )}
                  {p.included && splitType === 'equal' && share !== undefined && (
                    <span className="text-sm text-gray-500">₹{share.toFixed(2)}</span>
                  )}
                  {!p.included && <span className="text-xs text-gray-400">Excluded</span>}
                </div>
              );
            })}

            {/* Add person inline */}
            {showAddPerson ? (
              <div className="flex items-center gap-2 p-2.5 rounded-xl border-2 border-blue-200 bg-blue-50">
                <input
                  type="text"
                  value={newPersonName}
                  onChange={(e) => setNewPersonName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addNewPerson())}
                  placeholder="Their name (e.g. Priya)"
                  className="flex-1 bg-transparent text-sm outline-none text-gray-900 placeholder:text-gray-400"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={addNewPerson}
                  disabled={!newPersonName.trim() || addingPerson}
                  className="text-blue-600 disabled:opacity-40 font-medium text-sm"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAddPerson(false); setNewPersonName(''); }}
                  className="text-gray-400"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowAddPerson(true)}
                className="flex items-center gap-2 w-full p-2.5 rounded-xl border border-dashed border-gray-300 text-gray-500 text-sm hover:border-blue-400 hover:text-blue-600 transition-colors"
              >
                <UserPlus size={14} />
                Add person who hasn&apos;t joined yet
              </button>
            )}
          </div>
        </div>

        <Input
          label="Notes (optional)"
          placeholder="Add a note..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" fullWidth onClick={onClose}>Cancel</Button>
          <Button type="submit" fullWidth loading={loading}>
            {isEditing ? 'Update' : 'Add Expense'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
