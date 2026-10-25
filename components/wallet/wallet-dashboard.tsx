"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { useChainId } from "wagmi";
import {
  ArrowDownToLineIcon,
  ArrowLeftRightIcon,
  ArrowUpFromLineIcon,
  EyeIcon,
  EyeOffIcon,
  PlusIcon,
  RefreshCwIcon,
  SearchIcon,
  Settings2Icon,
  WalletCardsIcon,
  WifiOffIcon,
} from "lucide-react";
import { toast } from "sonner";

import { CopyButton } from "@/components/common/copy-button";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { NetworkManagerDialog } from "@/components/network/network-manager-dialog";
import { TokenFormDialog } from "@/components/token/token-form-dialog";
import { AssetRow } from "@/components/wallet/asset-row";
import { NetworkLogo } from "@/components/wallet/network-logo";
import { ReceiveDialog } from "@/components/wallet/receive-dialog";
import { SendDialog } from "@/components/wallet/send-dialog";
import { TokenDetailDialog } from "@/components/wallet/token-detail-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useT } from "@/hooks/use-locale";
import { useWalletAssets } from "@/hooks/use-wallet-assets";
import type { CustomToken, FiatCurrency } from "@/lib/config/types";
import { formatCurrency } from "@/lib/i18n/format";
import type { Asset } from "@/lib/wallet/assets";
import { BUILT_IN_NETWORKS } from "@/lib/wagmi/networks";
import { useSettingsStore } from "@/store/settings";
import { useSessionStore } from "@/store/session";
import { cn, shortenAddress } from "@/lib/utils";

