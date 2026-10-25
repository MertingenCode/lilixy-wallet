"use client";

import { useId } from "react";

import { cn } from "@/lib/utils";

function LogoMark({
  className,
  size = 32,
}: {
  className?: string;
  size?: number;
}) {
  const gradientId = `lilixy-mark-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      <defs>
        <linearGradient
          id={gradientId}
          x1="8"
          y1="4"
          x2="58"
          y2="62"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#3B82F6" />
          <stop offset="0.55" stopColor="#2563EB" />
          <stop offset="1" stopColor="#1D4ED8" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill={`url(#${gradientId})`} />
      <path
        d="M19 17.5C19 16.1193 20.1193 15 21.5 15H25.5C26.8807 15 28 16.1193 28 17.5V38.5H43.5C44.8807 38.5 46 39.6193 46 41V45C46 46.3807 44.8807 47.5 43.5 47.5H21.5C20.1193 47.5 19 46.3807 19 45V17.5Z"
        fill="white"
      />
      <path
        d="M45.8 15.2C50.3 17.1 51.6 22.7 48.5 26.4C46.1 29.3 41.8 29.4 39.2 26.7C36.6 24 36.8 19.7 39.8 17.3C41.7 15.8 43.9 15.2 45.8 15.2Z"
        fill="#BFDBFE"
      />
    </svg>
  );
}

export function Logo({
  className,
  size = "md",
  iconOnly = false,
  tone = "default",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
  iconOnly?: boolean;
  tone?: "default" | "day";
}) {
  const markSize = size === "sm" ? 28 : size === "lg" ? 44 : 34;
  const wordmark =
    size === "sm"
      ? "text-[1rem]"
      : size === "lg"
        ? "text-[1.375rem]"
        : "text-[1.125rem]";
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <LogoMark size={markSize} />
      {!iconOnly ? (
        <span
          className={cn(
            "font-display whitespace-nowrap font-medium tracking-[-0.02em]",
            wordmark,
            tone === "day" ? "text-day-ink" : "text-foreground",
          )}
        >
          Lilixy Wallet
        </span>
      ) : null}
    </div>
  );
}
