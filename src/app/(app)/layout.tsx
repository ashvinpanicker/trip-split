'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { setActiveCurrency } from '@/lib/utils/balance';
import BottomNav from '@/components/layout/BottomNav';
import { ToastProvider } from '@/components/ui/Toast';
import AddExpenseModal from '@/components/expenses/AddExpenseModal';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [showAddExpense, setShowAddExpense] = useState(false);
  // On a group page, the centre "Add" button goes straight to that group's form
  const groupMatch = usePathname().match(/^\/groups\/([0-9a-f-]{36})/);
  const currentGroupId = groupMatch?.[1] ?? null;
  // Outside a group, money defaults to ₹ (the group page sets its own currency when it renders)
  if (!currentGroupId) setActiveCurrency('INR');

  return (
    <ToastProvider>
      <div className="flex flex-col min-h-screen bg-gray-50">
        <main className="flex-1 pb-20">
          {children}
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
