"use client";

import { useEffect, useState } from "react";

import { useLifiChains } from "@/hooks/use-lifi-chains";
import { designTokens } from "@/lib/design/tokens";
import { isSafeImageUrl } from "@/lib/wallet/assets";
import { cn } from "@/lib/utils";

const brand = designTokens.networkBrand;

const LOCAL_LOGOS: Record<number, string> = {
  1: "/networks/ethereum.svg",
  56: "/networks/bsc.svg",
  137: "/networks/polygon.svg",
  42161: "/networks/arbitrum.svg",
  10: "/networks/optimism.svg",
  8453: "/networks/base.svg",
  43114: "/networks/avalanche.svg",
  146: "/networks/sonic.svg",
  324: "/networks/zksync.svg",
  4663: "/networks/robinhood.svg",
};

const KNOWN: Record<number, { label: string; node: React.ReactNode }> = {
  1: {
    label: "Ethereum",
    node: (
      <>
        <circle cx="16" cy="16" r="16" fill={brand.ethereum} />
        <path d="M16 5L24 16.2L16 21L8 16.2L16 5Z" fill="white" opacity=".9" />
        <path d="M16 23L24 18.2L16 27L8 18.2L16 23Z" fill="white" opacity=".65" />
      </>
    ),
  },
  56: {
    label: "BNB Chain",
    node: (
      <>
        <circle cx="16" cy="16" r="16" fill={brand.bnb} />
        <path
          d="M16 7L19.6 10.6L16 14.2L12.4 10.6L16 7ZM8.5 14.5L12.1 18.1L8.5 21.7L4.9 18.1L8.5 14.5ZM23.5 14.5L27.1 18.1L23.5 21.7L19.9 18.1L23.5 14.5ZM16 20.8L19.6 24.4L16 28L12.4 24.4L16 20.8Z"
          fill="white"
        />
      </>
    ),
  },
  137: {
    label: "Polygon",
    node: (
      <>
        <circle cx="16" cy="16" r="16" fill={brand.polygon} />
        <path
          d="M21.6 12.1c-.5-.3-1.1-.3-1.6 0l-2.6 1.5-1.8 1-.5.3-2.6 1.5c-.5.3-1.1.3-1.6 0L8.3 15c-.5-.3-.8-.8-.8-1.4v-2.8c0-.6.3-1.1.8-1.4l2.5-1.4c.5-.3 1.1-.3 1.6 0l2.5 1.4c.5.3.8.8.8 1.4v1.4l1.8-1V8.9c0-.6-.3-1.1-.8-1.4l-4.9-2.8c-.5-.3-1.1-.3-1.6 0L4.9 7.5c-.5.3-.8.8-.8 1.4v5.6c0 .6.3 1.1.8 1.4l4.9 2.8c.5.3 1.1.3 1.6 0l2.6-1.5 1.8-1 .5-.3 2.6-1.5c.5-.3 1.1-.3 1.6 0L24 15.7c.5.3.8.8.8 1.4v2.8c0 .6-.3 1.1-.8 1.4l-2.5 1.4c-.5.3-1.1.3-1.6 0l-2.5-1.4c-.5-.3-.8-.8-.8-1.4v-1.4l-1.8 1v1.4c0 .6.3 1.1.8 1.4l4.9 2.8c.5.3 1.1.3 1.6 0l4.9-2.8c.5-.3.8-.8.8-1.4v-5.6c0-.6-.3-1.1-.8-1.4l-4.9-2.8Z"
          fill="white"
        />
      </>
    ),
  },
  42161: {
    label: "Arbitrum",
    node: (
      <>
        <circle cx="16" cy="16" r="16" fill={brand.arbitrumDark} />
        <path d="M16 5L25.7 21.6L16 27L6.3 21.6L16 5Z" fill={brand.arbitrumBlue} />
        <path d="M16 12.5L21.6 22.2L16 25.2L10.4 22.2L16 12.5Z" fill={brand.arbitrumMuted} opacity=".75" />
      </>
    ),
  },
  10: {
    label: "Optimism",
    node: (
      <>
        <circle cx="16" cy="16" r="16" fill={brand.optimism} />
        <path
          d="M10.5 20.5c-1.5 0-2.6-.9-2.6-2.4 0-1.7 1.4-3.3 3.4-3.3 1.5 0 2.5.9 2.5 2.3 0 1.9-1.4 3.4-3.3 3.4Zm.3-1.6c.8 0 1.4-.7 1.4-1.7 0-.5-.2-.8-.7-.8-.8 0-1.4.8-1.4 1.7 0 .5.3.8.7.8Zm5.5-4h2l-.7 5.4h-1.9l.6-5.4Zm3.7 0h3.4c1.1 0 1.8.5 1.8 1.4 0 1.2-.9 2-2.3 2h-1.3l-.2 2H19l.6-5.4Zm1.8 1.5-.2 1.5h1c.5 0 .8-.3.8-.7 0-.3-.2-.5-.6-.5h-1Z"
          fill="white"
        />
      </>
    ),
  },
  8453: {
    label: "Base",
    node: (
      <>
        <circle cx="16" cy="16" r="16" fill={brand.base} />
        <path
          d="M16 6a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 3.2a6.8 6.8 0 0 1 6.2 4.1h-7.7v1.4H23a6.8 6.8 0 0 1 0 2.6h-8.4v1.4h7.7A6.8 6.8 0 1 1 16 9.2Z"
          fill="white"
        />
      </>
    ),
  },
  43114: {
    label: "Avalanche",
    node: (
      <>
        <circle cx="16" cy="16" r="16" fill={brand.avalanche} />
        <path d="M16 7.2c.7 0 1.2.5 1.5 1.1l7.7 13.4c.3.6.3 1.2-.1 1.6-.3.4-.7.5-1.3.5H8.2c-.6 0-1-.1-1.3-.5-.4-.4-.4-1-.1-1.6l7.7-13.4c.3-.6.8-1.1 1.5-1.1Z" fill="white" />
        <path d="M12 20.2h3.4l1.8-3.2-1.8-3.2L12 20.2Z" fill={brand.avalanche} />
      </>
    ),
  },
};

