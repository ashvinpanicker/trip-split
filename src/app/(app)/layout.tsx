'use client';

import { useEffect, useState } from 'react';
import { hydrateCache } from '@/hooks/cache';
import PageSkeleton from '@/components/ui/PageSkeleton';
import { usePathname } from 'next/navigation';
import { setActiveCurrency } from '@/lib/utils/balance';
import BottomNav from '@/components/layout/BottomNav';
import { ToastProvider } from '@/components/ui/Toast';
import AddExpenseModal from '@/components/expenses/AddExpenseModal';
import { OfflineBanner, ServiceWorker } from '@/components/pwa/Pwa';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [showAddExpense, setShowAddExpense] = useState(false);
  // Load this account's saved data before pages render, so they open with it instantly
  // (one frame after mount, so the server-rendered HTML and the first client render match)
  const [ready, setReady] = useState(false);
  useEffect(() => { hydrateCache(); setReady(true); }, []);
  // On a group page, the centre "Add" button goes straight to that group's form
  const groupMatch = usePathname().match(/^\/groups\/([0-9a-f-]{36})/);
  const currentGroupId = groupMatch?.[1] ?? null;
  // Outside a group, money defaults to ₹ (the group page sets its own currency when it renders)
  if (!currentGroupId) setActiveCurrency('INR');

  return (
    <ToastProvider>
      <ServiceWorker />
      <div className="flex flex-col min-h-screen bg-gray-50">
        <OfflineBanner />
        <main className="flex-1 pb-20">
          {ready ? children : <PageSkeleton />}
        </main>
        <BottomNav onAddExpense={() => setShowAddExpense(true)} />
        <AddExpenseModal
          key={currentGroupId ?? 'any'}
          open={showAddExpense}
          onClose={() => setShowAddExpense(false)}
          groupId={currentGroupId}
          onSuccess={() => window.dispatchEvent(new Event('tripsplit:expenses-changed'))}
        />
      </div>
    </ToastProvider>
  );
}
