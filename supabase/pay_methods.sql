-- TripSplit — worldwide payment methods on a profile (PayPal, Cash App, Venmo, Revolut, crypto…)
-- Each entry: {"type": "paypal", "value": "ashvin"}. The app validates and builds links;
-- the database keeps it a small, bounded array. Visible to group-mates like upi_id already is.

alter table public.profiles
  add column if not exists pay_methods jsonb not null default '[]'::jsonb;

alter table public.profiles drop constraint if exists pay_methods_shape;
alter table public.profiles add constraint pay_methods_shape check (
  jsonb_typeof(pay_methods) = 'array'
  and jsonb_array_length(pay_methods) <= 8
  and octet_length(pay_methods::text) <= 2000
);

-- Carry existing UPI IDs over so nobody loses their pay button
update public.profiles
set pay_methods = jsonb_build_array(jsonb_build_object('type', 'upi', 'value', upi_id))
where upi_id is not null and upi_id <> '' and pay_methods = '[]'::jsonb;
