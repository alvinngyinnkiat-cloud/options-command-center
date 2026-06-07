import type { CryptoAssetLabel } from "./types";

export const CRYPTO_ASSET_OPTIONS: {
  value: CryptoAssetLabel;
  label: string;
  defaultTicker: string;
}[] = [
  { value: "BTC", label: "Bitcoin (BTC)", defaultTicker: "BTC" },
  { value: "ETH", label: "Ethereum (ETH)", defaultTicker: "ETH" },
  { value: "SOL", label: "Solana (SOL)", defaultTicker: "SOL" },
  { value: "Other", label: "Other", defaultTicker: "OTHER" },
];
