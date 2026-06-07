import type { AutoWatchlistCategoryId } from "./types";

export const MEGA_CAP_MIN_B = 200;
export const LARGE_CAP_MIN_B = 100;
export const LARGE_CAP_MAX_B = 199;
export const MID_LARGE_CAP_MIN_B = 10;
export const MID_LARGE_CAP_MAX_B = 50;

export const CATEGORY_LIMITS: Record<AutoWatchlistCategoryId, number> = {
  mega_cap_leaders: 10,
  mega_cap_pullback: 5,
  large_cap_pullback: 3,
  mid_large_cap_pullback: 3,
};

export const CATEGORY_LABELS: Record<
  AutoWatchlistCategoryId,
  { title: string; description: string }
> = {
  mega_cap_leaders: {
    title: "Mega Cap Leaders",
    description: "Market cap ≥ $200B · sorted by market cap · top 10",
  },
  mega_cap_pullback: {
    title: "Mega Cap Pullback",
    description: "Market cap ≥ $200B · 1-year performance < 0% · top 5",
  },
  large_cap_pullback: {
    title: "Large Cap Pullback",
    description: "Market cap $100B–$199B · 1-year performance < 0% · top 3",
  },
  mid_large_cap_pullback: {
    title: "Mid/Large Cap Pullback",
    description: "Market cap $10B–$50B · 1-year performance < 0% · top 3",
  },
};
