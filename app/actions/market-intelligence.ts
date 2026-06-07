"use server";

import {
  getMarketIntelligencePageData,
  removeIntelligenceDocument,
  uploadAndAnalyzeDocument,
} from "@/lib/supabase/queries/market-intelligence";
import { getWatchlistScannerData } from "@/lib/supabase/queries/watchlist-scanner";
import type {
  DocumentUploadInput,
  MarketIntelligencePageData,
} from "@/lib/market-intelligence/types";
import { revalidatePath } from "next/cache";

const PATHS = [
  "/market-intelligence",
  "/watchlist",
  "/weekend-review",
  "/risk",
];

function revalidateAll() {
  for (const path of PATHS) {
    revalidatePath(path);
  }
}

export type MarketIntelligenceActionResult =
  | { success: true; data: MarketIntelligencePageData }
  | { success: false; error: string };

export async function uploadIntelligenceDocument(
  input: DocumentUploadInput
): Promise<MarketIntelligenceActionResult> {
  try {
    if (!input.title.trim() || !input.rawText.trim()) {
      return { success: false, error: "Title and document text are required." };
    }

    const scanner = await getWatchlistScannerData();
    const tickers = scanner.rows.map((r) => r.ticker);
    const data = await uploadAndAnalyzeDocument(input, tickers);
    revalidateAll();
    return { success: true, data };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Upload failed.",
    };
  }
}

export async function deleteIntelligenceDocument(
  documentId: string
): Promise<MarketIntelligenceActionResult> {
  try {
    const data = await removeIntelligenceDocument(documentId);
    revalidateAll();
    return { success: true, data };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Delete failed.",
    };
  }
}
