/** Group types: each sets sensible defaults. Who paid is always recorded, so a family can switch settling on later. */
export type GroupKind = 'friends' | 'family' | 'couple' | 'work' | 'flatmates' | 'other';

export const GROUP_KINDS: { key: GroupKind; label: string; emoji: string; hint: string; trackOnly: boolean }[] = [
  { key: 'friends', label: 'Friends', emoji: '🎒', hint: 'Split costs and settle up', trackOnly: false },
  { key: 'family', label: 'Family', emoji: '👨‍👩‍👧', hint: 'Track spending together, no settling up', trackOnly: true },
  { key: 'couple', label: 'Couple', emoji: '💑', hint: 'Split as two, settle whenever', trackOnly: false },
  { key: 'work', label: 'Work trip', emoji: '💼', hint: 'Receipts and a CSV for reimbursement', trackOnly: false },
  { key: 'flatmates', label: 'Flatmates', emoji: '🏠', hint: 'Shared bills at home', trackOnly: false },
  { key: 'other', label: 'Other', emoji: '🧾', hint: 'Anything else', trackOnly: false },
];

export const groupKind = (k?: string | null) => GROUP_KINDS.find((g) => g.key === k) ?? GROUP_KINDS[0];
