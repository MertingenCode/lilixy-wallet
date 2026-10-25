import type { Metadata } from "next";

import { HistoryPage } from "@/components/history/history-page";

export const metadata: Metadata = {
  title: "History",
};

export default function HistoryRoute() {
  return <HistoryPage />;
}
