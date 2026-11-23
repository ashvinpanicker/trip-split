export type SplitType = 'equal' | 'percentage' | 'fixed';
export type MemberRole = 'admin' | 'member';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  upi_id?: string | null;
  pay_methods?: unknown;
  created_at: string;
  updated_at: string;
}

export interface PendingMember {
  id: string;
  group_id: string;
  name: string;
  email: string | null;
  invite_token: string;
  claimed_by: string | null;
  claimed_at: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Group {
  id: string;
  name: string;
  description: string | null;
  created_by: string | null;
  invite_code: string;
  simplify_debts?: boolean;
  /** loops | direct | fewest (see SETTLE_MODES) */
  settle_mode?: string | null;
  currency?: string;
  kind?: string;
  track_only?: boolean;
  archived_at?: string | null;
  created_at: string;
  updated_at: string;
  member_count?: number;
  total_expenses?: number;
  members?: GroupMember[];
  pending_members?: PendingMember[];
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: MemberRole;
  joined_at: string;
  profile?: Profile;
}

export interface Expense {
  id: string;
  group_id: string;
  title: string;
  amount: number;
  date: string;
  paid_by: string | null;
  paid_by_pending?: string | null;
  category?: string | null;
  split_type: SplitType;
  notes: string | null;
  /** Itemized bill (people are person ids), kept so the bill can be re-edited */
  items?: { items: { name: string; price: number; people: string[] }[]; extra: number } | null;
  /** Paid in another currency: what was really paid, and the rate used to convert it */
  fx?: { currency: string; amount: number; rate: number } | null;
  receipt_path?: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  payer?: Profile | null;
  payer_pending?: { id: string; name: string } | null;
  participants?: ExpenseParticipant[];
}

export interface ExpenseParticipant {
  id: string;
  expense_id: string;
  user_id: string | null;
  pending_member_id: string | null;
  share_amount: number;
  share_percentage: number | null;
  profile?: Profile | null;
  pending_member?: Pick<PendingMember, 'id' | 'name'> | null;
}

export interface SettlementRecord {
  id: string;
  group_id: string;
  from_person: string;
  to_person: string;
  amount: number;
  date: string;
  note: string | null;
  created_by: string | null;
  created_at: string;
  /** The expense this pays back, when marked from the expense itself */
  expense_id?: string | null;
}

export interface Balance {
  person_id: string;
  user_name: string;
  avatar_url: string | null;
  net_balance: number;
  is_pending?: boolean;
}

export interface Settlement {
  from_id: string;
  from_name: string;
  to_id: string;
  to_name: string;
  amount: number;
}

// Unified participant entry used in the expense form
export interface ParticipantEntry {
  key: string;         // 'u:USER_ID' or 'p:PENDING_ID'
  type: 'user' | 'pending';
  id: string;
  name: string;
  avatar_url?: string | null;
  included: boolean;
  amount: string;
  percentage: string;
  /** Counts as this many people in an equal split (trip setting, default 1) */
  weight?: number;
}
