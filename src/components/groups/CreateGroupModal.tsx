'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';

interface CreateGroupModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CreateGroupModal({ open, onClose, onSuccess }: CreateGroupModalProps) {
  const { toast } = useToast();
  const supabase = createClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Generate the ID client-side so we can add the member immediately
    // without needing to SELECT the group back first (which would fail RLS
    // because the user isn't a member yet at that point).
    const groupId = crypto.randomUUID();

    const { error: groupErr } = await supabase
      .from('groups')
      .insert({ id: groupId, name: name.trim(), description: description.trim() || null, created_by: user.id });

    if (groupErr) {
      toast(groupErr.message, 'error');
      setLoading(false);
      return;
    }

    const { error: memberErr } = await supabase.from('group_members').insert({
      group_id: groupId,
      user_id: user.id,
      role: 'admin',
    });

    if (memberErr) {
      toast(memberErr.message, 'error');
    } else {
      toast(`Group "${name}" created!`);
      setName('');
      setDescription('');
      onSuccess?.();
      onClose();
    }
    setLoading(false);
  }

  return (
    <Modal open={open} onClose={onClose} title="Create Group">
      <form onSubmit={handleCreate} className="p-4 space-y-4">
        <Input
          label="Group name"
          placeholder="e.g. Goa Trip 2025"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
        />
        <Input
          label="Description (optional)"
          placeholder="What's this group for?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <div className="flex gap-3">
          <Button type="button" variant="secondary" fullWidth onClick={onClose}>Cancel</Button>
          <Button type="submit" fullWidth loading={loading}>Create</Button>
        </div>
      </form>
    </Modal>
  );
}
