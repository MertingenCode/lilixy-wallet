import type { Metadata } from "next";

import { WalletDashboard } from "@/components/wallet/wallet-dashboard";

export const metadata: Metadata = {
  title: "Wallet",
};

export default function WalletPage() {
  return <WalletDashboard />;
}
