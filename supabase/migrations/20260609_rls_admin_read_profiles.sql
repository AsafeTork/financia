-- Migration: policy RLS que permite admins lerem todos os company_profiles
-- Contexto: fetchClients no AdminPanel precisa ver todos os clientes.
-- Solucao: policy SELECT que libera leitura para o proprio dono OU para quem
--          tem role='admin' em user_roles. Sem isso so a service_role funcionaria
--          (que nao deve estar no front-end).
--
-- Aplicar via Supabase Studio > SQL Editor.

-- Remove policy existente de SELECT se houver (renomeie se o seu tiver outro nome)
DROP POLICY IF EXISTS "admin_read_all_profiles" ON company_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON company_profiles;
DROP POLICY IF EXISTS "users_select_own" ON company_profiles;

-- Nova policy: dono le o proprio, admin le todos
CREATE POLICY "select_own_or_admin"
ON company_profiles FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
      AND role = 'admin'
  )
);

-- Garante que RLS esta ativa na tabela
ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;
