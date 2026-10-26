"use client";

import { useEffect, useMemo } from "react";
import { LiFiWidget, useWidgetEvents, WidgetEvent } from "@lifi/widget";
import type { Process, Route } from "@lifi/sdk";
import { useTheme } from "next-themes";
import { useAccount } from "wagmi";

import { useT } from "@/hooks/use-locale";
import { createWidgetConfig } from "@/lib/lifi/widget-config";
import { recordWidgetRoute } from "@/lib/lifi/route-history";

type RouteExecutionUpdate = { route: Route; process: Process };

function WidgetEventBridge() {
  const events = useWidgetEvents();

  useEffect(() => {
    const onStarted = (route: Route) => {
      void recordWidgetRoute(route, "started");
    };
    const onUpdated = (update: RouteExecutionUpdate) => {
      void recordWidgetRoute(update.route, "updated", update.process);
    };
    const onCompleted = (route: Route) => {
      void recordWidgetRoute(route, "completed");
    };
    const onFailed = (update: RouteExecutionUpdate) => {
      void recordWidgetRoute(update.route, "failed", update.process);
    };

    events.on(WidgetEvent.RouteExecutionStarted, onStarted);
    events.on(WidgetEvent.RouteExecutionUpdated, onUpdated);
    events.on(WidgetEvent.RouteExecutionCompleted, onCompleted);
    events.on(WidgetEvent.RouteExecutionFailed, onFailed);

    return () => {
      events.off(WidgetEvent.RouteExecutionStarted, onStarted);
      events.off(WidgetEvent.RouteExecutionUpdated, onUpdated);
      events.off(WidgetEvent.RouteExecutionCompleted, onCompleted);
      events.off(WidgetEvent.RouteExecutionFailed, onFailed);
    };
  }, [events]);

  return null;
}

export default function LifiWidgetClient() {
  const { t, locale } = useT();
  const { resolvedTheme } = useTheme();
  const { address, isConnected } = useAccount();
  const appearance = resolvedTheme === "dark" ? "dark" : "light";

  const config = useMemo(
    () =>
      createWidgetConfig({
        appearance,
        locale,
        tabLabels: {
          swap: t("swap.swapTab"),
          bridge: t("swap.bridgeTab"),
        },
      }),
    [appearance, locale, t],
  );

  if (!isConnected) return null;

  return (
    <div className="lifi-widget-shell min-h-[32rem] w-full md:min-h-0">
      <WidgetEventBridge />
      <LiFiWidget
        key={address ?? "local"}
        integrator="lilixy"
        config={config}
      />
    </div>
  );
}
