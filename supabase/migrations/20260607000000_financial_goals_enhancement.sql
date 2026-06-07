-- Financial goals enhancement: start date, archive, yield, change history

ALTER TABLE public.financial_goals
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS assumed_yield_pct NUMERIC(5, 2);

CREATE INDEX IF NOT EXISTS idx_financial_goals_user_archived
  ON public.financial_goals(user_id, is_archived);

CREATE TABLE IF NOT EXISTS public.financial_goal_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES public.financial_goals(id) ON DELETE CASCADE,
  goal_name TEXT NOT NULL,
  field_name TEXT NOT NULL,
  previous_value TEXT,
  new_value TEXT,
  change_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_financial_goal_changes_goal_id
  ON public.financial_goal_changes(goal_id);
CREATE INDEX IF NOT EXISTS idx_financial_goal_changes_user_id
  ON public.financial_goal_changes(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_goal_changes_created_at
  ON public.financial_goal_changes(created_at DESC);

ALTER TABLE public.financial_goal_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own financial_goal_changes"
  ON public.financial_goal_changes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.financial_goal_changes IS
  'Audit log when goal targets or key fields are edited.';
