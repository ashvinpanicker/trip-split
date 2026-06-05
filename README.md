# TripSplit — Shared Expense Tracker

A mobile-first expense sharing app built with Next.js 16, Supabase, and Tailwind CSS. Similar to Splitwise.

---

## Features

- **Auth** — Email + Google OAuth via Supabase Auth
- **Groups** — Create groups, join via invite code, view members
- **Expenses** — Add, edit, delete expenses with title, amount, date, payer, participants, notes
- **Split types** — Equal, percentage, and fixed amount splits
- **Balances** — Net balances per user, simplified debt settlements
- **Mobile-first** — Bottom nav, responsive, clean design

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router), React, TypeScript |
| Styling | Tailwind CSS v4 |
| Backend | Supabase (Auth, PostgreSQL, RLS) |
| Deployment | Vercel |

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/           # Login & register pages
│   ├── (app)/            # Protected pages with bottom nav
│   │   ├── dashboard/    # Home feed with balance summary
│   │   ├── groups/       # Groups list + group detail [id]
│   │   ├── balances/     # Cross-group balance overview
│   │   └── profile/      # User profile + sign out
│   ├── api/auth/callback/ # OAuth callback
│   └── join/[code]/      # Invite link join page
├── components/
│   ├── ui/               # Button, Input, Avatar, Card, Modal, Toast, EmptyState
│   ├── layout/           # AppHeader, BottomNav
│   ├── expenses/         # ExpenseCard, AddExpenseModal
│   ├── groups/           # CreateGroupModal, JoinGroupModal, InviteCard
│   └── balances/         # BalanceList, SettlementList
├── hooks/                # useUser, useGroups, useExpenses
├── lib/
│   ├── supabase/         # client, server, proxy helpers
│   └── utils/            # balance engine, cn utility
├── types/                # TypeScript types
└── proxy.ts              # Auth guard (Next.js 16)
supabase/
└── schema.sql            # Full DB schema with RLS policies
```

---

## Database Schema

```
profiles            — user profiles (auto-created on signup trigger)
groups              — expense groups with auto-generated invite_code
group_members       — users ↔ groups (roles: admin/member)
expenses            — individual expenses per group
expense_participants — per-user share amounts for each expense
```

All tables use Row Level Security (RLS). Users only see data for groups they belong to.

---

## Getting Started

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a project
2. In **SQL Editor**, run `supabase/schema.sql`
3. In **Authentication > Providers**, enable Email and Google OAuth
4. In **Authentication > URL Configuration**, set:
   - Site URL: `https://your-app.vercel.app`
   - Redirect URLs: `https://your-app.vercel.app/api/auth/callback`

### 2. Configure Environment

```bash
cp .env.local.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

### 3. Run Locally

```bash
npm install
npm run dev
```

---

## Deploy to Vercel

```bash
npm i -g vercel
vercel
```

Or import the GitHub repo at [vercel.com/new](https://vercel.com/new) and add the two env vars.

After deploy, update Supabase redirect URLs to your production domain.

---

## Balance Calculation

The engine in `src/lib/utils/balance.ts`:

1. **Net balance per user** — Credit payer for others' shares, debit each participant
2. **Simplified settlements** — Greedy min-transactions algorithm

**Example:** Ashvin paid ₹4000 for 4 people (equal split = ₹1000 each).
- Net: Ashvin +₹3000, others −₹1000 each
- Settlements: 3 payments of ₹1000 each to Ashvin

---

## Invite Links

Groups get an 8-character invite code. Users can join via:
- The "Join Group" flow in the app
- Direct URL: `https://your-app.com/join/[code]`
