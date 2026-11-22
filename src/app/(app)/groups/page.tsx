'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, UserPlus, Users, Receipt } from 'lucide-react';
import AppHeader from '@/components/layout/AppHeader';
import Button from '@/components/ui/Button';
import { groupColors } from '@/lib/utils/groupColor';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import CreateGroupModal from '@/components/groups/CreateGroupModal';
import JoinGroupModal from '@/components/groups/JoinGroupModal';
import { useGroups } from '@/hooks/useGroups';
import type { Group } from '@/types';

export default function GroupsPage() {
  const router = useRouter();
  const { groups, loading, refetch } = useGroups();
  const colors = groupColors(groups);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const active = groups.filter((g) => !g.archived_at);
  const archived = groups.filter((g) => g.archived_at);

  const renderGroup = (group: Group) => (
    <Card
      key={group.id}
      onClick={() => router.push(`/groups/${group.id}`)}
      className="active:bg-gray-50"
    >
      <div className="flex items-center gap-3">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold flex-shrink-0"
          style={{ background: colors[group.id]?.bg, color: colors[group.id]?.fg }}
        >
          {group.name[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">{group.name}</p>
          {group.description && (
            <p className="text-xs text-gray-500 truncate">{group.description}</p>
          )}
          <div className="flex items-center gap-3 mt-1">
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Users size={11} /> {group.member_count} {group.member_count === 1 ? 'person' : 'people'}
            </span>
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Receipt size={11} /> {group.total_expenses} {group.total_expenses === 1 ? 'expense' : 'expenses'}
            </span>
          </div>
        </div>
        <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Card>
  );

  return (
    <div className="flex flex-col">
      <AppHeader
        title="Groups"
        right={
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setShowJoin(true)}>
              <UserPlus size={14} className="mr-1" /> Join
            </Button>
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <Plus size={14} className="mr-1" /> New
            </Button>
          </div>
        }
      />

      <div className="p-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No groups yet"
            description="Create a group to start splitting expenses with friends"
            action={
              <Button onClick={() => setShowCreate(true)}>
                <Plus size={16} className="mr-1" /> Create group
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {active.map(renderGroup)}
            {archived.length > 0 && (
              <>
                <button onClick={() => setShowArchived((v) => !v)} className="w-full text-sm text-gray-500 py-2">
                  {showArchived ? 'Hide' : 'Show'} archived trips ({archived.length})
                </button>
                {showArchived && <div className="space-y-3 opacity-70">{archived.map(renderGroup)}</div>}
              </>
            )}
          </div>
        )}
      </div>

      <CreateGroupModal open={showCreate} onClose={() => setShowCreate(false)} onSuccess={refetch} />
      <JoinGroupModal open={showJoin} onClose={() => setShowJoin(false)} onSuccess={refetch} />
    </div>
  );
}
