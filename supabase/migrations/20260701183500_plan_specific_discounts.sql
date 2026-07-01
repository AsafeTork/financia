alter table public.company_profiles
  add column if not exists custom_price_cents_pro integer,
  add column if not exists custom_price_cents_premium integer;

