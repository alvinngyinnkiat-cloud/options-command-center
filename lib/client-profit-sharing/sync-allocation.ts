import { splitTradeProfit } from "./calculations";
import type { ClientTradeAllocation, OptionsTrade } from "@/types/database";

export type ClientAllocationStatus = ClientTradeAllocation["status"];

export function getTradeProfitFromOptionsRow(row: OptionsTrade): number {
  if (row.status === "closed" && row.realized_pnl != null) {
    return Number(row.realized_pnl);
  }
  return Number(row.current_pnl);
}

export function resolveAllocationStatus(
  tradeStatus: OptionsTrade["status"],
  previousStatus?: ClientAllocationStatus
): ClientAllocationStatus {
  if (previousStatus === "Paid") return "Paid";
  if (tradeStatus === "closed") return "Unpaid";
  return "Open";
}

export function buildClientTradeAllocation(
  trade: OptionsTrade,
  userId: string,
  existing?: ClientTradeAllocation | null
): ClientTradeAllocation | null {
  if (!trade.is_client_trade || !trade.client_id) return null;

  const tradeProfit = getTradeProfitFromOptionsRow(trade);
  const myPct = Number(trade.my_profit_share_percent);
  const clientPct = Number(trade.client_profit_share_percent);
  const { clientProfit, myProfit } = splitTradeProfit(
    tradeProfit,
    clientPct,
    myPct
  );
  const status = resolveAllocationStatus(trade.status, existing?.status);
  const now = new Date().toISOString();

  return {
    id: existing?.id ?? crypto.randomUUID(),
    user_id: userId,
    client_id: trade.client_id,
    options_trade_id: trade.id,
    included_in_pool: true,
    trade_profit_loss: tradeProfit,
    my_share_amount: myProfit,
    client_share_amount: clientProfit,
    status,
    created_at: existing?.created_at ?? now,
    updated_at: now,
  };
}

export function isClientProfitSharingTrade(trade: OptionsTrade): boolean {
  return (
    trade.is_client_trade ||
    trade.trade_ownership === "client_profit_sharing"
  );
}
