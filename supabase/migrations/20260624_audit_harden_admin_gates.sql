-- AUDITORIA DE SEGURANCA — escalacao de privilegio em funcoes SECURITY DEFINER.
--
-- Achado 🔴: o gate `(select role from user_roles where user_id=auth.uid()) <> 'admin'`
-- NAO bloqueia quem nao tem linha em user_roles (todo cliente comum). A subquery
-- retorna NULL, `NULL <> 'admin'` e NULL, e `IF NULL THEN` nao dispara -> bypass.
-- Confirmado em dados reais: old_pattern=BYPASS, new_pattern=blocks (admin segue OK).
--
-- Impacto:
--  - admin_delete_client: qualquer autenticado podia apagar dados + auth.users de qualquer conta.
--  - admin_get_magic_link: qualquer autenticado podia obter magic link de qualquer conta
--    (inclui confirmar email) -> takeover total, inclusive de admin.
--
-- Correcao: trocar o gate pelo padrao seguro `not exists (... and role='admin')`,
-- que bloqueia tanto NULL (sem role) quanto roles != admin. Corpo das funcoes intacto.
-- (admin_impersonate_start/restore sao corrigidos no branch agent/impersonate.)
-- (set_client_plan, admin_clear_client_data, admin_client_usage ja usam o padrao seguro.)

create or replace function public.admin_delete_client(target_uid uuid)
returns void language plpgsql security definer
set search_path to 'public', 'auth'
as $function$
begin
  if not exists (select 1 from user_roles where user_id = auth.uid() and role = 'admin') then
    raise exception 'forbidden: apenas admin pode excluir clientes';
  end if;
  delete from public.company_profiles where user_id = target_uid;
  delete from public.transactions     where user_id = target_uid;
  delete from public.products         where user_id = target_uid;
  delete from public.losses           where user_id = target_uid;
  delete from public.user_roles       where user_id = target_uid;
  delete from auth.users              where id       = target_uid;
end;
$function$;

create or replace function public.admin_get_magic_link(target_uid uuid)
returns text language plpgsql security definer
set search_path to 'public', 'extensions', 'auth'
as $function$
declare
  v_bytes      bytea;
  v_token      text;
  v_token_hash text;
begin
  if not exists (select 1 from user_roles where user_id = auth.uid() and role = 'admin') then
    raise exception 'forbidden: apenas admin';
  end if;
  if not exists (select 1 from auth.users where id = target_uid) then
    raise exception 'usuario nao encontrado';
  end if;

  v_bytes      := extensions.gen_random_bytes(32);
  v_token      := encode(v_bytes, 'hex');
  v_token_hash := encode(extensions.digest(v_bytes, 'sha256'), 'hex');

  update auth.users
  set confirmation_token   = v_token_hash,
      confirmation_sent_at = now(),
      email_confirmed_at   = coalesce(email_confirmed_at, now())
  where id = target_uid;

  return 'https://kxeqhorxhlgwcgywovqr.supabase.co/auth/v1/verify?token=' || v_token
    || '&type=magiclink&redirect_to=https://gestao-financeira-7heu.onrender.com';
end;
$function$;
