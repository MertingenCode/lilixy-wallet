import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";

import "@fontsource-variable/wix-madefor-display";
import "@fontsource-variable/wix-madefor-text";
import "./globals.css";

import { AppGate } from "@/components/app-gate";
import { FontScaleProvider } from "@/components/providers/font-scale-provider";
import { I18nProvider } from "@/components/providers/i18n-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { WalletProvider } from "@/components/providers/wallet-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { designTokens } from "@/lib/design/tokens";

export const metadata: Metadata = {
  title: {
    default: "Lilixy Wallet, a self-custody multichain wallet",
    template: "%s | Lilixy Wallet",
  },
  description:
    "A private, non-custodial multichain wallet that lives entirely in your browser. Your keys never leave your device.",
  applicationName: "Lilixy Wallet",
  authors: [{ name: "Lilixy" }],
  robots: { index: false, follow: false },
  formatDetection: { email: false, telephone: false, address: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    {
      media: "(prefers-color-scheme: light)",
      color: designTokens.colors.light.background,
    },
    {
      media: "(prefers-color-scheme: dark)",
      color: designTokens.colors.dark.background,
    },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const requestHeaders = await headers();
  const nonce = requestHeaders.get("x-nonce") ?? undefined;

  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider nonce={nonce}>
          <FontScaleProvider />
          <I18nProvider>
            <WalletProvider>
              <TooltipProvider>
                <AppGate>{children}</AppGate>
                <Toaster />
              </TooltipProvider>
            </WalletProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
