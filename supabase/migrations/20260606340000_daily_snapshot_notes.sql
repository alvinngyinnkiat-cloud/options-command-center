-- Optional notes on daily portfolio snapshot records
ALTER TABLE public.daily_portfolio_snapshots
  ADD COLUMN IF NOT EXISTS notes TEXT;
