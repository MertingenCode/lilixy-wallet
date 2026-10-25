"use client";

import { QRCodeSVG } from "qrcode.react";
import { TriangleAlertIcon } from "lucide-react";

import { CopyButton } from "@/components/common/copy-button";
import { NetworkLogo } from "@/components/wallet/network-logo";
import { TokenLogo } from "@/components/wallet/token-logo";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useT } from "@/hooks/use-locale";
import { designTokens } from "@/lib/design/tokens";
import type { Asset } from "@/lib/wallet/assets";
import { useSettingsStore } from "@/store/settings";
import { useSessionStore } from "@/store/session";
import {
  BUILT_IN_NETWORKS,
  customNetworkToChain,
} from "@/lib/wagmi/networks";

export function ReceiveDialog({
  open,
  onOpenChange,
  chainId,
  asset,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chainId: number;
  asset?: Asset;
}) {
  const { t } = useT();
  const address = useSessionStore((state) => state.address);
  const customNetworks = useSettingsStore((state) => state.customNetworks);
  const chain =
    BUILT_IN_NETWORKS.find((item) => item.chain.id === chainId)?.chain ??
    (customNetworks.find((item) => item.chainId === chainId)
      ? customNetworkToChain(
          customNetworks.find((item) => item.chainId === chainId)!,
        )
      : undefined);

  const networkName = chain?.name ?? `Chain ${chainId}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="text-[1.5rem]">{t("receive.title")}</DialogTitle>
          <DialogDescription className="text-[0.75rem] leading-5">
            {t("receive.description", { network: networkName })}
          </DialogDescription>
        </DialogHeader>

        {asset ? (
          <div className="flex items-center gap-2 border-y border-rule py-3">
            <TokenLogo src={asset.logoURI} symbol={asset.symbol} size={26} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium">
                {t("send.selectToken")}: {asset.symbol}
              </p>
              <p className="text-muted-foreground truncate text-[0.6875rem]">
                {asset.name}
              </p>
            </div>
            <NetworkLogo
              chainId={asset.chainId}
              size={18}
              label={networkName}
            />
          </div>
        ) : null}

        {address ? (
          <div className="flex flex-col items-center">
            <div className="bg-well border-rule overflow-hidden rounded-[1.25rem] border p-4">
              <QRCodeSVG
                value={address}
                size={208}
                level="M"
                marginSize={1}
                bgColor="transparent"
                fgColor={designTokens.colors.light.wellInk}
                title={t("receive.qrLabel")}
              />
            </div>
            <div className="mt-4 flex w-full items-center gap-2 border-b border-rule pb-3">
              <NetworkLogo chainId={chainId} size={26} label={networkName} />
              <code className="min-w-0 flex-1 truncate text-center font-mono text-xs">
                {address}
              </code>
              <CopyButton
                value={address}
                label={t("receive.copyAddress")}
                successMessage={t("receive.addressCopied")}
              />
            </div>
          </div>
        ) : null}

        <div className="text-muted-foreground flex items-start gap-2.5 border-s border-rule ps-3 text-[0.6875rem] leading-5">
          <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
          <p>{t("receive.warning", { network: networkName })}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
