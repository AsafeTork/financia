-- Permite o plano 'premium' em company_profiles e corrige set_client_plan para
-- tratar premium igual a pro (expiracao + plan_activated_by). Antes a funcao so
-- preenchia esses campos quando b_plan = 'pro', entao premium gravava NULL em
-- plan_activated_by — o que quebraria a regra de receita (cortesia do admin nao
-- conta como receita; ver isAdminGranted/countsAsRevenue em src/lib/constants.js).

-- 1) Constraint do CHECK: free | pro | premium
ALTER TABLE company_profiles
  DROP CONSTRAINT IF EXISTS company_profiles_plan_check;
ALTER TABLE company_profiles
  ADD CONSTRAINT company_profiles_plan_check
  CHECK (plan IN ('free', 'pro', 'premium'));

-- 2) set_client_plan: valida o plano e aplica expiracao/ator para qualquer plano pago
CREATE OR REPLACE FUNCTION public.set_client_plan(a_target uuid, b_plan text, c_actor text)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  -- apenas admin pode chamar
  IF NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  IF b_plan NOT IN ('free', 'pro', 'premium') THEN
    RAISE EXCEPTION 'invalid plan: %', b_plan;
  END IF;

  -- libera o trigger prevent_plan_change para esta transacao
  PERFORM set_config('app.allow_plan_change', '1', true);

  UPDATE company_profiles
  SET
    plan              = b_plan,
    plan_expires_at   = CASE WHEN b_plan = 'free' THEN NULL ELSE now() + interval '1 year' END,
    plan_activated_by = CASE WHEN b_plan = 'free' THEN NULL ELSE c_actor END
  WHERE user_id = a_target;
END;
$function$;
