import type {
  IntelligenceDocument,
  IntelligenceSummary,
  TickerIntelligenceImpact,
} from "@/lib/market-intelligence/types";
import {
  MOCK_INTELLIGENCE_DOCUMENTS,
  MOCK_INTELLIGENCE_SUMMARIES,
  MOCK_TICKER_IMPACTS,
} from "./market-intelligence-fixtures";

let documents: IntelligenceDocument[] = [...MOCK_INTELLIGENCE_DOCUMENTS];
let summaries: IntelligenceSummary[] = [...MOCK_INTELLIGENCE_SUMMARIES];
let impacts: TickerIntelligenceImpact[] = [...MOCK_TICKER_IMPACTS];

export function getMockIntelligenceDocuments(): IntelligenceDocument[] {
  return [...documents];
}

export function getMockIntelligenceSummaries(): IntelligenceSummary[] {
  return [...summaries];
}

export function getMockTickerImpacts(): TickerIntelligenceImpact[] {
  return [...impacts];
}

export function addMockDocument(doc: IntelligenceDocument): void {
  documents = [doc, ...documents];
}

export function addMockSummary(summary: IntelligenceSummary): void {
  summaries = summaries.filter((s) => s.documentId !== summary.documentId);
  summaries = [summary, ...summaries];
}

export function addMockTickerImpacts(
  rows: TickerIntelligenceImpact[]
): void {
  impacts = [...rows, ...impacts];
}

export function deleteMockDocument(id: string): boolean {
  const before = documents.length;
  documents = documents.filter((d) => d.id !== id);
  summaries = summaries.filter((s) => s.documentId !== id);
  impacts = impacts.filter((i) => i.documentId !== id);
  return documents.length < before;
}

export function resetMockMarketIntelligence(): void {
  documents = [...MOCK_INTELLIGENCE_DOCUMENTS];
  summaries = [...MOCK_INTELLIGENCE_SUMMARIES];
  impacts = [...MOCK_TICKER_IMPACTS];
}
