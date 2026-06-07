import { MOCK_REFERENCE_ISO } from "@/lib/mock/reference-dates";
import type {
  ClientProfileRecord,
  ClientTradeAllocation,
} from "@/types/database";

const MOCK_USER = "mock-user";

const now = MOCK_REFERENCE_ISO;

export const MOCK_PROFIT_SHARING_CLIENTS: ClientProfileRecord[] = [
  {
    id: "client-1",
    user_id: MOCK_USER,
    client_name: "Alex Tan",
    capital_contributed: 50_000,
    client_share_percent: 40,
    my_share_percent: 60,
    total_paid_to_client: 8_500,
    notes: "Participates in selected SPY/QQQ spreads only",
    created_at: now,
    updated_at: now,
  },
];

export const MOCK_PROFIT_SHARING_ALLOCATIONS: ClientTradeAllocation[] = [
  {
    id: "alloc-1",
    user_id: MOCK_USER,
    client_id: "client-1",
    options_trade_id: "trade-1",
    included_in_pool: true,
    trade_profit_loss: 420,
    my_share_amount: 252,
    client_share_amount: 168,
    status: "Open",
    created_at: now,
    updated_at: now,
  },
  {
    id: "alloc-2",
    user_id: MOCK_USER,
    client_id: "client-1",
    options_trade_id: "trade-2",
    included_in_pool: true,
    trade_profit_loss: 185,
    my_share_amount: 111,
    client_share_amount: 74,
    status: "Open",
    created_at: now,
    updated_at: now,
  },
  {
    id: "alloc-3",
    user_id: MOCK_USER,
    client_id: "client-1",
    options_trade_id: "trade-4",
    included_in_pool: true,
    trade_profit_loss: -120,
    my_share_amount: -72,
    client_share_amount: -48,
    status: "Unpaid",
    created_at: now,
    updated_at: now,
  },
];
