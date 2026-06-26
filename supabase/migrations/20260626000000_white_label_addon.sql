-- Add-on de Personalizacao (white-label): flag + nicho + ativacao server-side segura.
-- Aplicar com: supabase db push  (ou via painel/MCP). Aditivo e idempotente.

-- 1) Colunas novas em company_profiles.
alter table public.company_profiles
  add column if not exists white_label boolean not null default false,
  add column if not exists niche text;

-- 2) Ativa/desativa o white-label. SECURITY DEFINER: chamada apenas pelo servidor
--    (webhook da Stripe via service_role). Espelha o padrao de stripe_activate_plan.
create or replace function public.set_white_label(p_user uuid, p_on boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.company_profiles
     set white_label = p_on,
         updated_at = now()
   where user_id = p_user;
end;
$$;

revoke all on function public.set_white_label(uuid, boolean) from public;
revoke all on function public.set_white_label(uuid, boolean) from anon;
revoke all on function public.set_white_label(uuid, boolean) from authenticated;

-- 3) Trava: impede o cliente de ligar o white_label sozinho via UPDATE direto.
--    Reverte silenciosamente qualquer mudanca de white_label que nao venha do
--    service_role (o webhook e a RPC SECURITY DEFINER passam; o cliente nao).
create or replace function public.guard_white_label()
returns trigger
language plpgsql
as $$
begin
  if (new.white_label is distinct from old.white_label)
     and coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    new.white_label := old.white_label;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_white_label on public.company_profiles;
create trigger trg_guard_white_label
  before update on public.company_profiles
  for each row execute function public.guard_white_label();
