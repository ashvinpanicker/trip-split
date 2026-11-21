-- ============================================================
-- TripSplit — per-group currency symbol, itemized bills, receipt photos
-- Run after trust_and_admin.sql. Safe to re-run.
-- ============================================================

-- Display currency per group (symbol only, no conversion). ISO 4217 code.
alter table public.groups add column if not exists currency text not null default 'INR';
alter table public.groups drop constraint if exists groups_currency_format;
alter table public.groups add constraint groups_currency_format check (currency ~ '^[A-Z]{3}$');

-- Itemized bills: [{name, price, people: [person ids]}, ...] plus extras, kept so the bill can be re-edited
alter table public.expenses add column if not exists items jsonb;
-- Receipt photo: storage path "receipts/<group_id>/<expense_id>.jpg"
alter table public.expenses add column if not exists receipt_path text;

-- save_expense gains p_items (the old 11-argument version is replaced)
drop function if exists public.save_expense(uuid, uuid, text, numeric, date, uuid, uuid, text, text, text, jsonb);

create or replace function public.save_expense(
  p_expense_id uuid,
  p_group_id uuid,
  p_title text,
  p_amount numeric,
  p_date date,
  p_paid_by uuid,
  p_paid_by_pending uuid,
  p_category text,
  p_split_type text,
  p_notes text,
  p_participants jsonb,
  p_items jsonb default null
)
returns uuid
language plpgsql security invoker as $$
declare
  v_id uuid := p_expense_id;
  v_sum numeric;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be positive';
  end if;
  if jsonb_array_length(coalesce(p_participants, '[]'::jsonb)) = 0 then
    raise exception 'Select at least one participant';
  end if;

  select coalesce(sum((p->>'share_amount')::numeric), 0) into v_sum
  from jsonb_array_elements(p_participants) p;

  if round(v_sum, 2) <> round(p_amount, 2) then
    raise exception 'Split adds up to % but the expense is %', round(v_sum, 2), round(p_amount, 2);
  end if;

  if v_id is null then
    insert into public.expenses
      (group_id, title, amount, date, paid_by, paid_by_pending, category, split_type, notes, items, created_by)
    values
      (p_group_id, p_title, round(p_amount, 2), p_date, p_paid_by, p_paid_by_pending, p_category,
       p_split_type::public.split_type, p_notes, p_items, auth.uid())
    returning id into v_id;
  else
    update public.expenses
    set title = p_title, amount = round(p_amount, 2), date = p_date,
        paid_by = p_paid_by, paid_by_pending = p_paid_by_pending,
        category = p_category, split_type = p_split_type::public.split_type, notes = p_notes, items = p_items
    where id = v_id;
    if not found then
      raise exception 'Expense not found or you can''t edit it';
    end if;
    delete from public.expense_participants where expense_id = v_id;
  end if;

  insert into public.expense_participants (expense_id, user_id, pending_member_id, share_amount, share_percentage)
  select v_id,
         nullif(p->>'user_id', '')::uuid,
         nullif(p->>'pending_member_id', '')::uuid,
         round((p->>'share_amount')::numeric, 2),
         nullif(p->>'share_percentage', '')::numeric
  from jsonb_array_elements(p_participants) p;

  return v_id;
end;
$$;
grant execute on function public.save_expense(uuid, uuid, text, numeric, date, uuid, uuid, text, text, text, jsonb, jsonb) to authenticated;

-- ── Activity: log receipts and currency changes; don't call a receipt upload an "edit"
create or replace function public.log_activity()
returns trigger language plpgsql security definer as $$
declare
  g uuid;
  act text;
  d jsonb := '{}'::jsonb;
