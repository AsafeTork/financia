-- Impersonacao: correcao de seguranca + rede de seguranca de expiracao.
--
-- Problema 1 (CRITICO): admin_impersonate_restore(target_uid, old_hash) era
-- SECURITY DEFINER sem qualquer checagem de autorizacao e setava
-- auth.users.encrypted_password = old_hash para QUALQUER target_uid. Qualquer
-- usuario autenticado podia sobrescrever a senha de qualquer conta (inclusive
-- admin) -> account takeover. Alem disso o client chamava com 1 arg, entao o
-- restore por pagehide estava quebrado e a senha temporaria nunca voltava.
--
-- Problema 2: se o processo do cliente fosse morto, o evento pagehide nao
-- disparava e a senha temporaria ficava ativa indefinidamente.
--
-- Solucao: guardar o hash original no servidor (tabela impersonation_sessions),
-- restore admin-gated lendo o hash do servidor (nunca do client), e um sweeper
-- que restaura sessoes expiradas (expiracao de 4 min -> com cron de 1 min,
-- restauracao garantida em <=5 min independente de pagehide).

-- 1) Tabela de sessoes (hash original fica so no servidor)
create table if not exists public.impersonation_sessions (
  target_uid  uuid primary key,
  old_hash    text not null,
  started_by  uuid not null,
  started_at  timestamptz not null default now(),
  expires_at  timestamptz not null
);
alter table public.impersonation_sessions enable row level security;
-- Sem policies: anon/authenticated nao acessam. So funcoes SECURITY DEFINER tocam.
revoke all on table public.impersonation_sessions from anon;
revoke all on table public.impersonation_sessions from authenticated;

-- 2) start: admin-gated; guarda old_hash no servidor; NAO retorna old_hash
create or replace function public.admin_impersonate_start(target_uid uuid)
returns json language plpgsql security definer
set search_path to 'public', 'extensions', 'auth'
as $function$
declare
  v_email     text;
  v_temp_pass text;
  v_old_hash  text;
begin
  if not exists (select 1 from user_roles where user_id = auth.uid() and role = 'admin') then
    raise exception 'forbidden';
  end if;

  select email, encrypted_password into v_email, v_old_hash
  from auth.users where id = target_uid;
  if v_email is null then raise exception 'usuario nao encontrado'; end if;

  v_temp_pass := encode(extensions.gen_random_bytes(16), 'hex');

  -- Guarda o hash original. Se ja existe sessao ativa, preserva o old_hash
  -- original (nao sobrescreve com o hash temporario do start anterior).
  insert into public.impersonation_sessions(target_uid, old_hash, started_by, started_at, expires_at)
  values (target_uid, v_old_hash, auth.uid(), now(), now() + interval '4 minutes')
  on conflict (target_uid) do update
    set expires_at = excluded.expires_at,
        started_by = excluded.started_by;

  update auth.users
  set encrypted_password = extensions.crypt(v_temp_pass, extensions.gen_salt('bf'))
  where id = target_uid;

  return json_build_object('email', v_email, 'temp_pass', v_temp_pass, 'uid', target_uid);
end;
$function$;

-- 3) Remove a versao vulneravel (2 args) e cria a segura (1 arg, admin-gated)
drop function if exists public.admin_impersonate_restore(uuid, text);

create or replace function public.admin_impersonate_restore(target_uid uuid)
returns void language plpgsql security definer
set search_path to 'public', 'auth'
as $function$
declare
  v_old text;
begin
  if not exists (select 1 from user_roles where user_id = auth.uid() and role = 'admin') then
    raise exception 'forbidden';
  end if;

  select old_hash into v_old
  from public.impersonation_sessions s
  where s.target_uid = admin_impersonate_restore.target_uid;

  if v_old is null then
    return; -- nada a restaurar (ja restaurado ou inexistente)
  end if;

  update auth.users
  set encrypted_password = v_old
  where id = admin_impersonate_restore.target_uid;

  delete from public.impersonation_sessions s
  where s.target_uid = admin_impersonate_restore.target_uid;
end;
$function$;

-- 4) Sweeper: restaura qualquer sessao expirada (independe de pagehide)
create or replace function public.impersonation_sweep()
returns void language plpgsql security definer
set search_path to 'public', 'auth'
as $function$
begin
  update auth.users u
  set encrypted_password = s.old_hash
  from public.impersonation_sessions s
  where s.target_uid = u.id and now() >= s.expires_at;

  delete from public.impersonation_sessions
  where now() >= expires_at;
end;
$function$;

-- 5) Travas de execucao
revoke all on function public.admin_impersonate_restore(uuid) from public;
revoke all on function public.admin_impersonate_restore(uuid) from anon;
grant execute on function public.admin_impersonate_restore(uuid) to authenticated;

revoke all on function public.impersonation_sweep() from public;
revoke all on function public.impersonation_sweep() from anon;
revoke all on function public.impersonation_sweep() from authenticated;
