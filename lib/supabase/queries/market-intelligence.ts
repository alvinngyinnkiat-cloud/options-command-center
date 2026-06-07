import { analyzeDocumentText } from "@/lib/market-intelligence/analyze";
import { buildMarketIntelligencePageData } from "@/lib/market-intelligence/page-data";
import { getAggregatedIntelligenceMap } from "@/lib/market-intelligence/resolve-impacts";
import type {
  DocumentUploadInput,
  IntelligenceDocument,
  IntelligenceSummary,
  MarketIntelligencePageData,
  TickerIntelligenceImpact,
} from "@/lib/market-intelligence/types";
import {
  addMockDocument,
  addMockSummary,
  addMockTickerImpacts,
  deleteMockDocument,
  getMockIntelligenceDocuments,
  getMockIntelligenceSummaries,
  getMockTickerImpacts,
} from "@/lib/mock/market-intelligence-store";
import { getWatchlistScannerData } from "@/lib/supabase/queries/watchlist-scanner";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { createClient } from "@/lib/supabase/server";

export async function getAggregatedIntelligenceImpacts() {
  if (!isSupabaseConfigured()) {
    return getAggregatedIntelligenceMap();
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return getAggregatedIntelligenceMap();

    const { data } = await supabase
      .from("market_intelligence_ticker_impacts")
      .select("*")
      .eq("user_id", user.id);

    if (!data?.length) return getAggregatedIntelligenceMap();

    const impacts = (data as TickerIntelligenceImpact[]).map((row) => ({
      ...row,
      impactDate: (row as unknown as { impact_date: string }).impact_date ?? row.impactDate,
    }));

    const { buildAggregatedImpacts } = await import(
      "@/lib/market-intelligence/page-data"
    );
    const aggregated = buildAggregatedImpacts(impacts, []);
    return new Map(aggregated.map((a) => [a.ticker, a]));
  } catch {
    return getAggregatedIntelligenceMap();
  }
}

export async function getMarketIntelligencePageData(): Promise<MarketIntelligencePageData> {
  const [scanner, documents, summaries, impacts] = await Promise.all([
    getWatchlistScannerData(),
    getIntelligenceDocuments(),
    getIntelligenceSummaries(),
    getTickerImpacts(),
  ]);

  const dataSource = isSupabaseConfigured() ? "supabase" : "mock";

  return buildMarketIntelligencePageData({
    documents,
    summaries,
    tickerImpacts: impacts,
    scannerRows: scanner.rows,
    dataSource: documents.length > 0 ? dataSource : "mock",
  });
}

async function getIntelligenceDocuments(): Promise<IntelligenceDocument[]> {
  if (!isSupabaseConfigured()) return getMockIntelligenceDocuments();
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return getMockIntelligenceDocuments();
    const { data } = await supabase
      .from("market_intelligence_documents")
      .select("*")
      .eq("user_id", user.id)
      .order("uploaded_at", { ascending: false });
    if (!data?.length) return getMockIntelligenceDocuments();
    return mapDocumentsFromDb(data);
  } catch {
    return getMockIntelligenceDocuments();
  }
}

async function getIntelligenceSummaries(): Promise<IntelligenceSummary[]> {
  if (!isSupabaseConfigured()) return getMockIntelligenceSummaries();
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return getMockIntelligenceSummaries();
    const { data } = await supabase
      .from("market_intelligence_summaries")
      .select("*")
      .eq("user_id", user.id);
    if (!data?.length) return getMockIntelligenceSummaries();
    return mapSummariesFromDb(data);
  } catch {
    return getMockIntelligenceSummaries();
  }
}

async function getTickerImpacts(): Promise<TickerIntelligenceImpact[]> {
  if (!isSupabaseConfigured()) return getMockTickerImpacts();
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return getMockTickerImpacts();
    const { data } = await supabase
      .from("market_intelligence_ticker_impacts")
      .select("*")
      .eq("user_id", user.id)
      .order("impact_date", { ascending: false });
    if (!data?.length) return getMockTickerImpacts();
    return mapImpactsFromDb(data);
  } catch {
    return getMockTickerImpacts();
  }
}

