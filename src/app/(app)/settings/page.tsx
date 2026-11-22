'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, LogOut, MessageSquare } from 'lucide-react';
import AppHeader from '@/components/layout/AppHeader';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import PageSkeleton from '@/components/ui/PageSkeleton';
import SettingsCard, { FeaturesCard } from '@/components/profile/SettingsCard';
import SupportLinks from '@/components/SupportLinks';
import { InstallPrompt, clearOfflineCache } from '@/components/pwa/Pwa';
import { createClient } from '@/lib/supabase/client';
import { clearCache } from '@/hooks/cache';
import { useUser } from '@/hooks/useUser';
import { useT } from '@/lib/i18n';
import { REPO_URL } from '@/lib/marketing/site';

export default function SettingsPage() {
  const router = useRouter();
  const { user } = useUser();
  const t = useT();
  // Trip admins get every feature until they choose, same as on their trip pages
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    if (!user) return;
    createClient().from('group_members').select('group_id').eq('user_id', user.id).eq('role', 'admin').limit(1)
      .then(({ data }) => setIsAdmin(!!data?.length));
  }, [user]);

  async function signOut() {
    await createClient().auth.signOut();
    clearCache();
    await clearOfflineCache();
    router.push('/login');
  }

  if (!user) return <PageSkeleton />;

  return (
    <div className="flex flex-col">
      <AppHeader title={t('nav.settings')} />
      <div className="p-4 space-y-4">
        <Card padding="none">
          <Link href="/profile" className="flex items-center gap-3 px-4 py-3">
            <Avatar src={user.avatar_url} name={user.full_name || user.email} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user.full_name || user.email}</p>
              <p className="text-xs text-gray-500">{t('settings.profileHint')}</p>
            </div>
            <ChevronRight size={18} className="text-gray-400" />
          </Link>
        </Card>

        <FeaturesCard isAdminSomewhere={isAdmin} />

        <SettingsCard />

        <InstallPrompt persistent />

        <Card padding="none">
          <a href="/feedback?from=settings" className="flex items-center gap-3 px-4 py-3">
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <MessageSquare size={16} className="text-blue-600" />
            </div>
            <span className="flex-1 text-sm font-medium text-gray-900">{t('settings.feedback')}</span>
            <ChevronRight size={18} className="text-gray-400" />
          </a>
        </Card>

        <Button variant="danger" fullWidth onClick={signOut}>
          <LogOut size={16} className="mr-2" /> {t('settings.signOut')}
        </Button>

        <div className="text-center text-xs text-gray-500 pt-2 pb-10 space-y-2">
          <p>TripSplit is free and open source. <a href={REPO_URL} className="underline">Source code</a> · <a href="/blog" className="underline">Blog</a></p>
          <SupportLinks className="mt-1 [&_div]:justify-center" />
        </div>
      </div>
    </div>
  );
}
