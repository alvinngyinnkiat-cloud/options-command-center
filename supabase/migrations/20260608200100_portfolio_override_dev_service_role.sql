-- Phase 16G.3: Allow dev server writes (service_role) to pass portfolio_overrides manual guard.
-- Renamed from 20260608140000 — that version was already used by option_price_precision.

GRANT EXECUTE ON FUNCTION public.is_authenticated_user_request() TO service_role;

CREATE OR REPLACE FUNCTION public.is_authenticated_user_request()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (auth.role() = 'authenticated' AND (SELECT auth.uid()) IS NOT NULL)
    OR auth.role() = 'service_role';
$$;

COMMENT ON FUNCTION public.is_authenticated_user_request() IS
  'True for signed-in user JWT or trusted server-side service_role (dev admin writes).';
