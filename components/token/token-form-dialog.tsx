"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  LoaderCircleIcon,
  SearchIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { toast } from "sonner";
import { erc20Abi, isAddress, type Address } from "viem";

import { NetworkLogo } from "@/components/wallet/network-logo";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useT } from "@/hooks/use-locale";
import type { CustomToken } from "@/lib/config/types";
import type { TokenSearchResult } from "@/lib/api/types";
import { getTrackedTokens } from "@/lib/wallet/assets";
import { getPublicClientForChain } from "@/lib/wagmi/rpc";
import {
  BUILT_IN_NETWORKS,
  customNetworkToChain,
} from "@/lib/wagmi/networks";
import { useSettingsStore } from "@/store/settings";
import { shortenAddress } from "@/lib/utils";

interface TokenMetadata {
  name: string;
  symbol: string;
  decimals: number;
}

export function TokenFormDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: CustomToken | null;
}) {
  const { t } = useT();
  const queryClient = useQueryClient();
  const customNetworks = useSettingsStore((state) => state.customNetworks);
  const customTokens = useSettingsStore((state) => state.customTokens);
  const addCustomToken = useSettingsStore((state) => state.addCustomToken);
  const updateCustomToken = useSettingsStore(
    (state) => state.updateCustomToken,
  );
  const [chainId, setChainId] = useState<number>(
    editing?.chainId ?? BUILT_IN_NETWORKS[0]?.chain.id ?? 1,
  );
  const [address, setAddress] = useState(editing?.address ?? "");
  const [metadata, setMetadata] = useState<TokenMetadata | null>(
    editing
      ? {
          name: editing.name,
          symbol: editing.symbol,
          decimals: editing.decimals,
        }
      : null,
  );
  const [label, setLabel] = useState(editing?.label ?? "");
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<TokenSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const networks = useMemo(
    () => [
      ...BUILT_IN_NETWORKS.map((item) => item.chain),
      ...customNetworks
        .filter(
          (network) =>
            !BUILT_IN_NETWORKS.some(
              (item) => item.chain.id === network.chainId,
            ),
        )
        .map(customNetworkToChain),
    ],
    [customNetworks],
  );
  const chain = networks.find((item) => item.id === chainId);

  async function readToken(value = address) {
    setError(null);
    if (!isAddress(value)) {
      setError(t("tokens.invalidContract"));
      return;
    }
    if (!chain) {
      setError(t("errors.chainUnsupported"));
      return;
    }
    setReading(true);
    setMetadata(null);
    try {
      const client = getPublicClientForChain(chain);
      const [nameResult, symbolResult, decimalsResult] = await Promise.allSettled([
        client.readContract({
          address: value as Address,
          abi: erc20Abi,
          functionName: "name",
        }),
        client.readContract({
          address: value as Address,
          abi: erc20Abi,
          functionName: "symbol",
        }),
        client.readContract({
          address: value as Address,
          abi: erc20Abi,
          functionName: "decimals",
        }),
      ]);
      if (
        symbolResult.status !== "fulfilled" ||
        decimalsResult.status !== "fulfilled"
      ) {
        setError(t("tokens.readError"));
        return;
      }
      const symbol = String(symbolResult.value).trim().slice(0, 16);
      const decimals = Number(decimalsResult.value);
      if (!symbol || !Number.isInteger(decimals) || decimals < 0 || decimals > 36) {
        setError(t("tokens.invalidToken"));
        return;
      }
      const name =
        nameResult.status === "fulfilled"
          ? String(nameResult.value).trim().slice(0, 64) || symbol
          : symbol;
      const lower = value.toLowerCase();
      if (
        getTrackedTokens(chainId, customTokens).some(
          (token) => token.address.toLowerCase() === lower,
        )
      ) {
        setError(t("tokens.alreadyAdded"));
        return;
      }
      setMetadata({ name, symbol, decimals });
    } catch {
      setError(t("tokens.readError"));
    } finally {
      setReading(false);
    }
  }

  async function searchTokens() {
    const query = searchQuery.trim();
    if (query.length < 2 || searching) return;
    setSearching(true);
    setSearchError(null);
    setSearchResults([]);
    try {
      const response = await fetch(
        `/api/token-search?chainId=${chainId}&q=${encodeURIComponent(query)}`,
        { headers: { accept: "application/json" } },
      );
      if (!response.ok) throw new Error("SEARCH_FAILED");
      const json = (await response.json()) as { results?: TokenSearchResult[] };
      setSearchResults(json.results ?? []);
      if (!json.results?.length) setSearchError(t("tokens.noSearchResults"));
    } catch {
      setSearchError(t("tokens.searchError"));
    } finally {
      setSearching(false);
    }
  }

  function chooseSearchResult(result: TokenSearchResult) {
    setAddress(result.address);
    setMetadata(null);
    setSearchResults([]);
    setSearchQuery(`${result.name} (${result.symbol})`);
    void readToken(result.address);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setError(null);

    if (editing) {
      setSaving(true);
      updateCustomToken({
        ...editing,
        label: label.trim().slice(0, 32) || undefined,
      });
      await queryClient.invalidateQueries({ queryKey: ["balances"] });
      toast.success(t("toast.tokenUpdated"));
      setSaving(false);
      onOpenChange(false);
      return;
    }

    if (!metadata) {
      setError(t("tokens.readError"));
      return;
    }
    if (!isAddress(address)) {
      setError(t("tokens.invalidContract"));
      return;
    }
    setSaving(true);
    const token: CustomToken = {
      id: `${chainId}:${address.toLowerCase()}`,
      chainId,
      address: address as Address,
      name: metadata.name,
      symbol: metadata.symbol,
      decimals: metadata.decimals,
      label: label.trim().slice(0, 32) || undefined,
      addedAt: Date.now(),
    };
    addCustomToken(token);
    await queryClient.invalidateQueries({ queryKey: ["balances"] });
    toast.success(t("toast.tokenAdded"));
    setSaving(false);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !saving && onOpenChange(value)}>
      <DialogContent className="max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="text-[1.5rem]">
            {editing ? t("tokens.editToken") : t("tokens.addToken")}
          </DialogTitle>
          <DialogDescription>{t("tokens.description")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={(event) => void submit(event)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t("tokens.selectNetwork")}</Label>
            <Select
              value={String(chainId)}
              onValueChange={(value) => {
                setChainId(Number(value));
                setMetadata(editing ? metadata : null);
                setError(null);
                setSearchResults([]);
                setSearchError(null);
              }}
              disabled={Boolean(editing)}
            >
              <SelectTrigger>
                <SelectValue>
                  {chain ? (
                    <span className="flex items-center gap-2">
                      <NetworkLogo chainId={chain.id} size={18} label={chain.name} />
                      {chain.name}
                    </span>
                  ) : null}
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

          {!editing ? (
            <div className="space-y-2">
              <Label htmlFor="token-search">{t("tokens.searchByName")}</Label>
              <div className="flex gap-2">
                <Input
                  id="token-search"
                  value={searchQuery}
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    setSearchError(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void searchTokens();
                    }
                  }}
                  placeholder={t("tokens.searchByNamePlaceholder")}
                  autoComplete="off"
                  className="text-sm"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void searchTokens()}
                  disabled={searching || searchQuery.trim().length < 2}
                >
                  {searching ? (
                    <LoaderCircleIcon className="animate-spin" />
                  ) : (
                    <SearchIcon />
                  )}
                  {searching ? t("tokens.searching") : t("tokens.search")}
                </Button>
              </div>
              <p className="text-muted-foreground text-[0.6875rem] leading-5">
                {t("tokens.searchHint")}
              </p>
              {searchResults.length > 0 ? (
                <div className="divide-y divide-rule border-y border-rule" aria-live="polite">
                  {searchResults.map((result) => (
                    <button
                      key={`${result.id}:${result.address}`}
                      type="button"
                      onClick={() => chooseSearchResult(result)}
                      className="hover:bg-paper-2 flex w-full items-center gap-3 py-2.5 text-start transition-colors duration-[var(--dur-short)]"
                    >
                      <span className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-full text-[0.6875rem] font-semibold">
                        {result.symbol.slice(0, 2).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {result.name}{" "}
                          <span className="text-muted-foreground font-normal">
                            ({result.symbol})
                          </span>
                        </span>
                        <span className="text-muted-foreground block truncate font-mono text-[0.6875rem]">
                          {shortenAddress(result.address, 6)}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              ) : searchError ? (
                <p className="text-muted-foreground text-xs">{searchError}</p>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="token-address">{t("tokens.contractAddress")}</Label>
            <div className="flex gap-2">
              <Input
                id="token-address"
                value={address}
                onChange={(event) => {
                  setAddress(event.target.value.trim());
                  setMetadata(editing ? metadata : null);
                  setError(null);
                }}
                placeholder={t("tokens.contractPlaceholder")}
                spellCheck={false}
                autoComplete="off"
                className="font-mono text-sm"
                disabled={Boolean(editing)}
              />
              {!editing ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void readToken()}
                  disabled={reading || !address}
                >
                  {reading ? (
                    <LoaderCircleIcon className="animate-spin" />
                  ) : (
                    <SearchIcon />
                  )}
                  {reading ? t("tokens.fetching") : t("tokens.fetch")}
                </Button>
              ) : null}
            </div>
          </div>

          {!editing ? (
            <div className="text-muted-foreground border-destructive flex items-start gap-2 border-s ps-3 text-[0.6875rem] leading-5">
              <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
              <p>{t("tokens.unverified")}</p>
            </div>
          ) : null}

          {metadata ? (
            <div className="space-y-2 border-y border-rule py-3 text-[0.75rem]">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  {t("tokens.name")}
                </span>
                <span className="font-medium">{metadata.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  {t("tokens.symbol")}
                </span>
                <span className="font-medium">{metadata.symbol}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  {t("tokens.decimals")}
                </span>
                <span className="font-medium">{metadata.decimals}</span>
              </div>
              <p className="text-muted-foreground border-t pt-2 text-[0.6875rem]">
                {t("tokens.cannotEditMetadata")}
              </p>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="token-label">
              {t("tokens.label")}{" "}
              <span className="text-muted-foreground font-normal">
                ({t("common.optional")})
              </span>
            </Label>
            <Input
              id="token-label"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder={t("tokens.labelPlaceholder")}
              maxLength={32}
            />
          </div>

          {error ? (
            <div
              role="alert"
              className="border-destructive/30 bg-destructive/5 text-destructive rounded-[10px] border px-3 py-2.5 text-sm"
            >
              {error}
            </div>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={saving || (!editing && !metadata)}
            >
              {saving ? <LoaderCircleIcon className="animate-spin" /> : null}
              {editing ? t("tokens.save") : t("tokens.add")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
