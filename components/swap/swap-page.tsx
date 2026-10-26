"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { AlertTriangleIcon, RefreshCwIcon } from "lucide-react";
import { useAccount } from "wagmi";

import { PageHeader } from "@/components/common/page-header";
import { WidgetErrorBoundary } from "@/components/swap/widget-error-boundary";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useT } from "@/hooks/use-locale";
import { formatFeePercent } from "@/lib/i18n/format";
import { LIFI_FEE } from "@/lib/lifi/config";

const LifiWidgetClient = dynamic(
  () => import("@/components/swap/lifi-widget-client"),
  {
    ssr: false,
    loading: () => <WidgetLoading />,
  },
);

function WidgetLoading() {
  const { t } = useT();
  return (
    <div className="glass-panel min-h-[32rem] rounded-[22px] p-5 md:min-h-0">
      <div className="space-y-3">
        <Skeleton className="h-24 w-full rounded-[10px]" />
        <Skeleton className="h-24 w-full rounded-[10px]" />
        <Skeleton className="h-11 w-full rounded-full" />
      </div>
      <p className="text-muted-foreground mt-3 text-center text-[0.6875rem]">
        {t("swap.connectingDescription")}
      </p>
    </div>
  );
}

function WidgetError({ onRetry }: { onRetry: () => void }) {
  const { t } = useT();
  return (
    <div className="glass-panel flex min-h-[32rem] flex-col items-center justify-center rounded-[22px] p-6 text-center md:min-h-[22rem]">
      <AlertTriangleIcon
        className="text-destructive size-5"
        strokeWidth={1.7}
      />
      <h2 className="mt-4 text-[1.25rem]">{t("swap.widgetError")}</h2>
      <p className="text-muted-foreground mt-2 max-w-sm text-[0.75rem] leading-6">
        {t("swap.widgetErrorDescription")}
      </p>
      <Button variant="outline" className="mt-4" onClick={onRetry}>
        <RefreshCwIcon />
        {t("swap.reload")}
      </Button>
    </div>
  );
}

export function SwapPage() {
  const { t, locale } = useT();
  const { isConnected } = useAccount();
  const [widgetKey, setWidgetKey] = useState(0);

  return (
    <div className="mx-auto w-full max-w-[640px]">
      <PageHeader
        title={t("swap.title")}
      />

      {isConnected ? (
        <WidgetErrorBoundary
          key={widgetKey}
          fallback={(reset) => (
            <WidgetError
              onRetry={() => {
                reset();
                setWidgetKey((key) => key + 1);
              }}
            />
          )}
        >
          <LifiWidgetClient />
        </WidgetErrorBoundary>
      ) : (
        <div className="glass-panel min-h-[32rem] rounded-[22px] p-5">
          <div className="space-y-3">
            <Skeleton className="h-24 w-full rounded-[10px]" />
            <Skeleton className="h-24 w-full rounded-[10px]" />
          </div>
          <p className="text-muted-foreground mt-3 text-center text-[0.6875rem]">
            {t("swap.connectingDescription")}
          </p>
        </div>
      )}

      <div className="text-muted-foreground mt-4 space-y-1 text-[0.6875rem] leading-5">
        <p>{t("swap.disclaimer")}</p>
        <p>
          {t("swap.feeNote", {
            fee: formatFeePercent(LIFI_FEE, locale),
          })}
        </p>
      </div>
    </div>
  );
}