begin
  if TG_TABLE_NAME = 'expenses' then
    if TG_OP = 'INSERT' then
      g := new.group_id; act := 'expense_added';
      d := jsonb_build_object('title', new.title, 'amount', new.amount,
             'payer', public.person_name(coalesce(new.paid_by, new.paid_by_pending)));
    elsif TG_OP = 'UPDATE' then
      g := new.group_id;
      if new.receipt_path is distinct from old.receipt_path
         and (new.title, new.amount, new.date, new.paid_by, new.paid_by_pending, new.category, new.split_type, new.notes, new.items)
             is not distinct from
             (old.title, old.amount, old.date, old.paid_by, old.paid_by_pending, old.category, old.split_type, old.notes, old.items) then
        act := case when new.receipt_path is null then 'receipt_removed' else 'receipt_added' end;
        d := jsonb_build_object('title', new.title);
      else
        act := 'expense_edited';
        d := jsonb_build_object('title', new.title, 'old_title', old.title, 'amount', new.amount, 'old_amount', old.amount);
      end if;
    else
      g := old.group_id; act := 'expense_deleted';
      d := jsonb_build_object('title', old.title, 'amount', old.amount);
    end if;

  elsif TG_TABLE_NAME = 'settlements' then
    if TG_OP = 'INSERT' then
      g := new.group_id; act := 'payment_recorded';
      d := jsonb_build_object('from', public.person_name(new.from_person), 'to', public.person_name(new.to_person), 'amount', new.amount);
    else
      g := old.group_id; act := 'payment_deleted';
      d := jsonb_build_object('from', public.person_name(old.from_person), 'to', public.person_name(old.to_person), 'amount', old.amount);
    end if;

  elsif TG_TABLE_NAME = 'pending_members' then
    if TG_OP = 'INSERT' then
      g := new.group_id; act := 'person_added'; d := jsonb_build_object('name', new.name);
    elsif TG_OP = 'UPDATE' and old.claimed_by is null and new.claimed_by is not null then
      g := new.group_id; act := 'name_claimed';
      d := jsonb_build_object('name', new.name, 'by', public.person_name(new.claimed_by));
    else
      return null;
    end if;

  elsif TG_TABLE_NAME = 'group_members' then
    if TG_OP = 'INSERT' then
      if public.is_group_creator(new.group_id) and new.user_id = auth.uid() and new.role = 'admin' then return null; end if;
      if exists (select 1 from public.pending_members where group_id = new.group_id and claimed_by = new.user_id) then return null; end if;
      g := new.group_id; act := 'member_joined'; d := jsonb_build_object('name', public.person_name(new.user_id));
    elsif TG_OP = 'UPDATE' and old.role is distinct from new.role then
      g := new.group_id; act := 'role_changed';
      d := jsonb_build_object('name', public.person_name(new.user_id), 'role', new.role);
    else
      return null;
    end if;

  elsif TG_TABLE_NAME = 'groups' then
    if old.simplify_debts is distinct from new.simplify_debts then
      g := new.id; act := 'setting_changed'; d := jsonb_build_object('simplify_debts', new.simplify_debts);
    elsif old.currency is distinct from new.currency then
      g := new.id; act := 'currency_changed'; d := jsonb_build_object('currency', new.currency, 'old', old.currency);
    else
      return null;
    end if;
  end if;

  if g is null or not exists (select 1 from public.groups where id = g) then
    return null;
  end if;

  insert into public.activity_log (group_id, actor, action, data) values (g, auth.uid(), act, d);
  return null;
end;
$$;

-- ── Receipt photos: private bucket, readable/writable only by members of the group in the path
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('receipts', 'receipts', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = 2097152, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

create or replace function public.receipt_group(object_name text)
returns uuid language sql immutable as $$
  select case when split_part(object_name, '/', 1) ~ '^[0-9a-f-]{36}$' then split_part(object_name, '/', 1)::uuid end;
$$;

drop policy if exists "receipts_select" on storage.objects;
drop policy if exists "receipts_insert" on storage.objects;
drop policy if exists "receipts_update" on storage.objects;
drop policy if exists "receipts_delete" on storage.objects;
create policy "receipts_select" on storage.objects for select to authenticated
  using (bucket_id = 'receipts' and public.is_group_member(public.receipt_group(name)));
create policy "receipts_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'receipts' and public.is_group_member(public.receipt_group(name)));
create policy "receipts_update" on storage.objects for update to authenticated
  using (bucket_id = 'receipts' and public.is_group_member(public.receipt_group(name)));
create policy "receipts_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'receipts' and public.is_group_member(public.receipt_group(name)));
