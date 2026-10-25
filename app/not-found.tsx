"use client";

import Link from "next/link";
import { CompassIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useT } from "@/hooks/use-locale";

export default function NotFound() {
  const { t } = useT();
  return (
    <div className="flex min-h-[60dvh] items-center justify-center p-6">
      <div className="text-center">
        <CompassIcon className="text-muted-foreground mx-auto size-6" strokeWidth={1.7} />
        <p className="text-primary mt-3 text-sm font-semibold">404</p>
        <h1 className="mt-1 text-[1.75rem]">
          {t("notFound.title")}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          {t("notFound.description")}
        </p>
        <Button asChild className="mt-5">
          <Link href="/wallet">{t("notFound.back")}</Link>
        </Button>
      </div>
    </div>
  );
}
