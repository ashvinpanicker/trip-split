# TripSplit — Shared Expense Tracker

A mobile-first expense sharing app built with Next.js 16, Supabase, and Tailwind CSS. Similar to Splitwise.

---

## Features

- **Auth** — Email + Google OAuth via Supabase Auth
- **Groups** — Create groups, join via invite code, view members
- **Expenses** — Add, edit, delete expenses with title, amount, date, payer, participants, notes
- **Split types** — Equal, percentage, and fixed amount splits
- **Balances** — Net balances per user, simplified debt settlements
- **Settle up** — Record payments ("Mark paid") so balances actually clear; one-tap **Pay via UPI** when the receiver has a UPI ID in their profile
- **People without accounts** — Add friends by name; they can be in splits *and* be the payer. Their history moves over when they claim their invite link
- **Categories** — Food, drinks, stay, travel, activities… with a "where the money went" breakdown
- **Mobile-first** — Bottom nav, installable to home screen (PWA)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router), React, TypeScript |
| Styling | Tailwind CSS v4 |
| Backend | Supabase (Auth, PostgreSQL, RLS) |
| Deployment | Cloudflare Workers (OpenNext adapter) |

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
2. In **SQL Editor**, run these in order: `supabase/schema.sql`, `supabase/fix_rls_recursion.sql`, `supabase/add_pending_members.sql`, `supabase/goa_upgrade.sql`
   (Existing database? Just run `supabase/goa_upgrade.sql` — it's safe to re-run.)
3. In **Authentication > Providers**, enable Email and Google OAuth
4. In **Authentication > URL Configuration**, set:
   - Site URL: `https://trip-split.<your-subdomain>.workers.dev`
   - Redirect URLs: `https://trip-split.<your-subdomain>.workers.dev/api/auth/callback**`

### 2. Configure Environment

```bash
cp .env.example .env.local
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

## Deploy to Cloudflare

Uses [`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare). Config lives in `wrangler.jsonc` and `open-next.config.ts`.

**Option A — Git integration (auto-deploys on push)**

1. Cloudflare dashboard → **Workers & Pages → Create → Import a repository** → pick this repo
2. Build command: `npx opennextjs-cloudflare build`
3. Deploy command: `npx opennextjs-cloudflare deploy`
4. Under **Build variables**, add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (they're baked in at build time)

**Option B — from your laptop**

```bash
npx wrangler login
npm run deploy      # reads .env.local
```

Test locally in the Workers runtime with `npm run preview`.

After the first deploy, put the `*.workers.dev` URL into Supabase's Site URL and Redirect URLs.

> Note: auth guard lives in `src/middleware.ts` (not `proxy.ts`) because OpenNext's support for Next 16's Node-runtime proxy is still experimental on Cloudflare.

---

## Balance Calculation

The engine in `src/lib/utils/balance.ts`:

1. **Net balance per user** — Credit payer for others' shares, debit each participant, then apply recorded payments
2. **Simplified settlements** — Greedy min-transactions algorithm

**Example:** Ashvin paid ₹4000 for 4 people (equal split = ₹1000 each).
- Net: Ashvin +₹3000, others −₹1000 each
- Settlements: 3 payments of ₹1000 each to Ashvin

---

## Invite Links

Groups get an 8-character invite code. Users can join via:
- The "Join Group" flow in the app
- Direct URL: `https://your-app.com/join/[code]`
