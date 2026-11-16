"use client";

import { useEffect, useMemo, useState } from "react";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const [selectedChainId, setSelectedChainId] = useState(chainId);

  useEffect(() => {
    if (open) setSelectedChainId(asset?.chainId ?? chainId);
  }, [asset?.chainId, chainId, open]);

  const networks = useMemo(() => {
    const map = new Map<number, { id: number; name: string }>();
    for (const item of BUILT_IN_NETWORKS) {
      map.set(item.chain.id, { id: item.chain.id, name: item.chain.name });
    }
    for (const item of customNetworks) {
      if (!map.has(item.chainId)) {
        map.set(item.chainId, { id: item.chainId, name: item.name });
      }
    }
    return [...map.values()];
  }, [customNetworks]);

  const chain =
    BUILT_IN_NETWORKS.find((item) => item.chain.id === selectedChainId)?.chain ??
    (customNetworks.find((item) => item.chainId === selectedChainId)
      ? customNetworkToChain(
          customNetworks.find((item) => item.chainId === selectedChainId)!,
        )
      : undefined);

  const networkName = chain?.name ?? `Chain ${selectedChainId}`;
  const visibleAsset = asset?.chainId === selectedChainId ? asset : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[440px] min-w-0 overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="text-[1.5rem]">{t("receive.title")}</DialogTitle>
          <DialogDescription className="text-[0.75rem] leading-5">
            {t("receive.description", { network: networkName })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor="receive-network">{t("common.network")}</Label>
          <Select
            value={String(selectedChainId)}
            onValueChange={(value) => setSelectedChainId(Number(value))}
          >
            <SelectTrigger id="receive-network" className="w-full">
              <SelectValue>
                <span className="flex items-center gap-2">
                  <NetworkLogo
                    chainId={selectedChainId}
                    size={18}
                    label={networkName}
                  />
                  {networkName}
                </span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {networks.map((network) => (
                <SelectItem key={network.id} value={String(network.id)}>
                  <span className="flex items-center gap-2">
                    <NetworkLogo
                      chainId={network.id}
                      size={18}
                      label={network.name}
                    />
                    {network.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {visibleAsset ? (
          <div className="flex items-center gap-2 border-y border-rule py-3">
            <TokenLogo
              src={visibleAsset.logoURI}
              symbol={visibleAsset.symbol}
              size={26}
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium">
                {t("send.selectToken")}: {visibleAsset.symbol}
              </p>
              <p className="text-muted-foreground truncate text-[0.6875rem]">
                {visibleAsset.name}
              </p>
            </div>
            <NetworkLogo
              chainId={visibleAsset.chainId}
              size={18}
              label={networkName}
            />
          </div>
        ) : null}

        {address ? (
          <div className="flex w-full min-w-0 flex-col items-center">
            <div className="bg-well border-rule w-full max-w-[242px] overflow-hidden rounded-[1.25rem] border p-4">
              <QRCodeSVG
                value={address}
                size={208}
                className="h-auto max-w-full"
                level="M"
                marginSize={1}
                bgColor="transparent"
                fgColor={designTokens.colors.light.wellInk}
                title={t("receive.qrLabel")}
              />
            </div>
            <div className="mt-4 flex w-full min-w-0 items-center gap-2 border-b border-rule pb-3">
              <NetworkLogo
                chainId={selectedChainId}
                size={26}
                label={networkName}
              />
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

        <div className="text-muted-foreground flex min-w-0 items-start gap-2.5 border-s border-rule ps-3 text-[0.6875rem] leading-5">
          <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
          <p>{t("receive.warning", { network: networkName })}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
