-- Preco customizado por cliente (desconto manual do admin) + stats do banco para o painel.

-- 1) Coluna de preco customizado em centavos. NULL/0 = usa o preco de tabela do plano.
alter table public.company_profiles
  add column if not exists custom_price_cents integer;

-- 2) Admin define/limpa o preco customizado de um cliente. SECURITY DEFINER, admin-gated.
create or replace function public.admin_set_custom_price(a_target uuid, b_cents integer)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role = 'admin'
  ) then
    raise exception 'not authorized';
  end if;
  if b_cents is not null and (b_cents < 0 or b_cents > 100000000) then
    raise exception 'invalid price';
  end if;
  update public.company_profiles
  set custom_price_cents = case when b_cents is null or b_cents <= 0 then null else b_cents end
  where user_id = a_target;
end;
$$;

-- 3) Tamanho total do banco + maiores tabelas, para saber quando otimizar/aumentar o plano.
create or replace function public.admin_db_stats()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare result jsonb;
begin
  if not exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role = 'admin'
  ) then
    raise exception 'not authorized';
  end if;
  select jsonb_build_object(
    'db_bytes', pg_database_size(current_database()),
    'tables', (
      select coalesce(jsonb_agg(t), '[]'::jsonb) from (
        select c.relname as name, pg_total_relation_size(c.oid) as bytes
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind = 'r'
        order by pg_total_relation_size(c.oid) desc
        limit 8
      ) t
    )
  ) into result;
  return result;
end;
$$;

grant execute on function public.admin_set_custom_price(uuid, integer) to authenticated;
grant execute on function public.admin_db_stats() to authenticated;
