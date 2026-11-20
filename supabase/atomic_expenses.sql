-- ============================================================
-- TripSplit — atomic, validated expense saves
-- One call writes the expense + its split in a single transaction,
-- and refuses any split whose shares don't sum exactly to the amount.
-- Runs as the caller (security invoker), so existing RLS still applies.
-- Safe to re-run.
-- ============================================================

create or replace function public.save_expense(
  p_expense_id uuid,          -- null = create
  p_group_id uuid,
  p_title text,
  p_amount numeric,
  p_date date,
  p_paid_by uuid,
  p_paid_by_pending uuid,
  p_category text,
  p_split_type text,
  p_notes text,
  p_participants jsonb        -- [{user_id, pending_member_id, share_amount, share_percentage}]
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
      (group_id, title, amount, date, paid_by, paid_by_pending, category, split_type, notes, created_by)
    values
      (p_group_id, p_title, round(p_amount, 2), p_date, p_paid_by, p_paid_by_pending, p_category, p_split_type, p_notes, auth.uid())
    returning id into v_id;
  else
    update public.expenses
    set title = p_title, amount = round(p_amount, 2), date = p_date,
        paid_by = p_paid_by, paid_by_pending = p_paid_by_pending,
        category = p_category, split_type = p_split_type, notes = p_notes
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

grant execute on function public.save_expense(uuid, uuid, text, numeric, date, uuid, uuid, text, text, text, jsonb) to authenticated;

-- Health check: expenses whose split doesn't match the amount (should return no rows)
create or replace view public.expense_split_mismatches with (security_invoker = true) as
select e.id, e.group_id, e.title, e.amount, coalesce(sum(ep.share_amount), 0) as shares_total
from public.expenses e
left join public.expense_participants ep on ep.expense_id = e.id
group by e.id
having coalesce(sum(ep.share_amount), 0) <> e.amount;