export function NetworkLogo({
  chainId,
  size = 28,
  className,
  label,
}: {
  chainId: number;
  size?: number;
  className?: string;
  label?: string;
}) {
  const lifiChains = useLifiChains();
  const remoteLogo = lifiChains.data?.find((chain) => chain.id === chainId)
    ?.logoURI;
  const [failed, setFailed] = useState(false);
  const [localFailed, setLocalFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
    setLocalFailed(false);
  }, [chainId, remoteLogo]);

  const localLogo = LOCAL_LOGOS[chainId];
  if (localLogo && !localFailed) {
    return (
      <img
        src={localLogo}
        alt=""
        width={size}
        height={size}
        loading="eager"
        decoding="async"
        onError={() => setLocalFailed(true)}
        className={cn("bg-card shrink-0 rounded-full object-contain", className)}
        style={{ width: size, height: size }}
      />
    );
  }

  const known = KNOWN[chainId];
  if (!known) {
    if (remoteLogo && !failed && isSafeImageUrl(remoteLogo)) {
      return (
        <img
          src={remoteLogo}
          alt=""
          width={size}
          height={size}
          loading="eager"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className={cn("bg-card shrink-0 rounded-full object-contain", className)}
          style={{ width: size, height: size }}
        />
      );
    }
    return (
      <div
        role="img"
        aria-label={label ?? `Chain ${chainId}`}
        className={cn(
          "bg-primary/10 text-primary ring-primary/15 flex items-center justify-center rounded-full text-[0.6875rem] font-medium ring-1",
          className,
        )}
        style={{ width: size, height: size }}
      >
        {label?.trim().charAt(0).toUpperCase() ?? "?"}
      </div>
    );
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role="img"
      aria-label={label ?? known.label}
      className={cn("shrink-0 rounded-full", className)}
    >
      {known.node}
    </svg>
  );
}
