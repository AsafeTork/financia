-- Migration: add plan columns to company_profiles
-- Phase 1 of plans/billing rollout. Manual activation by admin (no Stripe yet).
-- Apply via Supabase Studio > SQL Editor.

ALTER TABLE company_profiles
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS plan_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS plan_activated_by text;

-- Enum guard for plan values (free | pro)
ALTER TABLE company_profiles
  DROP CONSTRAINT IF EXISTS company_profiles_plan_check;

ALTER TABLE company_profiles
  ADD CONSTRAINT company_profiles_plan_check
  CHECK (plan IN ('free', 'pro'));

-- Optional index for admin queries listing pro clients
CREATE INDEX IF NOT EXISTS idx_company_profiles_plan
  ON company_profiles (plan);

-- ---------------------------------------------------------------------------
-- SECURITY (RLS) — REQUIRED. The front-end refuses to send these columns,
-- but a malicious client can call sb.from('company_profiles').update({plan:'pro'})
-- from devtools. The DB must reject that.
--
-- The exact policy depends on existing policies on company_profiles. Adapt as
-- needed in Supabase Studio > Authentication > Policies.
--
-- Suggested approach:
--   1) Keep the existing "users can update own profile" policy, but restrict
--      the columns: either use WITH CHECK + USING that disallows plan changes,
--      or replace it with a column-level policy (PostgreSQL 16+ via GRANTs).
--   2) Add a separate UPDATE policy for the admin role that allows changing
--      plan, plan_expires_at, plan_activated_by.
--
-- Quick (coarse) option if column-level policies are not feasible:
--   Force all plan changes through a SECURITY DEFINER function:
--
--   CREATE OR REPLACE FUNCTION set_client_plan(target uuid, new_plan text, actor text)
--   RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
--   BEGIN
--     IF (SELECT role FROM user_roles WHERE user_id = auth.uid()) <> 'admin' THEN
--       RAISE EXCEPTION 'forbidden';
--     END IF;
--     UPDATE company_profiles
--       SET plan = new_plan,
--           plan_expires_at = NULL,
--           plan_activated_by = CASE WHEN new_plan = 'pro' THEN actor ELSE NULL END
--       WHERE user_id = target;
--   END $$;
--
--   Then the front-end calls sb.rpc('set_client_plan', { target, new_plan, actor })
--   and the regular UPDATE policy on company_profiles can omit plan columns.
-- ---------------------------------------------------------------------------
