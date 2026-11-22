-- TripSplit — expenses in more than one currency
-- Balances stay in the trip's currency. An expense paid in another currency is converted
-- when saved; `fx` keeps what was really paid ({currency, amount, rate}) for display.
-- groups.fx_rates holds rates the trip fixed ("use my actual rate"), e.g. {"THB": 2.45}.
-- Safe to re-run. The current app keeps working: p_fx is optional.

alter table public.expenses add column if not exists fx jsonb;
alter table public.groups add column if not exists fx_rates jsonb not null default '{}'::jsonb;
alter table public.groups drop constraint if exists groups_fx_rates_object;
alter table public.groups add constraint groups_fx_rates_object check (jsonb_typeof(fx_rates) = 'object' and pg_column_size(fx_rates) < 4000);

-- Any trip member can fix a rate for the trip (only this column; the rest of the group stays admin-only)
create or replace function public.set_trip_rate(p_group_id uuid, p_currency text, p_rate numeric)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_group_member(p_group_id) then raise exception 'Not a member of this trip'; end if;
  if p_currency !~ '^[A-Z]{3}$' then raise exception 'Bad currency code'; end if;
  if p_rate is null then
    update groups set fx_rates = fx_rates - p_currency where id = p_group_id;
  elsif p_rate <= 0 or p_rate > 1000000 then
    raise exception 'Rate must be positive';
  else
    update groups set fx_rates = fx_rates || jsonb_build_object(p_currency, p_rate) where id = p_group_id;
  end if;
end $$;
grant execute on function public.set_trip_rate(uuid, text, numeric) to authenticated;

drop function if exists public.save_expense(uuid, uuid, text, numeric, date, uuid, uuid, text, text, text, jsonb, jsonb);

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
  p_items jsonb default null,
  p_fx jsonb default null     -- {currency, amount, rate}: what was actually paid, before converting
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
      (group_id, title, amount, date, paid_by, paid_by_pending, category, split_type, notes, items, fx, created_by)
    values
      (p_group_id, p_title, round(p_amount, 2), p_date, p_paid_by, p_paid_by_pending, p_category,
       p_split_type::public.split_type, p_notes, p_items, p_fx, auth.uid())
    returning id into v_id;
  else
    update public.expenses
    set title = p_title, amount = round(p_amount, 2), date = p_date,
        paid_by = p_paid_by, paid_by_pending = p_paid_by_pending,
        category = p_category, split_type = p_split_type::public.split_type, notes = p_notes, items = p_items, fx = p_fx
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
grant execute on function public.save_expense(uuid, uuid, text, numeric, date, uuid, uuid, text, text, text, jsonb, jsonb, jsonb) to authenticated;
