"use client";

import { useEffect } from "react";
import { RotateCcwIcon, TriangleAlertIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useT } from "@/hooks/use-locale";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useT();
  useEffect(() => {
    // Never log wallet secrets. Only the digest is safe for support.
    void error.digest;
  }, [error]);

  return (
    <div className="flex min-h-[60dvh] items-center justify-center p-6">
      <div className="glass-panel w-full max-w-md p-8 text-center">
        <TriangleAlertIcon className="text-destructive mx-auto size-6" strokeWidth={1.7} />
        <h1 className="mt-4 text-[1.5rem]">
          {t("errorPage.title")}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          {t("errorPage.description")}
        </p>
        <Button className="mt-5 w-full" onClick={reset}>
          <RotateCcwIcon />
          {t("errorPage.retry")}
        </Button>
      </div>
    </div>
  );
}
