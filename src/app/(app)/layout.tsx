'use client';

import { useState } from 'react';
import BottomNav from '@/components/layout/BottomNav';
import { ToastProvider } from '@/components/ui/Toast';
import AddExpenseModal from '@/components/expenses/AddExpenseModal';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [showAddExpense, setShowAddExpense] = useState(false);

  return (
    <ToastProvider>
      <div className="flex flex-col min-h-screen bg-gray-50">
        <main className="flex-1 pb-20">
          {children}
        </main>
        <BottomNav onAddExpense={() => setShowAddExpense(true)} />
        <AddExpenseModal
          open={showAddExpense}
          onClose={() => setShowAddExpense(false)}
          groupId={null}
        />
      </div>
    </ToastProvider>
  );
}
