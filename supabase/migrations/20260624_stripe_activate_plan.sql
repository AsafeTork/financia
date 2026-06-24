-- APLICADO PELO ORCHESTRATOR via mcp apply_migration (nao rodar localmente)

create or replace function public.stripe_activate_plan(p_user uuid, p_plan text, p_expires timestamptz)
returns void language plpgsql security definer set search_path to 'public' as $$
begin
  perform set_config('app.allow_plan_change','1', true);
  update public.company_profiles set plan = p_plan, plan_expires_at = p_expires, plan_activated_by = 'stripe' where user_id = p_user;
end; $$;

revoke all on function public.stripe_activate_plan(uuid,text,timestamptz) from public;
revoke all on function public.stripe_activate_plan(uuid,text,timestamptz) from anon;
revoke all on function public.stripe_activate_plan(uuid,text,timestamptz) from authenticated;
grant execute on function public.stripe_activate_plan(uuid,text,timestamptz) to service_role;