function AssetListSkeleton() {
  return (
    <div>
      {[0, 1, 2, 3].map((item) => (
        <div key={item} className="flex items-center gap-3 border-b border-rule px-1 py-4">
          <Skeleton className="size-8 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
          <div className="space-y-2">
            <Skeleton className="ms-auto h-3.5 w-24" />
            <Skeleton className="ms-auto h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

function FiatFigure({
  value,
  currency,
  locale,
}: {
  value: number | null;
  currency: FiatCurrency;
  locale: ReturnType<typeof useT>["locale"];
}) {
  if (value === null) {
    return <span className="display-figure text-[2.75rem] sm:text-[3.25rem]">N/A</span>;
  }
  const text = formatCurrency(value, currency, locale);
  const match = text.match(/^(.*?)([.,]\d{2})$/u);
  if (!match) {
    return <span className="display-figure text-[2.75rem] sm:text-[3.25rem]">{text}</span>;
  }
  return (
    <span className="display-figure text-[2.75rem] sm:text-[3.25rem]">
      {match[1]}
      <span className="text-muted-foreground">{match[2]}</span>
    </span>
  );
}

export function WalletDashboard() {
  const { t, locale } = useT();
  const queryClient = useQueryClient();
  const address = useSessionStore((state) => state.address);
  const currency = useSettingsStore((state) => state.currency);
  const activeChainId = useChainId();
  const customNetworks = useSettingsStore((state) => state.customNetworks);
  const customTokens = useSettingsStore((state) => state.customTokens);
  const removeCustomToken = useSettingsStore((state) => state.removeCustomToken);
  const {
    assets,
    totalFiat,
    isLoading,
    isFetching,
    isError,
    refetch,
    chainErrors,
  } = useWalletAssets();

  const [search, setSearch] = useState("");
  const [filterChain, setFilterChain] = useState<string>("all");
  const [hidden, setHidden] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [networkManagerOpen, setNetworkManagerOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | undefined>();
  const [receiveAsset, setReceiveAsset] = useState<Asset | undefined>();
  const [detailAsset, setDetailAsset] = useState<Asset | undefined>();
  const [tokenFormOpen, setTokenFormOpen] = useState(false);
  const [editingToken, setEditingToken] = useState<CustomToken | null>(null);
  const [deletingToken, setDeletingToken] = useState<CustomToken | null>(null);

  const networks = useMemo(() => {
    const map = new Map<number, string>();
    for (const item of BUILT_IN_NETWORKS) {
      map.set(item.chain.id, item.chain.name);
    }
    for (const custom of customNetworks) {
      if (!map.has(custom.chainId)) map.set(custom.chainId, custom.name);
    }
    return [...map.entries()].map(([chainId, name]) => ({ chainId, name }));
  }, [customNetworks]);

  const filteredAssets = useMemo(() => {
    const searchLower = search.trim().toLowerCase();
    return assets.filter((asset) => {
      if (filterChain !== "all" && asset.chainId !== Number(filterChain)) {
        return false;
      }
      if (!searchLower) return true;
      const networkName =
        networks.find((network) => network.chainId === asset.chainId)?.name ??
        "";
      return (
        asset.symbol.toLowerCase().includes(searchLower) ||
        asset.name.toLowerCase().includes(searchLower) ||
        networkName.toLowerCase().includes(searchLower)
      );
    });
  }, [assets, filterChain, networks, search]);

  const heldAssets = useMemo(
    () =>
      filteredAssets
        .filter((asset) => asset.balance > 0n)
        .sort((a, b) => (b.fiatValue ?? 0) - (a.fiatValue ?? 0)),
    [filteredAssets],
  );
  const otherAssets = useMemo(
    () =>
      filteredAssets
        .filter((asset) => asset.balance === 0n)
        .sort((a, b) => Number(b.isPopular) - Number(a.isPopular)),
    [filteredAssets],
  );

  const displayedTotal = useMemo(() => {
    if (filterChain === "all") return totalFiat;
    let total = 0;
    let hasPrice = false;
    for (const asset of assets) {
      if (asset.chainId !== Number(filterChain)) continue;
      if (asset.fiatValue !== undefined) {
        total += asset.fiatValue;
        hasPrice = true;
      }
    }
    return hasPrice ? total : 0;
  }, [assets, filterChain, totalFiat]);

  const chainName = (chainId: number) =>
    networks.find((network) => network.chainId === chainId)?.name ??
    `Chain ${chainId}`;

  function openSend(asset?: Asset) {
    setSelectedAsset(asset);
    setDetailAsset(undefined);
    setSendOpen(true);
  }

  function openReceive(asset?: Asset) {
    setReceiveAsset(asset);
    setDetailAsset(undefined);
    setReceiveOpen(true);
  }

  function openEditToken(asset: Asset) {
    if (!asset.address) return;
    const token = customTokens.find(
      (item) =>
        item.chainId === asset.chainId &&
        item.address.toLowerCase() === asset.address?.toLowerCase(),
    );
    if (!token) return;
    setDetailAsset(undefined);
    setEditingToken(token);
    setTokenFormOpen(true);
  }

  function openDeleteToken(asset: Asset) {
    if (!asset.address) return;
    const token = customTokens.find(
      (item) =>
        item.chainId === asset.chainId &&
        item.address.toLowerCase() === asset.address?.toLowerCase(),
    );
    if (token) {
      setDetailAsset(undefined);
      setDeletingToken(token);
    }
  }

  function deleteToken() {
    if (!deletingToken) return;
    removeCustomToken(deletingToken.id);
    void queryClient.invalidateQueries({ queryKey: ["balances"] });
    toast.success(t("toast.tokenDeleted"));
    setDeletingToken(null);
  }

  const customTokenFor = (asset: Asset) =>
    asset.isCustom
      ? customTokens.find(
          (item) =>
            item.chainId === asset.chainId &&
            item.address.toLowerCase() === asset.address?.toLowerCase(),
        )
      : undefined;

  const detailCustom = detailAsset ? customTokenFor(detailAsset) : undefined;
  const shownTotal = hidden ? null : displayedTotal;

  return (
    <div className="mx-auto w-full max-w-[1080px]">
      <PageHeader
        title={t("nav.wallet")}
        description={t("wallet.pageDescription")}
        actions={
          <Button
            variant="outline"
            size="icon"
            aria-label={t("common.refresh")}
            title={t("common.refresh")}
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCwIcon
              className={cn("size-4", isFetching && "animate-spin")}
            />
          </Button>
        }
      />

      <section className="glass-panel relative overflow-hidden p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-muted-foreground text-[0.6875rem]">
              {t("wallet.totalBalance")}
            </p>
            <div className="mt-2">
              {hidden ? (
                <span className="display-figure text-[2.75rem] sm:text-[3.25rem]">
                  ••••••
                </span>
              ) : (
                <FiatFigure
                  value={shownTotal}
                  currency={currency}
                  locale={locale}
                />
              )}
            </div>
            <p className="text-muted-foreground mt-2 text-[0.75rem]">
              {filterChain === "all"
                ? t("wallet.allNetworks")
                : chainName(Number(filterChain))}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setHidden((value) => !value)}
            aria-label={hidden ? t("a11y.showBalance") : t("a11y.hideBalance")}
            className="text-muted-foreground hover:bg-paper-3 hover:text-foreground flex size-9 items-center justify-center rounded-full transition-colors duration-[var(--dur-short)]"
          >
            {hidden ? (
              <EyeOffIcon className="size-4" />
            ) : (
              <EyeIcon className="size-4" />
            )}
          </button>
        </div>

        <div className="mt-7 flex flex-col gap-4 border-t border-rule pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-1.5">
            <code className="text-muted-foreground truncate font-mono text-[0.875rem]">
              {shortenAddress(address, 6)}
            </code>
            {address ? (
              <CopyButton
                value={address}
                label={t("wallet.copyAddress")}
                successMessage={t("wallet.addressCopied")}
                size="icon"
                iconClassName="size-[1.125rem]"
              />
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="lg" onClick={() => openSend()}>
              <ArrowUpFromLineIcon />
              {t("wallet.send")}
            </Button>
            <Button size="lg" variant="outline" onClick={() => openReceive()}>
              <ArrowDownToLineIcon />
              {t("wallet.receive")}
            </Button>
            <Button asChild size="lg" variant="ghost">
              <Link href="/swap">
                <ArrowLeftRightIcon />
                {t("wallet.swap")}
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {chainErrors.length > 0 ? (
        <div className="text-destructive border-s-2 border-destructive mt-5 flex items-start gap-2 pe-3 text-[0.6875rem] leading-5">
          <WifiOffIcon className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-medium">{t("errors.network")}</p>
            <p className="text-muted-foreground mt-0.5">
              {chainErrors.map((chainId) => chainName(chainId)).join(", ")}
            </p>
          </div>
        </div>
      ) : null}

      <section className="mt-12">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-[1.625rem] leading-none">{t("wallet.assets")}</h2>
            <p className="text-muted-foreground mt-2 text-[0.75rem]">
              {t("wallet.totalValue")}:{" "}
              {hidden
                ? "••••"
                : formatCurrency(displayedTotal, currency, locale)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditingToken(null);
                setTokenFormOpen(true);
              }}
            >
              <PlusIcon />
              {t("tokens.addToken")}
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label={t("networks.manage")}
              title={t("networks.manage")}
              onClick={() => setNetworkManagerOpen(true)}
            >
              <Settings2Icon />
            </Button>
          </div>
        </div>

        <div className="mt-6 flex gap-2 border-y border-rule py-3">
          <div className="relative min-w-0 flex-1">
            <SearchIcon className="text-muted-foreground pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("wallet.searchPlaceholder")}
              className="h-9 border-transparent bg-transparent ps-9 text-xs focus-visible:bg-paper-2"
              aria-label={t("common.search")}
            />
          </div>
          <Select value={filterChain} onValueChange={setFilterChain}>
            <SelectTrigger
              className="h-9 w-auto min-w-[8rem] border-transparent bg-transparent text-xs"
              aria-label={t("wallet.networkFilter")}
            >
              <SelectValue>
                {filterChain === "all"
                  ? t("wallet.allNetworks")
                  : chainName(Number(filterChain))}
              </SelectValue>
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="all">{t("wallet.allNetworks")}</SelectItem>
              {networks.map((network) => (
                <SelectItem key={network.chainId} value={String(network.chainId)}>
                  <span className="flex items-center gap-2">
                    <NetworkLogo
                      chainId={network.chainId}
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

        {isLoading && assets.length === 0 ? (
          <AssetListSkeleton />
        ) : filteredAssets.length === 0 ? (
          <EmptyState
            icon={WalletCardsIcon}
            title={
              search || filterChain !== "all"
                ? t("wallet.noResults")
                : t("wallet.noAssets")
            }
            description={
              search || filterChain !== "all"
                ? t("wallet.noResultsDescription")
                : t("wallet.noAssetsDescription")
            }
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingToken(null);
                  setTokenFormOpen(true);
                }}
              >
                <PlusIcon />
                {t("tokens.addToken")}
              </Button>
            }
          />
        ) : (
          <div className="token-list mt-5 p-3">
            {heldAssets.length > 0 ? (
              <div>
                <p className="text-muted-foreground px-3 py-3 text-[0.75rem]">
                  {t("wallet.yourAssets")}
                </p>
                <div className="space-y-2">
                  {heldAssets.map((asset) => (
                    <AssetRow
                      key={asset.key}
                      asset={asset}
                      onOpenDetail={setDetailAsset}
                      onSend={openSend}
                      onReceive={openReceive}
                      currency={currency}
                      locale={locale}
                      chainName={chainName(asset.chainId)}
                    />
                  ))}
                </div>
              </div>
            ) : null}

            {otherAssets.length > 0 ? (
              <div>
                <p className="text-muted-foreground px-3 pt-5 pb-3 text-[0.75rem]">
                  {t("wallet.popular")}
                </p>
                <div className="space-y-2">
                  {otherAssets.map((asset) => (
                    <AssetRow
                      key={asset.key}
                      asset={asset}
                      onOpenDetail={setDetailAsset}
                      onSend={openSend}
                      onReceive={openReceive}
                      currency={currency}
                      locale={locale}
                      chainName={chainName(asset.chainId)}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}

        {isError ? (
          <div className="border-t border-rule py-4 text-center">
            <p className="text-muted-foreground text-xs">{t("errors.network")}</p>
            <Button variant="ghost" size="sm" onClick={() => refetch()}>
              <RefreshCwIcon />
              {t("common.tryAgain")}
            </Button>
          </div>
        ) : null}
      </section>

      <SendDialog
        open={sendOpen}
        onOpenChange={setSendOpen}
        assets={assets}
        initialAsset={selectedAsset}
      />
      <ReceiveDialog
        open={receiveOpen}
        onOpenChange={setReceiveOpen}
        chainId={receiveAsset?.chainId ?? activeChainId}
        asset={receiveAsset}
      />
      <TokenDetailDialog
        asset={detailAsset}
        open={Boolean(detailAsset)}
        onOpenChange={(next) => !next && setDetailAsset(undefined)}
        currency={currency}
        locale={locale}
        chainName={detailAsset ? chainName(detailAsset.chainId) : ""}
        onSend={openSend}
        onReceive={openReceive}
        onEdit={detailCustom ? openEditToken : undefined}
        onDelete={detailCustom ? openDeleteToken : undefined}
      />
      <NetworkManagerDialog
        open={networkManagerOpen}
        onOpenChange={setNetworkManagerOpen}
      />
      {tokenFormOpen ? (
        <TokenFormDialog
          key={editingToken?.id ?? "new"}
          open={tokenFormOpen}
          onOpenChange={setTokenFormOpen}
          editing={editingToken}
        />
      ) : null}

      <AlertDialog
        open={Boolean(deletingToken)}
        onOpenChange={(open) => !open && setDeletingToken(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("tokens.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("tokens.deleteDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={deleteToken}>
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
