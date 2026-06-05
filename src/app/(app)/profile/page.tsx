'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, User, Mail, Edit2, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import AppHeader from '@/components/layout/AppHeader';
import Avatar from '@/components/ui/Avatar';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { useUser } from '@/hooks/useUser';

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading } = useUser();
  const { toast } = useToast();
  const supabase = createClient();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  async function handleSaveName() {
    if (!name.trim() || !user) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: name.trim() })
      .eq('id', user.id);
    if (error) {
      toast(error.message, 'error');
    } else {
      toast('Name updated');
      setEditing(false);
    }
    setSaving(false);
  }

  if (loading) return null;
  if (!user) return null;

  return (
    <div className="flex flex-col">
      <AppHeader title="Profile" />

      <div className="p-4 space-y-4">
        {/* Avatar + name */}
        <Card className="flex flex-col items-center py-8">
          <Avatar src={user.avatar_url} name={user.full_name || user.email} size="xl" />
          <div className="mt-3 text-center">
            {editing ? (
              <div className="flex items-center gap-2 mt-1">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="text-center"
                  autoFocus
                />
                <Button size="sm" loading={saving} onClick={handleSaveName}>
                  <Check size={14} />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 justify-center">
                <h2 className="text-xl font-bold text-gray-900">{user.full_name || 'No name set'}</h2>
                <button
                  onClick={() => { setName(user.full_name || ''); setEditing(true); }}
                  className="p-1 hover:bg-gray-100 rounded-lg"
                >
                  <Edit2 size={14} className="text-gray-400" />
                </button>
              </div>
            )}
            <p className="text-gray-500 text-sm mt-1">{user.email}</p>
          </div>
        </Card>

        {/* Info */}
        <Card padding="none">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-50">
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
              <User size={16} className="text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-500">Full name</p>
              <p className="text-sm font-medium text-gray-900">{user.full_name || '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
              <Mail size={16} className="text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-500">Email</p>
              <p className="text-sm font-medium text-gray-900">{user.email}</p>
            </div>
          </div>
        </Card>

        <Button variant="danger" fullWidth onClick={handleSignOut}>
          <LogOut size={16} className="mr-2" /> Sign out
        </Button>
      </div>
    </div>
  );
}
