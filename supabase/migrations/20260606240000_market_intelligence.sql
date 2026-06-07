-- Phase 14: Market Intelligence Center
-- Intelligence layer augments technical scanner at 25% weight (technical remains 75%).
-- Does NOT auto-generate or modify support/resistance.

CREATE TABLE public.market_intelligence_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (
    source_type IN (
      'newsletter',
      'research',
      'commentary',
      'earnings',
      'analyst_notes',
      'reddit',
      'personal_notes'
    )
  ),
  file_name TEXT,
  mime_type TEXT,
  raw_text TEXT NOT NULL,
  published_at DATE,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.market_intelligence_documents IS
  'Uploaded market intelligence documents — newsletters, research, commentary, etc.';

CREATE TABLE public.market_intelligence_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES public.market_intelligence_documents(id) ON DELETE CASCADE,
  key_takeaways JSONB NOT NULL DEFAULT '[]',
  bullish_signals JSONB NOT NULL DEFAULT '[]',
  bearish_signals JSONB NOT NULL DEFAULT '[]',
  overall_sentiment TEXT NOT NULL CHECK (
    overall_sentiment IN (
      'very_bullish',
      'bullish',
      'neutral',
      'bearish',
      'very_bearish'
    )
  ),
  sentiment_score SMALLINT NOT NULL CHECK (sentiment_score >= -2 AND sentiment_score <= 2),
  summary_text TEXT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (document_id)
);

COMMENT ON TABLE public.market_intelligence_summaries IS
  'AI/rule-generated summaries from intelligence documents.';

CREATE TABLE public.market_intelligence_ticker_impacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id UUID REFERENCES public.market_intelligence_documents(id) ON DELETE SET NULL,
  watchlist_id TEXT,
  ticker TEXT NOT NULL,
  impact_date DATE NOT NULL DEFAULT CURRENT_DATE,
  sentiment TEXT NOT NULL CHECK (
    sentiment IN (
      'very_bullish',
      'bullish',
      'neutral',
      'bearish',
      'very_bearish'
    )
  ),
  sentiment_score SMALLINT NOT NULL CHECK (sentiment_score >= -2 AND sentiment_score <= 2),
  impact_score NUMERIC(5, 2) NOT NULL CHECK (impact_score >= 0 AND impact_score <= 100),
  rationale TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.market_intelligence_ticker_impacts IS
  'Per-ticker watchlist impact from market intelligence — feeds 25% combined scanner weight.';

CREATE INDEX idx_mi_documents_user ON public.market_intelligence_documents(user_id);
CREATE INDEX idx_mi_summaries_document ON public.market_intelligence_summaries(document_id);
CREATE INDEX idx_mi_ticker_impacts_user_ticker ON public.market_intelligence_ticker_impacts(user_id, ticker);
CREATE INDEX idx_mi_ticker_impacts_date ON public.market_intelligence_ticker_impacts(impact_date DESC);

CREATE TRIGGER set_market_intelligence_documents_updated_at
  BEFORE UPDATE ON public.market_intelligence_documents
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_market_intelligence_summaries_updated_at
  BEFORE UPDATE ON public.market_intelligence_summaries
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_market_intelligence_ticker_impacts_updated_at
  BEFORE UPDATE ON public.market_intelligence_ticker_impacts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.market_intelligence_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_intelligence_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_intelligence_ticker_impacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own market_intelligence_documents"
  ON public.market_intelligence_documents FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own market_intelligence_summaries"
  ON public.market_intelligence_summaries FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own market_intelligence_ticker_impacts"
  ON public.market_intelligence_ticker_impacts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.scanner_scores
  ADD COLUMN IF NOT EXISTS intelligence_score NUMERIC(5, 2)
    CHECK (intelligence_score IS NULL OR (intelligence_score >= 0 AND intelligence_score <= 100)),
  ADD COLUMN IF NOT EXISTS combined_score NUMERIC(5, 2)
    CHECK (combined_score IS NULL OR (combined_score >= 0 AND combined_score <= 100)),
  ADD COLUMN IF NOT EXISTS intelligence_sentiment TEXT,
  ADD COLUMN IF NOT EXISTS intelligence_reason TEXT;

COMMENT ON COLUMN public.scanner_scores.intelligence_score IS
  'Market intelligence layer score 0-100 (25% weight in combined score).';
COMMENT ON COLUMN public.scanner_scores.combined_score IS
  'Combined score: technical * 0.75 + intelligence * 0.25.';
