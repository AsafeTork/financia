-- Fix: bloquear cliente de alterar plan/plan_expires_at/plan_activated_by diretamente
-- Problema: policy update_own_branding_only nao tinha WITH CHECK, permitindo update em qualquer coluna
-- Solucao: recriar policy com WITH CHECK que garante que plan/expires/activated_by nao mudam

-- Remove policy antiga
DROP POLICY IF EXISTS update_own_branding_only ON public.company_profiles;

-- Recria com WITH CHECK: cliente so pode alterar name/logo/logo_url/color
-- plan/plan_expires_at/plan_activated_by devem permanecer iguais ao valor atual
CREATE POLICY update_own_branding_only ON public.company_profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND plan = (SELECT plan FROM public.company_profiles WHERE user_id = auth.uid())
    AND (plan_expires_at IS NOT DISTINCT FROM (SELECT plan_expires_at FROM public.company_profiles WHERE user_id = auth.uid()))
    AND (plan_activated_by IS NOT DISTINCT FROM (SELECT plan_activated_by FROM public.company_profiles WHERE user_id = auth.uid()))
  );

