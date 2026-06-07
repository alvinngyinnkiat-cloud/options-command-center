CREATE TABLE IF NOT EXISTS data_source_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_name text NOT NULL,
  status text NOT NULL CHECK (status IN ('success', 'partial', 'failed')),
  records_updated integer NOT NULL DEFAULT 0,
  records_failed integer NOT NULL DEFAULT 0,
  error_message text,
  started_at timestamptz NOT NULL,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_data_source_logs_user_source
  ON data_source_logs(user_id, source_name, started_at DESC);

ALTER TABLE data_source_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own data source logs"
  ON data_source_logs
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE data_source_logs IS 'Audit log for automated data refresh attempts';
