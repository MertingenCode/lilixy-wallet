import type { Metadata } from "next";

import { SwapPage } from "@/components/swap/swap-page";

export const metadata: Metadata = {
  title: "Swap & Bridge",
};

export default function SwapRoute() {
  return <SwapPage />;
}
