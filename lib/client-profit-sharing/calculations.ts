import {
  calculateClientPnL,
  calculateMyPnL,
  calculateTotalTradePnL,
} from "@/lib/trades/pnl-allocation";
import type { EnrichedTrade } from "@/lib/trades/types";
import type {
  ClientProfile,
  ClientProfitSharingSummary,
  TradeAllocationRow,
} from "./types";
import type { AllocationMapEntry } from "./map-client";

export function getTradeProfit(trade: EnrichedTrade): number {
  return calculateTotalTradePnL(trade);
}

export function splitTradeProfit(
  tradeProfit: number,
  clientSharePct: number,
  mySharePct: number
): { clientProfit: number; myProfit: number } {
  const trade = {
    tradeOwnership: "client_profit_sharing" as const,
    isClientTrade: true,
    myProfitSharePercent: mySharePct,
    clientProfitSharePercent: clientSharePct,
  };
  return {
    myProfit: calculateMyPnL(trade, tradeProfit),
    clientProfit: calculateClientPnL(trade, tradeProfit),
  };
}

function paymentLabel(
  included: boolean,
  status: TradeAllocationRow["allocationStatus"]
): TradeAllocationRow["paymentLabel"] {
  if (!included) return "—";
  if (status === "Paid") return "Paid";
  if (status === "Unpaid") return "Unpaid";
  return "—";
}

export function buildTradeAllocationRows(
  clients: ClientProfile[],
  trades: EnrichedTrade[],
  allocationMap: Map<string, AllocationMapEntry>
): TradeAllocationRow[] {
  const clientById = new Map(clients.map((c) => [c.id, c]));

  const relevantTrades = trades.filter(
    (trade) => trade.isClientTrade || allocationMap.has(trade.id)
  );

  return relevantTrades.map((trade) => {
    const alloc = allocationMap.get(trade.id);
    const clientId = alloc?.clientId ?? trade.clientId ?? clients[0]?.id ?? "";
    const client = clientById.get(clientId);
    const included = trade.isClientTrade || (alloc?.included ?? false);
    const tradeProfit =
      alloc != null ? alloc.tradeProfitLoss : getTradeProfit(trade);
    const clientSharePct = trade.clientProfitSharePercent ?? client?.clientSharePct ?? 40;
    const mySharePct = trade.myProfitSharePercent ?? client?.mySharePct ?? 60;
    const computed = splitTradeProfit(tradeProfit, clientSharePct, mySharePct);
    const clientProfit = included
      ? alloc?.clientShareAmount ?? computed.clientProfit
      : 0;
    const myProfit = included
      ? alloc?.myShareAmount ?? computed.myProfit
      : 0;
    const allocationStatus = alloc?.status ?? (trade.status === "closed" ? "Unpaid" : "Open");

    return {
      allocationId: alloc?.allocationId ?? null,
      tradeId: trade.id,
      clientId,
      ticker: trade.ticker,
      strategyLabel: trade.strategyLabel,
      statusLabel: trade.statusLabel,
      entryDate: trade.entryDate,
      exitDate: trade.status === "closed" ? trade.updatedAt.split("T")[0] : null,
      includedInPool: included,
      tradeProfit,
      clientSharePct,
      mySharePct,
      clientProfit,
      myProfit,
      allocationStatus,
      paymentLabel: paymentLabel(included, allocationStatus),
    };
  });
}

export function buildClientProfitSharingSummary(
  clients: ClientProfile[],
  rows: TradeAllocationRow[]
): ClientProfitSharingSummary {
  const included = rows.filter((r) => r.includedInPool);

  let totalClientProfit = 0;
  let totalClientLoss = 0;
  let totalMySharePl = 0;
  let lifetimeTradeProfit = 0;
  let lifetimeClientShare = 0;
  let lifetimeMyShare = 0;
  let clientShareOwed = 0;

  for (const row of included) {
    lifetimeTradeProfit += row.tradeProfit;
    lifetimeClientShare += row.clientProfit;
    lifetimeMyShare += row.myProfit;
    totalMySharePl += row.myProfit;

    if (row.clientProfit >= 0) {
      totalClientProfit += row.clientProfit;
    } else {
      totalClientLoss += Math.abs(row.clientProfit);
    }

    if (row.allocationStatus === "Unpaid") {
      clientShareOwed += row.clientProfit;
    }
  }

  const totalClientCapital = clients.reduce(
    (s, c) => s + c.capitalContributed,
    0
  );
  const totalPaidToClient = clients.reduce(
    (s, c) => s + c.totalPaidToClient,
    0
  );
  const totalClientNetPl = lifetimeClientShare;
  const outstandingAmountOwed = totalClientNetPl - totalPaidToClient;

  return {
    totalClientCapital,
    allocatedTradesCount: included.length,
    totalClientProfit,
    totalClientLoss,
    totalClientNetPl,
    totalMySharePl,
    clientSharePaid: totalPaidToClient,
    clientShareOwed,
    totalPaidToClient,
    outstandingAmountOwed,
    lifetimeTradeProfit,
    lifetimeClientShare,
    lifetimeMyShare,
  };
}
