import type { MetadataRoute } from "next";

import { designTokens } from "@/lib/design/tokens";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Lilixy Wallet",
    short_name: "Lilixy",
    description: "Private, non-custodial multichain wallet in your browser.",
    start_url: "/wallet",
    display: "standalone",
    background_color: designTokens.colors.light.background,
    theme_color: designTokens.colors.light.primary,
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
