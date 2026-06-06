export type SplitType = 'equal' | 'percentage' | 'fixed';
export type MemberRole = 'admin' | 'member';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
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
  paid_by: string;
  split_type: SplitType;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  payer?: Profile;
  participants?: ExpenseParticipant[];
}

export interface ExpenseParticipant {
  id: string;
  expense_id: string;
  user_id: string | null;
  pending_member_id: string | null;
  share_amount: number;
  share_percentage: number | null;
  profile?: Profile;
  pending_member?: PendingMember;
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
}
