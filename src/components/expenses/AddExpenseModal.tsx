'use client';

import { copayNote, paidBackNote } from '@/lib/utils/paidBack';
import { memberName } from '@/lib/utils/people';
import { enqueue, isOffline, sendPayments } from '@/lib/outbox';
import { useT } from '@/lib/i18n';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Calendar, Check, UserPlus, X } from 'lucide-react';
import { createClient, getAuthUser } from '@/lib/supabase/client';
import { computeShares as computeSharesFor, validateSplit, itemizedShares, CATEGORIES, CURRENCIES, currencySymbol, formatCurrency, getActiveCurrency, shortName } from '@/lib/utils/balance';
import ItemizedEditor, { type DraftBill } from './ItemizedEditor';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Avatar from '@/components/ui/Avatar';
import { useFeatures } from '@/hooks/useFeatures';
import { convertSplit, fetchRate, peggedRate, readTripRates } from '@/lib/utils/fx';
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
    paid_by: string | null;
    paid_by_pending?: string | null;
    category?: string | null;
    items?: { items: { name: string; price: number; people: string[] }[]; extra: number } | null;
    fx?: { currency: string; amount: number; rate: number } | null;
    split_type: SplitType;
    notes: string | null;
    participants: { user_id: string | null; pending_member_id: string | null; share_amount: number; share_percentage: number | null }[];
  } | null;
}

