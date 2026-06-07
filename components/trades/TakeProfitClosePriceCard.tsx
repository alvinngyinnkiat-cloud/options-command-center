"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { formatOptionValuePerContract } from "@/lib/trades/format";
import { Check, Copy } from "lucide-react";

interface TakeProfitClosePriceCardProps {
  premiumPerContract: number;
  takeProfitClosePrice: number;
  takeProfitNetOfFees: number;
}

export function TakeProfitClosePriceCard({
  premiumPerContract,
  takeProfitClosePrice,
  takeProfitNetOfFees,
}: TakeProfitClosePriceCardProps) {
  const [copied, setCopied] = useState(false);

  async function copyTpOrder() {
    await navigator.clipboard.writeText(takeProfitClosePrice.toFixed(2));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="rounded-md border border-profit/30 bg-profit/5 p-3 space-y-3">
      <p className="text-[10px] uppercase tracking-wider text-terminal-muted">
        Take Profit Close Price
      </p>
      <dl className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <dt className="text-terminal-muted">Premium Received</dt>
          <dd className="font-mono font-semibold text-terminal-text">
            {formatOptionValuePerContract(premiumPerContract)}
          </dd>
        </div>
        <div>
          <dt className="text-terminal-muted">TP Close Price</dt>
          <dd className="font-mono font-semibold text-profit">
            {formatOptionValuePerContract(takeProfitClosePrice)}
          </dd>
        </div>
        <div>
          <dt className="text-terminal-muted">TP Net of Fees</dt>
          <dd className="font-mono font-semibold text-terminal-text">
            {formatOptionValuePerContract(takeProfitNetOfFees)}
          </dd>
        </div>
      </dl>
      <Button variant="secondary" size="sm" onClick={copyTpOrder}>
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5" />
            Copied
          </>
        ) : (
          <>
            <Copy className="h-3.5 w-3.5" />
            Copy TP Order
          </>
        )}
      </Button>
    </section>
  );
}
