"use client";

import { useState } from "react";
import {
  BarChart3Icon,
  CandlestickChartIcon,
  LineChartIcon,
} from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { useT } from "@/hooks/use-locale";
import { cn } from "@/lib/utils";

const MARKETS = [
  {
    id: "dexscreener",
    name: "DexScreener",
    url: "https://dexscreener.com/",
    icon: CandlestickChartIcon,
  },
  {
    id: "coinmarketcap",
    name: "CoinMarketCap",
    url: "https://coinmarketcap.com/",
    icon: BarChart3Icon,
  },
  {
    id: "coinglass",
    name: "CoinGlass",
    url: "https://www.coinglass.com/",
    icon: LineChartIcon,
  },
] as const;

export function MarketsPage() {
  const { t } = useT();
  const [active, setActive] = useState<(typeof MARKETS)[number]["id"]>(
    "dexscreener",
  );
  const market = MARKETS.find((item) => item.id === active) ?? MARKETS[0];

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <PageHeader
        title={t("markets.title")}
        description={t("markets.description")}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {MARKETS.map((item) => {
          const Icon = item.icon;
          const selected = item.id === active;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActive(item.id)}
              aria-pressed={selected}
              className={cn(
                "flex h-10 items-center gap-2 rounded-full border px-4 text-xs font-medium transition-colors duration-[var(--dur-short)]",
                selected
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-rule text-muted-foreground hover:bg-paper-2 hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              {item.name}
            </button>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-[18px] border border-rule bg-card">
        <div className="flex items-center justify-between border-b border-rule px-4 py-3">
          <p className="text-sm font-medium">{market.name}</p>
          <span className="text-muted-foreground text-[0.6875rem]">
            {t("markets.embedded")}
          </span>
        </div>
        <iframe
          key={market.id}
          title={market.name}
          src={market.url}
          className="min-h-[65dvh] w-full bg-background"
          sandbox="allow-forms allow-modals allow-popups allow-same-origin allow-scripts"
          referrerPolicy="no-referrer"
        />
      </div>
    </div>
  );
}