export default function AddExpenseModal({
  open, onClose, groupId: initialGroupId, onSuccess, expense,
}: AddExpenseModalProps) {
  const { toast } = useToast();
  const t = useT();
  const supabase = createClient();
  const isEditing = !!expense;

  const [step, setStep] = useState<'group' | 'form'>(initialGroupId ? 'form' : 'group');
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(initialGroupId);
  // Money in this form uses the chosen group's currency (falls back to the one on screen)
  const cur = groups.find((g) => g.id === selectedGroupId)?.currency || getActiveCurrency();
  // Paid in another currency? Shares are entered in that currency and converted to `cur` on save
  const fx0 = expense?.fx ?? null;
  const [payCur, setPayCur] = useState<string>(fx0?.currency ?? '');
  const foreign = !!payCur && payCur !== cur;
  const effCur = foreign ? payCur : cur;
  const sym = currencySymbol(effCur);
  const [fxOk, setFxOk] = useState(false); // multi-currency is set up in the database
  const [tripRates, setTripRates] = useState<Record<string, number>>({});
  const [rate, setRate] = useState(fx0 ? String(fx0.rate) : '');
  const [rateNote, setRateNote] = useState('');
  const [keepRate, setKeepRate] = useState(false);
  const [currentUserId, setCurrentUserId] = useState('');
  const [loading, setLoading] = useState(false);

  // Form
  const [title, setTitle] = useState(expense?.title ?? '');
  const [amount, setAmount] = useState((expense?.fx?.amount ?? expense?.amount)?.toString() ?? '');
  const [date, setDate] = useState(expense?.date ?? format(new Date(), 'yyyy-MM-dd'));
  const [paidBy, setPaidBy] = useState(expense?.paid_by ?? expense?.paid_by_pending ?? '');
  const [category, setCategory] = useState(expense?.category ?? 'food');
  const [splitType, setSplitType] = useState<SplitType>(expense?.split_type ?? 'equal');
  const [notes, setNotes] = useState(expense?.notes ?? '');
  // Card swiped at the restaurant and everyone paid back right there: record it, but nobody owes anything
  const [settledNow, setSettledNow] = useState(false);
  // Two cards, one bill: someone else paid part of it (saved as their payment to the main payer)
  const [copay, setCopay] = useState<{ person: string; amount: string } | null>(null);
  // Itemized bill mode (saved as an exact split, with the items kept for re-editing)
  const [itemMode, setItemMode] = useState(!!expense?.items);
  const emptyBill = (): DraftBill => ({ items: [{ name: '', price: '', people: [] }], extra: '' });
  const [bill, setBill] = useState<DraftBill>(
    expense?.items
      ? { items: expense.items.items.map((i) => ({ name: i.name, price: String(i.price), people: i.people })), extra: expense.items.extra ? String(expense.items.extra) : '' }
      : emptyBill()
  );
  const [participants, setParticipants] = useState<ParticipantEntry[]>([]);
  // Simple by default: equal split; other split types one tap away (always shown with "More ways to split")
  const features = useFeatures(false);
  const [moreSplits, setMoreSplits] = useState(!!expense && (expense.split_type !== 'equal' || !!expense.items));
  const showSplitTypes = features.splits || moreSplits;
  // % is rarely needed: only with "More ways to split" on (or when editing a % split)
  const splitTypes: SplitType[] = features.splits || expense?.split_type === 'percentage' ? ['equal', 'percentage', 'fixed'] : ['equal', 'fixed'];

  // Add person inline
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [newPersonName, setNewPersonName] = useState('');
  const [addingPerson, setAddingPerson] = useState(false);

  useEffect(() => {
    if (!open) return;
    async function init() {
      const user = await getAuthUser(supabase);
      if (!user) return;
      setCurrentUserId(user.id);

      if (!initialGroupId) {
        const { data } = await supabase
          .from('group_members')
          .select('group:groups(id, name, description, invite_code, currency, created_at, updated_at, created_by)')
          .eq('user_id', user.id);
        if (data) setGroups(data.map((d: any) => d.group).filter(Boolean));
      }
    }
    init();
  }, [open, initialGroupId]);

  // Reload every time the sheet opens — the list can change (new names, people joining)
  // and the first load can race the auth session and come back empty.
  useEffect(() => {
    if (!open || !selectedGroupId) return;
    async function loadParticipants() {
      const { data: memberData } = await supabase
        .from('group_members')
        .select('*, profile:profiles(id, email, full_name, avatar_url)') // * picks up weight once the trip has it
        .eq('group_id', selectedGroupId);

      const { data: pendingData } = await supabase
        .from('pending_members')
        .select('*')
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
          name: memberName({ nickname: m.nickname, profile: p }),
          avatar_url: p?.avatar_url,
          weight: m.weight ?? 1,
          included: expense ? !!existing : true,
          amount: existing ? (fx0 ? +(existing.share_amount / fx0.rate).toFixed(2) : existing.share_amount).toString() : '',
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
          weight: pm.weight ?? 1,
          included: expense ? !!existing : true,
          amount: existing ? (fx0 ? +(existing.share_amount / fx0.rate).toFixed(2) : existing.share_amount).toString() : '',
          percentage: existing?.share_percentage?.toString() ?? '',
        });
      }

      setParticipants(items);
      if (!paidBy && currentUserId) setPaidBy(currentUserId);
    }
    loadParticipants();
  }, [open, selectedGroupId, currentUserId, expense]);

  useEffect(() => {
    if (!open || !selectedGroupId) return;
    supabase.from('groups').select('fx_rates').eq('id', selectedGroupId).single().then(({ data, error }) => {
      setFxOk(!error);
      if (!error) setTripRates(readTripRates((data as any)?.fx_rates));
    });
    if (!expense) {
      try { setPayCur(localStorage.getItem(`tripsplit:paycur:${selectedGroupId}`) || ''); } catch {}
    }
  }, [open, selectedGroupId]);

  // Rate for the paid currency: the trip's fixed rate, else pegged, else that day's market rate
  useEffect(() => {
    if (!foreign) { setRateNote(''); return; }
    if (fx0 && fx0.currency === payCur && rate) { setRateNote('Rate saved with this expense'); return; }
    const fixed = tripRates[payCur];
    if (fixed) { setRate(String(fixed)); setRateNote('Trip rate'); return; }
    let live = true;
    setRateNote('Getting today\u2019s rate…');
    fetchRate(payCur, cur, date).then((r) => {
      if (!live) return;
      if (r) { setRate(String(+r.toPrecision(6))); setRateNote(peggedRate(payCur, cur) ? 'Fixed by law' : `Market rate for ${date}`); }
      else setRateNote('Couldn\u2019t get a rate. Enter the one you got.');
    });
    return () => { live = false; };
  }, [payCur, cur, date, tripRates]);

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

  function splitEntries() {
    return getIncluded().map((p) => ({ key: p.key, percentage: p.percentage, amount: p.amount, weight: p.weight }));
  }

  function billResult() {
    return itemizedShares(
      bill.items.map((i) => ({ name: i.name.trim(), price: parseFloat(i.price) || 0, people: i.people })),
      parseFloat(bill.extra) || 0
    );
  }

  function computeShares(): Record<string, number> {
    if (itemMode) {
      // itemizedShares works in person ids; the form keys people by p.key
      const byId = billResult().shares;
      return Object.fromEntries(participants.filter((p) => byId[p.id] !== undefined).map((p) => [p.key, byId[p.id]]));
    }
    return computeSharesFor(splitType, parseFloat(amount) || 0, splitEntries());
  }

  function validate(): string | null {
    if (!title.trim()) return 'Enter a title';
    if (!paidBy) return 'Select who paid';
    if (itemMode) {
      if (!bill.items.some((i) => (parseFloat(i.price) || 0) > 0 && i.people.length)) return 'Add at least one item with a price and who had it';
      if (bill.items.some((i) => (parseFloat(i.price) || 0) > 0 && !i.people.length)) return 'Every item needs at least one person';
      const shares = computeShares();
      return validateSplit('fixed', billResult().total, Object.entries(shares).map(([key, amount]) => ({ key, amount })));
    }
    return validateSplit(splitType, parseFloat(amount) || 0, splitEntries());
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
    const included = itemMode ? participants.filter((p) => shares[p.key] !== undefined) : getIncluded();
    const total = itemMode ? billResult().total : parseFloat(amount);

    try {
      const payer = participants.find((p) => p.id === paidBy);
      const payerFields = payer?.type === 'pending'
        ? { paid_by: null, paid_by_pending: paidBy }
        : { paid_by: paidBy, paid_by_pending: null };

      const fxRate = foreign ? parseFloat(rate) : 1;
      if (foreign && !(fxRate > 0)) throw new Error(`Enter the ${payCur} to ${cur} rate`);
      // Balances stay in the trip currency: convert the total and every share (they still add up exactly)
      const conv = convertSplit(total, included.map((p) => shares[p.key]), fxRate);
      const participantsData = included.map((p, k) => ({
        user_id: p.type === 'user' ? p.id : null,
        pending_member_id: p.type === 'pending' ? p.id : null,
        share_amount: conv.shares[k],
        share_percentage: !itemMode && splitType === 'percentage' ? parseFloat(p.percentage) || null : null,
      }));

      // One atomic call: expense + split saved together, and the DB rejects splits that don't add up
      const args = {
        p_expense_id: isEditing && expense ? expense.id : null,
        p_group_id: selectedGroupId,
        p_title: title.trim(),
        p_amount: conv.amount,
        p_date: date,
        p_paid_by: payerFields.paid_by,
        p_paid_by_pending: payerFields.paid_by_pending,
        p_category: category,
        p_split_type: itemMode ? 'fixed' : splitType,
        p_notes: notes || null,
        p_participants: participantsData,
        p_items: itemMode
          ? {
              items: bill.items.filter((i) => (parseFloat(i.price) || 0) > 0).map((i) => ({ name: i.name.trim(), price: parseFloat(i.price), people: i.people })),
              extra: parseFloat(bill.extra) || 0,
            }
          : null,
        ...(foreign ? { p_fx: { currency: payCur, amount: total, rate: fxRate } } : {}),
      };
      // Card swiped and everyone paid back on the spot: one payment per person, tied to the expense
      const copayAmount = copay ? Math.round((parseFloat(copay.amount) || 0) * fxRate * 100) / 100 : 0;
      if (copay && (!copay.person || copay.person === paidBy || !(copayAmount > 0) || copayAmount >= conv.amount)) {
        throw new Error('Check who else paid and how much (less than the total)');
      }
      const copayRows = copay && !isEditing ? [{
        group_id: selectedGroupId!, from_person: copay.person, to_person: paidBy, amount: copayAmount, date,
        note: copayNote(title.trim()), created_by: currentUserId,
      }] : [];
      const paybacks = settledNow && !isEditing
        ? included
            .map((p, k) => ({ p, share: conv.shares[k] }))
            .filter(({ p, share }) => p.id !== paidBy && share > 0)
            .map(({ p, share }) => ({
              group_id: selectedGroupId!, from_person: p.id, to_person: paidBy, amount: share, date,
              note: paidBackNote(title.trim()), created_by: currentUserId,
            }))
        : [];
      const linked = [...copayRows, ...paybacks];
      const { data: savedId, error } = navigator.onLine
        ? await supabase.rpc('save_expense', args)
        : { data: null, error: { message: 'offline' } };
      if (error && isOffline(error)) {
        enqueue({ kind: 'expense', groupId: selectedGroupId!, label: title.trim(), amount: conv.amount, args, paybacks: linked });
        toast('No signal. Saved on this phone, it’ll sync when you’re back online.');
        onSuccess?.(); onClose(); resetForm();
        return;
      }
      if (error) throw error;
      if (linked.length && savedId) {
        const { error: payErr } = await sendPayments(supabase, linked.map((r) => ({ ...r, expense_id: savedId as string })));
        if (payErr) toast(`Expense saved, but the paybacks didn’t: ${payErr.message}`, 'error');
      }
      if (foreign && keepRate) await supabase.rpc('set_trip_rate', { p_group_id: selectedGroupId, p_currency: payCur, p_rate: fxRate });
      try { localStorage.setItem(`tripsplit:paycur:${selectedGroupId}`, foreign ? payCur : ''); } catch {}
      toast(isEditing ? t('add.updated') : t('add.added'));

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
    setPaidBy(''); setSplitType('equal'); setNotes(''); setCategory('food'); setSettledNow(false); setCopay(null);
    setItemMode(false); setBill(emptyBill());
    setParticipants([]); setShowAddPerson(false); setNewPersonName('');
    if (!initialGroupId) { setStep('group'); setSelectedGroupId(null); }
  }

  const shares = computeShares();

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
    <Modal open={open} onClose={onClose} title={isEditing ? t('add.editTitle') : t('add.title')} size="lg">
      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        <Input
          label={t('add.what')}
          placeholder={t('add.whatHint')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label={t('add.amount', { sym })}
            type="number"
            inputMode="decimal"
            placeholder="0.00"
            value={itemMode ? (billResult().total ? billResult().total.toFixed(2) : '') : amount}
            onChange={(e) => setAmount(e.target.value)}
            readOnly={itemMode}
            leftIcon={<span className="text-sm font-medium">{sym}</span>}
            min="0.01"
            step="0.01"
            required
          />
          <Input
            label={t('add.date')}
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            leftIcon={<Calendar size={14} />}
            required
          />
        </div>

        {fxOk && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <label htmlFor="paycur" className="text-gray-700">{t('add.paidIn')}</label>
              <select
                id="paycur"
                value={effCur}
                onChange={(e) => { setPayCur(e.target.value === cur ? '' : e.target.value); setKeepRate(false); if (fx0?.currency !== e.target.value) setRate(''); }}
                className="h-9 rounded-lg border border-gray-200 bg-white px-2 text-gray-900"
              >
                {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code} · {c.label}</option>)}
              </select>
            </div>
            {foreign && (
              <div className="rounded-xl bg-gray-50 p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-700 whitespace-nowrap">1 {payCur} =</span>
                  <input
                    type="number" inputMode="decimal" step="any" min="0" aria-label={`${cur} per ${payCur}`}
                    value={rate} onChange={(e) => { setRate(e.target.value); setRateNote('Your rate'); }}
                    className="w-28 h-9 rounded-lg border border-gray-200 bg-white px-2 text-gray-900"
                  />
                  <span className="text-gray-700">{cur}</span>
                  <span className="ml-auto text-gray-900 font-medium tabular-nums">
                    {(() => { const t = itemMode ? billResult().total : parseFloat(amount); const r = parseFloat(rate); return t > 0 && r > 0 ? `≈ ${formatCurrency(t * r, cur)}` : ''; })()}
                  </span>
                </div>
                {rateNote && <p className="text-xs text-gray-500">{rateNote}</p>}
                {tripRates[payCur] !== parseFloat(rate) && parseFloat(rate) > 0 && (
                  <label className="flex items-center gap-2 text-xs text-gray-600">
                    <input type="checkbox" checked={keepRate} onChange={(e) => setKeepRate(e.target.checked)} />
                    {t('add.keepRate')}
                  </label>
                )}
              </div>
            )}
          </div>
        )}

        {/* Category */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">{t('add.category')}</label>
          <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1 no-scrollbar">
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setCategory(c.key)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full border text-sm whitespace-nowrap transition-colors ${
                  category === c.key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200'
                }`}
              >
                <span>{c.emoji}</span>{c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Paid by — anyone in the group, including people who haven't signed up */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">{t('add.paidBy')}</label>
          <div className="flex gap-2 flex-wrap">
            {participants.map((m) => (
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
                {m.id === currentUserId ? 'You' : shortName(m.name, participants.map((x) => x.name))}
              </button>
            ))}
          </div>
        </div>

        {features.payments && !isEditing && paidBy && (
          copay ? (
            <div className="rounded-xl bg-gray-50 px-3 py-2.5 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-900">Someone else paid part of it</p>
                <button type="button" onClick={() => setCopay(null)} className="text-xs text-gray-500">Remove</button>
              </div>
              <div className="flex gap-2">
                <select
                  value={copay.person}
                  onChange={(e) => setCopay({ ...copay, person: e.target.value })}
                  className="flex-1 min-w-0 h-10 rounded-lg border border-gray-200 bg-white px-2 text-sm text-gray-900"
                >
                  <option value="">Who?</option>
                  {participants.filter((m) => m.id !== paidBy).map((m) => <option key={m.key} value={m.id}>{m.id === currentUserId ? t('you') : m.name}</option>)}
                </select>
                <input
                  type="number" inputMode="decimal" step="0.01" min="0" placeholder="How much"
                  value={copay.amount}
                  onChange={(e) => setCopay({ ...copay, amount: e.target.value })}
                  className="w-28 h-10 rounded-lg border border-gray-200 bg-white px-2 text-sm text-gray-900"
                />
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setCopay({ person: '', amount: '' })} className="text-sm font-medium text-blue-600 -mt-2">
              + Someone else paid part of it
            </button>
          )
        )}

        {features.payments && !isEditing && paidBy && (
          <label className="flex items-start gap-2.5 rounded-xl bg-gray-50 px-3 py-2.5 cursor-pointer">
            <input type="checkbox" checked={settledNow} onChange={(e) => setSettledNow(e.target.checked)} className="mt-0.5 h-4 w-4 accent-blue-600" />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-gray-900">
                {t('add.settledNow', { name: paidBy === currentUserId ? t('you').toLowerCase() : participants.find((m) => m.id === paidBy)?.name.split(' ')[0] ?? '' })}
              </span>
              <span className="block text-xs text-gray-500">{t('add.settledHint')}</span>
            </span>
          </label>
        )}

        {/* Split type */}
        {!showSplitTypes ? (
          <p className="text-sm text-gray-700">
            {t('add.splitEqually')}{' '}
            <button type="button" onClick={() => setMoreSplits(true)} className="font-medium text-blue-600">
              {t('add.change')}
            </button>
          </p>
        ) : (
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">{t('add.splitType')}</label>
          <div className="flex gap-2">
            {splitTypes.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => { setSplitType(type); setItemMode(false); }}
                className={`flex-1 min-w-0 py-2 rounded-xl border text-sm font-medium capitalize transition-colors ${
                  !itemMode && splitType === type
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-200'
                }`}
              >
                {type === 'percentage' ? '%' : type === 'fixed' ? t('add.exact') : t('add.equal')}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setItemMode(true);
                // New items default to everyone on the trip
                setBill((b) => b.items.length === 1 && !b.items[0].name && !b.items[0].price
                  ? { ...b, items: [{ name: '', price: '', people: participants.map((p) => p.id) }] } : b);
              }}
              className={`flex-1 min-w-0 py-2 rounded-xl border text-sm font-medium transition-colors ${
                itemMode ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200'
              }`}
            >
              {t('add.items')}
            </button>
          </div>
        </div>
        )}

        {!itemMode && splitType === 'equal' && getIncluded().some((p) => (p.weight ?? 1) > 1) && (
          <p className="text-xs text-gray-500 -mt-2">
            {getIncluded().filter((p) => (p.weight ?? 1) > 1).map((p) => `${p.name.split(' ')[0]} counts as ${p.weight}`).join(', ')} (trip setting)
          </p>
        )}

        {/* Participants */}
        {itemMode ? (
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Items on the bill</label>
            <ItemizedEditor
              people={participants.map((p) => ({ id: p.id, name: p.id === currentUserId ? `${p.name} (you)` : p.name }))}
              bill={bill}
              onChange={setBill}
              currency={effCur}
              symbol={sym}
            />
          </div>
        ) : (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">
              {t('add.splitBetween')} ({getIncluded().length}/{participants.length})
            </label>
            <button
              type="button"
              onClick={() => {
                const all = participants.every((p) => p.included);
                setParticipants((prev) => prev.map((p) => ({ ...p, included: !all })));
              }}
              className="text-xs font-medium text-blue-600"
            >
              {participants.every((p) => p.included) ? 'Select none' : 'Select all'}
            </button>
          </div>
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
                        className="w-16 text-sm border border-gray-200 rounded-lg px-2 py-1 text-right bg-white text-gray-900"
                        placeholder="0"
                        min="0" max="100" step="0.1"
                      />
                      <span className="text-gray-500 text-sm">%</span>
                    </div>
                  )}
                  {p.included && splitType === 'fixed' && (
                    <div className="flex items-center gap-1">
                      <span className="text-gray-500 text-sm">{sym}</span>
                      <input
                        type="number"
                        value={p.amount}
                        onChange={(e) => updateParticipant(p.key, 'amount', e.target.value)}
                        className="w-20 text-sm border border-gray-200 rounded-lg px-2 py-1 text-right bg-white text-gray-900"
                        placeholder="0.00"
                        min="0" step="0.01"
                      />
                    </div>
                  )}
                  {p.included && splitType === 'equal' && share !== undefined && (
                    <span className="text-sm text-gray-500">{formatCurrency(share, effCur)}</span>
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
                  className="flex-1 min-w-0 bg-transparent text-sm outline-none text-gray-900 placeholder:text-gray-400"
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
                Add someone (no account needed)
              </button>
            )}
          </div>
        </div>
        )}

        <Input
          label={t('add.notes')}
          placeholder="Add a note..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" fullWidth onClick={onClose}>Cancel</Button>
          <Button type="submit" fullWidth loading={loading}>
            {isEditing ? t('add.update') : t('add.save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
