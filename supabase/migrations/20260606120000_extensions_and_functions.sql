-- Phase 1: Extensions and shared functions
-- See PROJECT_RULES.md for permanent trading system rules.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Auto-update updated_at on row modification
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.handle_updated_at() IS
  'Sets updated_at to current timestamp on UPDATE.';
