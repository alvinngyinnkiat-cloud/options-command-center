import type { EnrichedCryptoHolding } from "@/lib/crypto/types";
import type { CryptoHolding } from "@/types/database";
import type { HoldingInput, PortfolioRawInput } from "./types";
import { isCryptoCashAsset } from "./capital-pools";

const CRYPTO_TICKERS = new Set(["BTC", "ETH", "SOL", "CRYPTO"]);

function isLegacyCryptoHolding(h: HoldingInput): boolean {
  const t = h.ticker.toUpperCase();
  return (
    h.asset_type === "other" &&
    (CRYPTO_TICKERS.has(t) || h.ticker.toLowerCase().includes("crypto"))
  );
}

/** Maps crypto tracker row to portfolio holding for dashboard aggregation. */
export function cryptoHoldingToPortfolioInput(
  holding: CryptoHolding | EnrichedCryptoHolding
): HoldingInput {
  const currentValueSgd =
    "current_value_sgd" in holding
      ? Number(holding.current_value_sgd)
      : holding.currentValueSgd;
  const totalInvestedSgd =
    "total_invested_sgd" in holding
      ? Number(holding.total_invested_sgd)
      : holding.totalInvestedSgd;
  const ticker = holding.ticker;

  return {
    ticker,
    asset_type: "other",
    currency: "SGD",
    market_value_native: currentValueSgd,
    fx_rate_to_sgd: 1,
    market_value_sgd: currentValueSgd,
    market_value: currentValueSgd,
    cost_basis: totalInvestedSgd,
  };
}

/**
 * Replaces legacy crypto holdings in portfolio raw input with crypto tracker values.
 * Feeds Portfolio Dashboard crypto section and cryptoValue metric.
 */
export function applyCryptoTrackerToPortfolioRaw(
  raw: PortfolioRawInput,
  cryptoRows: (CryptoHolding | EnrichedCryptoHolding)[]
): PortfolioRawInput {
  if (cryptoRows.length === 0) return raw;

  const nonCrypto = raw.holdings.filter((h) => !isLegacyCryptoHolding(h));
  const assetRows = cryptoRows.filter(
    (r) =>
      !isCryptoCashAsset(
        r.ticker,
        "asset_label" in r ? r.asset_label : r.assetLabel
      )
  );
  const trackerHoldings = assetRows.map(cryptoHoldingToPortfolioInput);

  return {
    ...raw,
    holdings: [...nonCrypto, ...trackerHoldings],
  };
}

export function getCryptoPortfolioValueSgd(
  cryptoRows: (CryptoHolding | EnrichedCryptoHolding)[]
): number {
  return cryptoRows.reduce((s, h) => {
    const v =
      "current_value_sgd" in h
        ? Number(h.current_value_sgd)
        : h.currentValueSgd;
    return s + v;
  }, 0);
}
