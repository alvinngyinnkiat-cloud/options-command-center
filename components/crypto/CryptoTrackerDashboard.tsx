import { buildCryptoTrackerPageData } from "@/lib/supabase/queries/crypto-holdings";
import { getEnrichedPortfolioMetrics } from "@/lib/portfolio/enrich-capital-pools";
import { CryptoTrackerClient } from "./CryptoTrackerClient";

export async function CryptoTrackerDashboard() {
  const enriched = await getEnrichedPortfolioMetrics();
  const data = await buildCryptoTrackerPageData(
    enriched.metrics.override,
    enriched.capitalPools
  );
  return <CryptoTrackerClient initialData={data} />;
}
