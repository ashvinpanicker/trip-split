'use client';

import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import Card from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/lib/supabase/client';

interface AddPeopleCardProps {
  groupId: string;
  existingNames: string[];
  onAdded: () => void;
}

/** Add friends by name before they join. Accepts one name or a comma/newline-separated list. */
export default function AddPeopleCard({ groupId, existingNames, onAdded }: AddPeopleCardProps) {
  const { toast } = useToast();
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const taken = new Set(existingNames.map((n) => n.trim().toLowerCase()));
    const names = [...new Set(value.split(/[,\n]/).map((n) => n.trim()).filter(Boolean))]
      .filter((n) => !taken.has(n.toLowerCase()));
    if (names.length === 0) { setValue(''); return; }

    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('pending_members')
      .insert(names.map((name) => ({ group_id: groupId, name, created_by: user!.id })));
    setSaving(false);

    if (error) { toast(error.message, 'error'); return; }
    toast(names.length === 1 ? `Added ${names[0]}` : `Added ${names.length} people`);
    setValue('');
    onAdded();
  }

  return (
    <Card>
      <p className="text-sm font-semibold text-gray-900">Add people by name</p>
      <p className="text-xs text-gray-500 mb-3">
        They&apos;ll show up in splits right away, and pick their name when they open the group link.
      </p>
      <form onSubmit={add} className="flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Jose, Rahul, Kiran…"
          autoCapitalize="words"
          className="flex-1 min-w-0 h-10 px-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={saving || !value.trim()}
          className="shrink-0 h-10 px-4 rounded-xl bg-blue-600 text-white text-sm font-medium flex items-center gap-1.5 disabled:opacity-50"
        >
          <UserPlus size={16} /> {saving ? 'Adding…' : 'Add'}
        </button>
      </form>
    </Card>
  );
}