function mapDocumentsFromDb(rows: unknown[]): IntelligenceDocument[] {
  return rows.map((r) => {
    const row = r as Record<string, unknown>;
    return {
      id: String(row.id),
      title: String(row.title),
      sourceType: row.source_type as IntelligenceDocument["sourceType"],
      fileName: row.file_name != null ? String(row.file_name) : null,
      mimeType: row.mime_type != null ? String(row.mime_type) : null,
      rawText: String(row.raw_text),
      publishedAt: row.published_at != null ? String(row.published_at) : null,
      uploadedAt: String(row.uploaded_at),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  });
}

function mapSummariesFromDb(rows: unknown[]): IntelligenceSummary[] {
  return rows.map((r) => {
    const row = r as Record<string, unknown>;
    return {
      id: String(row.id),
      documentId: String(row.document_id),
      keyTakeaways: (row.key_takeaways as string[]) ?? [],
      bullishSignals: (row.bullish_signals as string[]) ?? [],
      bearishSignals: (row.bearish_signals as string[]) ?? [],
      overallSentiment: row.overall_sentiment as IntelligenceSummary["overallSentiment"],
      sentimentScore: row.sentiment_score as IntelligenceSummary["sentimentScore"],
      summaryText: row.summary_text != null ? String(row.summary_text) : null,
      generatedAt: String(row.generated_at),
    };
  });
}

function mapImpactsFromDb(rows: unknown[]): TickerIntelligenceImpact[] {
  return rows.map((r) => {
    const row = r as Record<string, unknown>;
    return {
      id: String(row.id),
      documentId: row.document_id != null ? String(row.document_id) : null,
      watchlistId: row.watchlist_id != null ? String(row.watchlist_id) : null,
      ticker: String(row.ticker),
      impactDate: String(row.impact_date),
      sentiment: row.sentiment as TickerIntelligenceImpact["sentiment"],
      sentimentScore: row.sentiment_score as TickerIntelligenceImpact["sentimentScore"],
      impactScore: Number(row.impact_score),
      rationale: row.rationale != null ? String(row.rationale) : null,
    };
  });
}

export async function uploadAndAnalyzeDocument(
  input: DocumentUploadInput,
  watchlistTickers: string[]
): Promise<MarketIntelligencePageData> {
  const now = new Date().toISOString();
  const docId = crypto.randomUUID();
  const analysis = analyzeDocumentText(input.rawText, watchlistTickers);

  const doc: IntelligenceDocument = {
    id: docId,
    title: input.title,
    sourceType: input.sourceType,
    fileName: input.fileName ?? null,
    mimeType: input.mimeType ?? "text/plain",
    rawText: input.rawText,
    publishedAt: input.publishedAt ?? null,
    uploadedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  const summary: IntelligenceSummary = {
    id: crypto.randomUUID(),
    documentId: docId,
    ...analysis.summary,
    generatedAt: now,
  };

  const today = now.split("T")[0];
  const impacts: TickerIntelligenceImpact[] = analysis.tickerImpacts.map(
    (impact) => ({
      id: crypto.randomUUID(),
      documentId: docId,
      impactDate: today,
      ...impact,
    })
  );

  if (!isSupabaseConfigured()) {
    addMockDocument(doc);
    addMockSummary(summary);
    addMockTickerImpacts(impacts);
    return getMarketIntelligencePageData();
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userId = user?.id ?? "mock-user";

    await supabase.from("market_intelligence_documents").insert({
      id: doc.id,
      user_id: userId,
      title: doc.title,
      source_type: doc.sourceType,
      file_name: doc.fileName,
      mime_type: doc.mimeType,
      raw_text: doc.rawText,
      published_at: doc.publishedAt,
    } as never);

    await supabase.from("market_intelligence_summaries").insert({
      id: summary.id,
      user_id: userId,
      document_id: summary.documentId,
      key_takeaways: summary.keyTakeaways,
      bullish_signals: summary.bullishSignals,
      bearish_signals: summary.bearishSignals,
      overall_sentiment: summary.overallSentiment,
      sentiment_score: summary.sentimentScore,
      summary_text: summary.summaryText,
    } as never);

    if (impacts.length > 0) {
      await supabase.from("market_intelligence_ticker_impacts").insert(
        impacts.map((i) => ({
          id: i.id,
          user_id: userId,
          document_id: i.documentId,
          watchlist_id: i.watchlistId,
          ticker: i.ticker,
          impact_date: i.impactDate,
          sentiment: i.sentiment,
          sentiment_score: i.sentimentScore,
          impact_score: i.impactScore,
          rationale: i.rationale,
        })) as never
      );
    }
  } catch {
    addMockDocument(doc);
    addMockSummary(summary);
    addMockTickerImpacts(impacts);
  }

  return getMarketIntelligencePageData();
}

export async function removeIntelligenceDocument(
  documentId: string
): Promise<MarketIntelligencePageData> {
  if (!isSupabaseConfigured()) {
    deleteMockDocument(documentId);
    return getMarketIntelligencePageData();
  }

  try {
    const supabase = await createClient();
    await supabase
      .from("market_intelligence_documents")
      .delete()
      .eq("id", documentId);
  } catch {
    deleteMockDocument(documentId);
  }

  return getMarketIntelligencePageData();
}
