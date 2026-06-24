-- Rede de seguranca: agenda o sweeper de impersonacao a cada 1 min.
-- Com expires_at = now()+4min (no start), a restauracao da senha original fica
-- garantida em <=5 min mesmo que o pagehide nunca dispare (processo morto).

create extension if not exists pg_cron;

-- Reagendamento idempotente
do $$
begin
  perform cron.unschedule('impersonation-sweep');
exception when others then
  null;
end $$;

select cron.schedule('impersonation-sweep', '* * * * *', $$select public.impersonation_sweep();$$);
