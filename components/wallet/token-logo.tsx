"use client";

import { useEffect, useState } from "react";

import { isSafeImageUrl } from "@/lib/wallet/assets";
import { cn } from "@/lib/utils";

export function TokenLogo({
  src,
  symbol,
  size = 40,
  className,
}: {
  src?: string;
  symbol: string;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed || !isSafeImageUrl(src)) {
    return (
      <div
        aria-hidden="true"
        className={cn(
          "bg-primary/10 text-primary ring-primary/15 flex shrink-0 items-center justify-center rounded-full font-medium ring-1",
          className,
        )}
        style={{ width: size, height: size, fontSize: Math.max(10, size * 0.34) }}
      >
        {symbol.slice(0, 2).toUpperCase()}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      loading="eager"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={cn(
        "bg-card shrink-0 rounded-full object-contain ring-1 ring-border",
        className,
      )}
      style={{ width: size, height: size }}
    />
  );
}
