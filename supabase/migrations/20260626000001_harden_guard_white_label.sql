-- Hardening: fixa search_path no trigger guard_white_label (silencia advisor de
-- function_search_path_mutable; espelha o padrao de set_white_label). Idempotente.
create or replace function public.guard_white_label()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if (new.white_label is distinct from old.white_label)
     and coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    new.white_label := old.white_label;
  end if;
  return new;
end;
$$;
