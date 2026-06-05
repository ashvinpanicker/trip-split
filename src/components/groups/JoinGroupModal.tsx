'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';

interface JoinGroupModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialCode?: string;
}

export default function JoinGroupModal({ open, onClose, onSuccess, initialCode = '' }: JoinGroupModalProps) {
  const { toast } = useToast();
  const supabase = createClient();
  const [code, setCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Find group by invite code
    const { data: group, error: groupErr } = await supabase
      .from('groups')
      .select('id, name')
      .eq('invite_code', code.trim().toLowerCase())
      .single();

    if (groupErr || !group) {
      toast('Invalid invite code', 'error');
      setLoading(false);
      return;
    }

    // Check if already a member
    const { data: existing } = await supabase
      .from('group_members')
      .select('id')
      .eq('group_id', group.id)
      .eq('user_id', user.id)
      .single();

    if (existing) {
      toast('You are already in this group', 'error');
      setLoading(false);
      return;
    }

    const { error: memberErr } = await supabase.from('group_members').insert({
      group_id: group.id,
      user_id: user.id,
      role: 'member',
    });

    if (memberErr) {
      toast(memberErr.message, 'error');
    } else {
      toast(`Joined "${group.name}"!`);
      setCode('');
      onSuccess?.();
      onClose();
    }
    setLoading(false);
  }

  return (
    <Modal open={open} onClose={onClose} title="Join Group">
      <form onSubmit={handleJoin} className="p-4 space-y-4">
        <Input
          label="Invite code"
          placeholder="Enter 8-character code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
          autoFocus
          autoCapitalize="none"
        />
        <p className="text-xs text-gray-500">
          Ask your group admin for the invite code. It looks like: <code className="bg-gray-100 px-1 rounded">abc12345</code>
        </p>
        <div className="flex gap-3">
          <Button type="button" variant="secondary" fullWidth onClick={onClose}>Cancel</Button>
          <Button type="submit" fullWidth loading={loading}>Join</Button>
        </div>
      </form>
    </Modal>
  );
}
