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
  user_id: string;
  share_amount: number;
  share_percentage: number | null;
  profile?: Profile;
}

export interface Balance {
  user_id: string;
  user_name: string;
  avatar_url: string | null;
  net_balance: number; // positive = owed money, negative = owes money
}

export interface Settlement {
  from_user_id: string;
  from_user_name: string;
  to_user_id: string;
  to_user_name: string;
  amount: number;
}

export interface ExpenseFormData {
  title: string;
  amount: string;
  date: string;
  paid_by: string;
  split_type: SplitType;
  notes: string;
  participants: ParticipantInput[];
}

export interface ParticipantInput {
  user_id: string;
  amount?: string;
  percentage?: string;
  included: boolean;
}
