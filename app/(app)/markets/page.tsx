import type { Metadata } from "next";

import { MarketsPage } from "@/components/markets/markets-page";

export const metadata: Metadata = {
  title: "Markets",
};

export default function MarketsRoute() {
  return <MarketsPage />;
}
