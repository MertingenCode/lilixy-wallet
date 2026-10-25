"use client";

import { RotateCcwIcon } from "lucide-react";

import { designTokens } from "@/lib/design/tokens";
import en from "@/locales/en.json";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const colors = designTokens.colors.dark;
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: colors.background,
          color: colors.foreground,
          fontFamily: designTokens.font.body,
        }}
      >
        <div
          style={{
            maxWidth: 420,
            padding: 32,
            textAlign: "center",
            border: `1px solid ${colors.border}`,
            borderRadius: designTokens.radius.card,
            background: colors.card,
          }}
        >
          <h1 style={{ fontSize: 20, margin: 0, fontWeight: 500 }}>
            Lilixy Wallet
          </h1>
          <p
            style={{
              color: colors.mutedForeground,
              lineHeight: 1.6,
              fontSize: 14,
            }}
          >
            {en.errorPage.description}
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 8,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              border: 0,
              borderRadius: designTokens.radius.pill,
              padding: "10px 18px",
              background: colors.primary,
              color: colors.primaryForeground,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            <RotateCcwIcon size={16} />
            {en.errorPage.retry}
          </button>
        </div>
      </body>
    </html>
  );
}
