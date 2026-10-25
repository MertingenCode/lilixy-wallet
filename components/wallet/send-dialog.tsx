"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircleIcon,
  ArrowRightIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  LoaderCircleIcon,
  SearchIcon,
  SendIcon,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  encodeFunctionData,
  erc20Abi,
  formatUnits,
  isAddress,
  parseUnits,
  type Address,
  type Hash,
} from "viem";
import { useChainId, useSendTransaction, useSwitchChain } from "wagmi";

import { NetworkLogo } from "@/components/wallet/network-logo";
import { CopyButton } from "@/components/common/copy-button";
import { TokenLogo } from "@/components/wallet/token-logo";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  formatCurrency,
  formatTokenAmount,
} from "@/lib/i18n/format";
import {
  findTransactionByHash,
  upsertTransaction,
} from "@/lib/db/transactions-repo";
import { estimateTransferFee, type TransferFeeEstimate } from "@/lib/wallet/gas";
import {
  canPayNativeGas,
  maxAmount,
  nativeSpendable,
  percentAmount,
  type SendPercent,
} from "@/lib/wallet/send-math";
import {
  BUILT_IN_NETWORKS,
  customNetworkToChain,
  getExplorerTxUrl,
} from "@/lib/wagmi/networks";
import { getRuntimeChains } from "@/lib/wagmi/chain-registry";
import { getPublicClientForChain } from "@/lib/wagmi/rpc";
import type { Asset } from "@/lib/wallet/assets";
import { useSettingsStore } from "@/store/settings";
import { useSessionStore } from "@/store/session";

type Step = "form" | "token" | "review" | "success" | "error";

const PERCENTAGES: SendPercent[] = [25, 50, 75];

function isRejected(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /user rejected|denied|rejected the request/iu.test(message);
}

export function SendDialog({
  open,
  onOpenChange,
  assets,
  initialAsset,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assets: Asset[];
  initialAsset?: Asset;
}) {
  const { t, locale } = useT();
  const queryClient = useQueryClient();
  const address = useSessionStore((state) => state.address);
  const currency = useSettingsStore((state) => state.currency);
  const customNetworks = useSettingsStore((state) => state.customNetworks);
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const { sendTransactionAsync, isPending } = useSendTransaction();

  const [step, setStep] = useState<Step>("form");
  const [selectedKey, setSelectedKey] = useState("");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [hash, setHash] = useState<Hash | null>(null);
  const [fee, setFee] = useState<TransferFeeEstimate | null>(null);
  const [feeLoading, setFeeLoading] = useState(false);
  const [feeError, setFeeError] = useState(false);
  const [feeAttempt, setFeeAttempt] = useState(0);
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerChain, setPickerChain] = useState("all");
  const [showAll, setShowAll] = useState(false);

  const selected = useMemo(
    () =>
      assets.find((asset) => asset.key === selectedKey) ??
      initialAsset ??
      assets[0],
    [assets, initialAsset, selectedKey],
  );
  const chain = selected
    ? (getRuntimeChains().find((item) => item.id === selected.chainId) ??
      BUILT_IN_NETWORKS.find((item) => item.chain.id === selected.chainId)
        ?.chain ??
      (() => {
        const custom = customNetworks.find(
          (item) => item.chainId === selected.chainId,
        );
        return custom ? customNetworkToChain(custom) : undefined;
      })())
    : undefined;
  const nativeAsset = useMemo(
    () =>
      assets.find(
        (asset) =>
          asset.chainId === selected?.chainId && asset.kind === "native",
      ),
    [assets, selected?.chainId],
  );
  const nativeSymbol =
    nativeAsset?.symbol ?? chain?.nativeCurrency.symbol ?? "ETH";
  const nativeDecimals = nativeAsset?.decimals ?? 18;

  const parsedAmount = useMemo(() => {
    if (!selected || !amount.trim()) return null;
    try {
      const normalized = amount.trim().replace(",", ".");
      if (!/^\d*\.?\d*$/u.test(normalized) || normalized === ".") return null;
      const value = parseUnits(normalized, selected.decimals);
      return value > 0n ? value : null;
    } catch {
      return null;
    }
  }, [amount, selected]);

  const recipientValid = isAddress(recipient.trim());
  const sameAddress =
    recipientValid &&
    Boolean(address) &&
    recipient.trim().toLowerCase() === address?.toLowerCase();
  const zeroAmount = amount.trim() === "0";
  const amountInvalid =
    amount.trim().length > 0 && !zeroAmount && parsedAmount === null;
  const amountExceeds =
    parsedAmount !== null && selected ? parsedAmount > selected.balance : false;

  const spendable =
    selected?.kind === "native" && fee
      ? nativeSpendable(selected.balance, fee.feeWei).spendable
      : null;
  const nativeGasShort =
    selected?.kind === "native" && fee
      ? nativeSpendable(selected.balance, fee.feeWei).insufficientGas ||
        (parsedAmount !== null &&
          spendable !== null &&
          parsedAmount > spendable)
      : false;
  const erc20GasShort =
    selected?.kind === "erc20" && fee
      ? !canPayNativeGas(nativeAsset?.balance ?? 0n, fee.feeWei)
      : false;
  const gasInsufficient = nativeGasShort || erc20GasShort;

  const feeFiat =
    fee && nativeAsset?.price !== undefined
      ? Number(formatUnits(fee.feeWei, nativeDecimals)) * nativeAsset.price
      : undefined;
  const amountFiat =
    selected?.price !== undefined && parsedAmount !== null
      ? Number(formatUnits(parsedAmount, selected.decimals)) * selected.price
      : undefined;
  const totalFiat =
    amountFiat !== undefined && feeFiat !== undefined
      ? amountFiat + feeFiat
      : undefined;
  const totalNativeWei =
    selected?.kind === "native" && parsedAmount !== null && fee
      ? parsedAmount + fee.feeWei
      : null;

  const chainNames = useMemo(() => {
    const map = new Map<number, string>();
    for (const item of BUILT_IN_NETWORKS) {
      map.set(item.chain.id, item.chain.name);
    }
    for (const item of customNetworks) {
      if (!map.has(item.chainId)) map.set(item.chainId, item.name);
    }
    for (const item of getRuntimeChains()) {
      if (!map.has(item.id)) map.set(item.id, item.name);
    }
    return map;
  }, [customNetworks]);

  const pickerNetworks = useMemo(() => {
    const ids = [...new Set(assets.map((asset) => asset.chainId))];
    return ids
      .map((id) => ({
        id,
        name: chainNames.get(id) ?? `Chain ${id}`,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [assets, chainNames]);

  const pickerGroups = useMemo(() => {
    const search = pickerSearch.trim().toLowerCase();
    const grouped = new Map<number, Asset[]>();
    for (const asset of assets) {
      if (pickerChain !== "all" && asset.chainId !== Number(pickerChain)) {
        continue;
      }
      if (!showAll && asset.balance <= 0n) continue;
      const networkName = chainNames.get(asset.chainId) ?? "";
      if (
        search &&
        !asset.symbol.toLowerCase().includes(search) &&
        !asset.name.toLowerCase().includes(search) &&
        !networkName.toLowerCase().includes(search)
      ) {
        continue;
      }
      const list = grouped.get(asset.chainId) ?? [];
      list.push(asset);
      grouped.set(asset.chainId, list);
    }
    const networkOrder = new Map(
      BUILT_IN_NETWORKS.map((item, index) => [item.chain.id, index]),
    );
    return [...grouped.entries()]
      .map(([id, tokens]) => ({
        id,
        name: chainNames.get(id) ?? `Chain ${id}`,
        tokens: tokens.sort((a, b) => {
          const byBalance = Number(b.balance > 0n) - Number(a.balance > 0n);
          if (byBalance !== 0) return byBalance;
          return (b.fiatValue ?? 0) - (a.fiatValue ?? 0);
        }),
      }))
      .sort((a, b) => {
        const rankA = networkOrder.get(a.id) ?? 1_000;
        const rankB = networkOrder.get(b.id) ?? 1_000;
        if (rankA !== rankB) return rankA - rankB;
        return a.name.localeCompare(b.name);
      });
  }, [assets, chainNames, pickerChain, pickerSearch, showAll]);

  useEffect(() => {
    if (!open) {
      setStep("form");
      setRecipient("");
      setAmount("");
      setError(null);
      setHash(null);
      setFee(null);
      setFeeError(false);
      setFeeLoading(false);
      setFeeAttempt(0);
      setSelectedKey("");
      setPickerSearch("");
      setPickerChain("all");
      setShowAll(false);
    } else if (initialAsset) {
      setSelectedKey(initialAsset.key);
    }
  }, [initialAsset, open]);

  useEffect(() => {
    if (!open || !initialAsset || initialAsset.chainId === chainId) return;
    void switchChainAsync({ chainId: initialAsset.chainId } as never).catch(
      () => setError(t("errors.network")),
    );
  }, [chainId, initialAsset, open, switchChainAsync, t]);

  useEffect(() => {
    if (
      !open ||
      step === "success" ||
      step === "error" ||
      !selected ||
      !chain ||
      !address
    ) {
      return;
    }
    let cancelled = false;
    setFeeLoading(true);
    setFeeError(false);
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const nextFee = await estimateTransferFee({
            client: getPublicClientForChain(chain),
            chain,
            account: address,
            asset: selected,
            recipient: recipientValid
              ? (recipient.trim() as Address)
              : undefined,
            amount: parsedAmount,
          });
          if (!cancelled) setFee(nextFee);
        } catch {
          if (!cancelled) {
            setFee(null);
            setFeeError(true);
          }
        } finally {
          if (!cancelled) setFeeLoading(false);
        }
      })();
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    address,
    chain,
    open,
    feeAttempt,
    parsedAmount,
    recipient,
    recipientValid,
    selected,
    step,
  ]);

  const canReview =
    Boolean(selected) &&
    recipientValid &&
    !sameAddress &&
    parsedAmount !== null &&
    !amountExceeds &&
    !amountInvalid &&
    !gasInsufficient &&
    fee !== null &&
    !feeLoading &&
    !feeError;

  function applyPercent(percent: SendPercent | 100) {
    if (!selected) return;
    if (selected.kind === "native" && !fee) return;
    const value =
      percent === 100
        ? maxAmount(selected.balance, fee?.feeWei ?? 0n, selected.kind === "native")
        : percentAmount(
            selected.balance,
            fee?.feeWei ?? 0n,
            percent,
            selected.kind === "native",
          );
    setAmount(formatUnits(value, selected.decimals));
    setError(null);
  }

  async function selectAsset(asset: Asset) {
    setSelectedKey(asset.key);
    setAmount("");
    setError(null);
    setStep("form");
    if (asset.chainId !== chainId) {
      try {
        await switchChainAsync({ chainId: asset.chainId } as never);
      } catch {
        setError(t("errors.network"));
      }
    }
  }

  async function switchToSelectedChain() {
    if (!selected || selected.chainId === chainId) return;
    await switchChainAsync({ chainId: selected.chainId } as never);
  }

  async function handleReview() {
    if (!canReview) return;
    setError(null);
    try {
      await switchToSelectedChain();
      setStep("review");
    } catch {
      setError(t("errors.network"));
    }
  }

  async function handleSend() {
    if (
      !selected ||
      !parsedAmount ||
      !address ||
      !recipientValid ||
      !fee ||
      feeLoading ||
      feeError
    ) {
      return;
    }
    setError(null);
    try {
      await switchToSelectedChain();
      if (!chain) throw new Error("UNSUPPORTED_CHAIN");
      const data =
        selected.kind === "erc20" && selected.address
          ? encodeFunctionData({
              abi: erc20Abi,
              functionName: "transfer",
              args: [recipient.trim() as Address, parsedAmount],
            })
          : undefined;
      const txHash = await sendTransactionAsync({
        to:
          selected.kind === "native"
            ? (recipient.trim() as Address)
            : (selected.address as Address),
        value: selected.kind === "native" ? parsedAmount : 0n,
        data,
        gas: fee.gasLimit,
      });
      setHash(txHash);

      const client = getPublicClientForChain(chain);
      const onChain = await client
        .getTransaction({ hash: txHash })
        .catch(() => null);
      const existing = await findTransactionByHash(txHash);
      if (!existing) {
        await upsertTransaction({
          id: `tx_${txHash.toLowerCase()}`,
          hash: txHash,
          chainId: selected.chainId,
          type: "send",
          status: "pending",
          timestamp: Date.now(),
          from: address,
          to: recipient.trim(),
          tokenSymbol: selected.symbol,
          tokenAddress:
            selected.kind === "erc20" ? selected.address : undefined,
          tokenDecimals: selected.decimals,
          contractAddress:
            selected.kind === "erc20" ? selected.address : undefined,
          amount: parsedAmount.toString(),
          value: selected.kind === "native" ? parsedAmount.toString() : "0",
          nonce: onChain?.nonce,
          gas: onChain?.gas?.toString(),
          gasPrice: onChain?.gasPrice?.toString(),
          maxFeePerGas: onChain?.maxFeePerGas?.toString(),
          maxPriorityFeePerGas: onChain?.maxPriorityFeePerGas?.toString(),
          data,
          explorerUrl: getExplorerTxUrl(chain, txHash),
          source: "local",
        });
      }

      await queryClient.invalidateQueries({ queryKey: ["balances"] });
      await queryClient.invalidateQueries({ queryKey: ["history"] });
      setStep("success");
      toast.success(t("toast.transactionSent"));
    } catch (caught) {
      setError(
        isRejected(caught)
          ? t("errors.userRejected")
          : t("send.failedDescription"),
      );
      setStep("error");
    }
  }

  const amountFormatted =
    selected && parsedAmount !== null
      ? formatTokenAmount(parsedAmount, selected.decimals, locale, 8)
      : "";
  const feeNative =
    fee !== null
      ? `${formatTokenAmount(fee.feeWei, nativeDecimals, locale, 8)} ${nativeSymbol}`
      : "N/A";
  const feeFiatLabel =
    feeFiat !== undefined ? formatCurrency(feeFiat, currency, locale) : undefined;
  const amountFiatLabel =
    amountFiat !== undefined
      ? formatCurrency(amountFiat, currency, locale)
      : undefined;
  const totalFiatLabel =
    totalFiat !== undefined ? formatCurrency(totalFiat, currency, locale) : undefined;
  const totalLabel =
    totalNativeWei !== null
      ? `${formatTokenAmount(totalNativeWei, nativeDecimals, locale, 8)} ${nativeSymbol}`
      : selected?.kind === "erc20"
        ? `${amountFormatted} ${selected.symbol} + ${feeNative}`
        : "N/A";
  const availableAmount =
    selected?.kind === "native" && spendable !== null
      ? spendable
      : selected?.balance;
  const explorerUrl =
    hash && chain ? getExplorerTxUrl(chain, hash) : undefined;
  const title =
    step === "token"
      ? t("send.tokenPickerTitle")
      : step === "review"
        ? t("send.reviewTitle")
        : t("send.title");
  const description =
    step === "token"
      ? t("send.tokenPickerDescription")
      : step === "review"
        ? t("send.confirmationDescription")
        : t("send.description");

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!isPending) onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="text-[1.5rem] leading-tight">{title}</DialogTitle>
          <DialogDescription className="text-[0.75rem] leading-5">{description}</DialogDescription>
        </DialogHeader>

        {step === "form" ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[0.75rem]">{t("send.selectToken")}</Label>
              <button
                type="button"
                onClick={() => setStep("token")}
                className="flex w-full items-center gap-3 border-b border-rule pb-3 text-start transition-colors duration-[var(--dur-short)] hover:text-primary"
                aria-label={t("send.selectToken")}
              >
                {selected ? (
                  <>
                    <TokenLogo
                      src={selected.logoURI}
                      symbol={selected.symbol}
                      size={32}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {selected.symbol}
                      </p>
                      <p className="text-muted-foreground truncate text-xs">
                        {formatTokenAmount(
                          selected.balance,
                          selected.decimals,
                          locale,
                          5,
                        )}{" "}
                        {selected.symbol}
                        <span className="mt-0.5 block text-[0.6875rem] sm:hidden">
                          {chainNames.get(selected.chainId) ??
                            `Chain ${selected.chainId}`}
                        </span>
                      </p>
                    </div>
                    <div className="text-muted-foreground flex shrink-0 items-center gap-1.5 text-xs">
                      <NetworkLogo
                        chainId={selected.chainId}
                        size={16}
                        label={chainNames.get(selected.chainId)}
                      />
                      <span className="hidden sm:inline">
                        {chainNames.get(selected.chainId) ??
                          `Chain ${selected.chainId}`}
                      </span>
                      <ChevronDownIcon className="size-4" />
                    </div>
                  </>
                ) : (
                  <span className="text-muted-foreground text-sm">
                    {t("send.selectToken")}
                  </span>
                )}
              </button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="send-recipient" className="text-[0.75rem]">{t("send.recipient")}</Label>
              <Input
                id="send-recipient"
                value={recipient}
                onChange={(event) => {
                  setRecipient(event.target.value.trim());
                  if (error) setError(null);
                }}
                placeholder={t("send.recipientPlaceholder")}
                autoComplete="off"
                spellCheck={false}
                className="font-mono text-sm"
                aria-invalid={
                  Boolean(recipient) && (!recipientValid || Boolean(sameAddress))
                }
              />
              {recipient && !recipientValid ? (
                <p className="text-destructive text-xs">
                  {t("send.invalidRecipient")}
                </p>
              ) : sameAddress ? (
                <p className="text-destructive text-xs">
                  {t("send.sameAddress")}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="send-amount" className="text-[0.75rem]">{t("send.amount")}</Label>
                <span className="text-muted-foreground text-xs">
                  {t("send.available")}:{" "}
                  {selected
                    ? `${formatTokenAmount(
                        availableAmount ?? selected.balance,
                        selected.decimals,
                        locale,
                        6,
                      )} ${selected.symbol}`
                    : "N/A"}
                </span>
              </div>
              <div className="relative">
                <Input
                  id="send-amount"
                  value={amount}
                  onChange={(event) => {
                    setAmount(event.target.value);
                    if (error) setError(null);
                  }}
                  inputMode="decimal"
                  placeholder="0.00"
                  className="display-figure h-16 pe-20 text-[2.25rem]"
                  aria-invalid={amountInvalid || amountExceeds}
                />
                <span className="text-muted-foreground absolute end-3 top-1/2 -translate-y-1/2 text-sm font-semibold">
                  {selected?.symbol}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-1.5">
                {PERCENTAGES.map((percent) => (
                  <Button
                    key={percent}
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={
                      !selected ||
                      (selected.kind === "native" && (!fee || feeLoading))
                    }
                    onClick={() => applyPercent(percent)}
                  >
                    {percent === 25
                      ? t("send.percent25")
                      : percent === 50
                        ? t("send.percent50")
                        : t("send.percent75")}
                  </Button>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={
                    !selected ||
                    (selected.kind === "native" && (!fee || feeLoading))
                  }
                  onClick={() => applyPercent(100)}
                >
                  {t("send.max")}
                </Button>
              </div>

              <div className="border-t border-rule pt-2.5 text-[0.6875rem]">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-muted-foreground">
                    {t("send.estimatedNetworkFee")}
                  </span>
                  <span className="text-end font-medium">
                    {feeLoading ? (
                      <LoaderCircleIcon className="size-4 animate-spin" />
                    ) : fee ? (
                      <>
                        <span className="tabular">{feeNative}</span>
                        {feeFiatLabel ? (
                          <span className="text-muted-foreground ms-1 font-normal">
                            ≈ {feeFiatLabel}
                          </span>
                        ) : null}
                      </>
                    ) : (
                      "N/A"
                    )}
                  </span>
                </div>
                {fee?.includesL1Fee ? (
                  <p className="text-muted-foreground mt-1">
                    {t("send.l1FeeIncluded")}
                  </p>
                ) : null}
                {feeError ? (
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <p className="text-muted-foreground">
                      {t("send.gasUnavailable")}
                    </p>
                    <button
                      type="button"
                      className="text-primary shrink-0 font-medium transition-colors duration-150 hover:underline"
                      onClick={() => setFeeAttempt((value) => value + 1)}
                    >
                      {t("common.retry")}
                    </button>
                  </div>
                ) : null}
              </div>

              {amountInvalid ? (
                <p className="text-destructive text-xs">
                  {t("send.invalidAmount")}
                </p>
              ) : amountExceeds ? (
                <p className="text-destructive text-xs">
                  {t("send.amountExceedsBalance")}
                </p>
              ) : gasInsufficient ? (
                <p className="text-destructive text-xs">
                  {selected?.kind === "native"
                    ? t("send.gasInsufficient")
                    : t("send.gasInsufficientToken", { symbol: nativeSymbol })}
                </p>
              ) : null}
            </div>

            {error ? (
              <div
                role="alert"
                className="text-destructive border-s-2 border-destructive ps-3 text-xs leading-5"
              >
                {error}
              </div>
            ) : null}

            <Button
              className="w-full"
              disabled={!canReview}
              onClick={() => void handleReview()}
            >
              {t("send.review")}
              <ArrowRightIcon />
            </Button>
          </div>
        ) : null}

        {step === "token" ? (
          <div className="space-y-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="-ms-2 self-start"
              onClick={() => setStep("form")}
            >
              <ChevronLeftIcon />
              {t("common.back")}
            </Button>

            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative min-w-0 flex-1">
                <SearchIcon className="text-muted-foreground pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2" />
                <Input
                  value={pickerSearch}
                  onChange={(event) => setPickerSearch(event.target.value)}
                  placeholder={t("send.searchToken")}
                  className="h-9 ps-9 text-xs"
                  aria-label={t("send.searchToken")}
                />
              </div>
              <Select value={pickerChain} onValueChange={setPickerChain}>
                <SelectTrigger
                  className="h-9 w-full text-xs sm:w-[10rem]"
                  aria-label={t("wallet.networkFilter")}
                >
                  <SelectValue>
                    {pickerChain === "all"
                      ? t("wallet.allNetworks")
                      : chainNames.get(Number(pickerChain)) ??
                        `Chain ${pickerChain}`}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="all">{t("wallet.allNetworks")}</SelectItem>
                  {pickerNetworks.map((network) => (
                    <SelectItem
                      key={network.id}
                      value={String(network.id)}
                    >
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

            <div className="flex items-center justify-between gap-3">
              <p className="text-muted-foreground text-xs">
                {t("send.tokenPickerHint")}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowAll((value) => !value)}
              >
                {showAll ? t("send.hideZeroBalances") : t("send.showAllTokens")}
              </Button>
            </div>

            <div className="max-h-[48dvh] space-y-3 overflow-y-auto pe-1">
              {pickerGroups.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-muted-foreground text-sm">
                    {t("send.noTokens")}
                  </p>
                </div>
              ) : (
                pickerGroups.map((group) => (
                  <div key={group.id}>
                    <div className="text-muted-foreground flex items-center gap-2 px-1 pt-4 pb-2 text-[0.6875rem] font-medium">
                      <NetworkLogo
                        chainId={group.id}
                        size={16}
                        label={group.name}
                      />
                      {group.name}
                    </div>
                    <div className="divide-y">
                      {group.tokens.map((asset) => (
                        <button
                          key={asset.key}
                          type="button"
                          onClick={() => void selectAsset(asset)}
                          className="hover:bg-paper-2/60 flex w-full items-center gap-3 border-b border-rule px-1 py-2.5 text-start transition-colors duration-[var(--dur-short)]"
                        >
                          <TokenLogo
                            src={asset.logoURI}
                            symbol={asset.symbol}
                            size={30}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">
                              {asset.symbol}
                            </span>
                            <span className="text-muted-foreground block truncate text-xs">
                              {asset.name}
                            </span>
                          </span>
                          <span className="shrink-0 text-end">
                            <span className="tabular block text-xs font-medium">
                              {formatTokenAmount(
                                asset.balance,
                                asset.decimals,
                                locale,
                                4,
                              )}{" "}
                              {asset.symbol}
                            </span>
                            <span className="text-muted-foreground tabular block text-[0.6875rem]">
                              {asset.fiatValue !== undefined
                                ? formatCurrency(asset.fiatValue, currency, locale)
                                : "N/A"}
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : null}

        {step === "review" && selected ? (
          <div className="space-y-4">
            <div className="border-b border-rule pb-5 text-center">
              <TokenLogo
                src={selected.logoURI}
                symbol={selected.symbol}
                size={44}
                className="mx-auto"
              />
              <p className="display-figure mt-2 text-[2rem]">
                {amountFormatted} {selected.symbol}
              </p>
              {amountFiatLabel ? (
                <p className="text-muted-foreground mt-1 text-xs">
                  {amountFiatLabel}
                </p>
              ) : null}
            </div>

            <dl className="space-y-2.5 text-sm">
              <div className="flex items-start justify-between gap-4">
                <dt className="text-muted-foreground">{t("send.amount")}</dt>
                <dd className="text-end">
                  <span className="tabular font-medium">
                    {amountFormatted} {selected.symbol}
                  </span>
                  {amountFiatLabel ? (
                    <span className="text-muted-foreground block text-xs">
                      {amountFiatLabel}
                    </span>
                  ) : null}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-muted-foreground">{t("send.networkFee")}</dt>
                <dd className="text-end">
                  <span className="tabular font-medium">{feeNative}</span>
                  {feeFiatLabel ? (
                    <span className="text-muted-foreground block text-xs">
                      {feeFiatLabel}
                    </span>
                  ) : null}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4 border-t pt-2.5">
                <dt className="font-semibold">{t("send.total")}</dt>
                <dd className="text-end">
                  <span className="tabular font-semibold">{totalLabel}</span>
                  {totalFiatLabel ? (
                    <span className="text-muted-foreground block text-xs">
                      {totalFiatLabel}
                    </span>
                  ) : null}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-muted-foreground">{t("common.to")}</dt>
                <dd className="max-w-[65%] break-all text-end font-mono text-xs">
                  {recipient}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">{t("common.network")}</dt>
                <dd className="flex items-center gap-1.5 font-medium">
                  <NetworkLogo
                    chainId={selected.chainId}
                    size={16}
                    label={chain?.name}
                  />
                  {chain?.name}
                </dd>
              </div>
            </dl>

            {feeError ? (
              <div className="text-muted-foreground flex items-start gap-2 border-s border-rule ps-3 text-[0.6875rem] leading-5">
                <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
                {t("send.gasUnavailable")}
              </div>
            ) : null}
            {selected.kind === "erc20" && chain ? (
              <p className="text-muted-foreground text-xs leading-5">
                {t("send.erc20Warning", { network: chain.name })}
              </p>
            ) : null}

            {error ? (
              <div
                role="alert"
                className="text-destructive border-s-2 border-destructive ps-3 text-xs leading-5"
              >
                {error}
              </div>
            ) : null}

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setStep("form")}
                disabled={isPending}
                className="flex-1"
              >
                <ChevronLeftIcon />
                {t("common.back")}
              </Button>
              <Button
                onClick={() => void handleSend()}
                disabled={isPending || !fee || feeLoading || feeError}
                className="flex-[2]"
              >
                {isPending ? (
                  <>
                    <LoaderCircleIcon className="animate-spin" />
                    {t("send.sending")}
                  </>
                ) : (
                  <>
                    <SendIcon />
                    {t("send.confirm")}
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : null}

        {step === "success" && selected ? (
          <div className="space-y-4 text-center">
            <div className="text-success flex justify-center">
              <CheckIcon className="size-6" />
            </div>
            <div>
              <h3 className="text-[1.25rem]">{t("send.sent")}</h3>
              <p className="text-muted-foreground mt-1 text-sm">
                {t("send.sentDescription")}
              </p>
              <p className="mt-3 font-semibold">
                {amountFormatted} {selected.symbol}
              </p>
            </div>
            {hash ? (
              <div className="flex items-center gap-2 border-y border-rule px-3 py-2">
                <code className="min-w-0 flex-1 truncate font-mono text-[0.6875rem]">
                  {hash}
                </code>
                <CopyButton
                  value={hash}
                  label={`${t("common.copy")} ${t("common.hash")}`}
                  size="iconSm"
                  iconClassName="size-4"
                />
              </div>
            ) : null}
            <div className="flex flex-col gap-2 sm:flex-row">
              {explorerUrl ? (
                <Button asChild variant="outline" className="flex-1">
                  <a
                    href={explorerUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    {t("send.viewTransaction")}
                  </a>
                </Button>
              ) : null}
              <Button
                className="flex-1"
                onClick={() => {
                  setStep("form");
                  setRecipient("");
                  setAmount("");
                  setHash(null);
                  setFee(null);
                  setError(null);
                }}
              >
                {t("send.newSend")}
              </Button>
            </div>
          </div>
        ) : null}

        {step === "error" ? (
          <div className="space-y-4 text-center">
            <div className="text-destructive flex justify-center">
              <AlertCircleIcon className="size-6" />
            </div>
            <div>
              <h3 className="text-[1.25rem]">{t("send.failed")}</h3>
              <p className="text-muted-foreground mt-1 text-sm">
                {error ?? t("send.failedDescription")}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setStep("form");
                  setError(null);
                }}
              >
                {t("common.back")}
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  setError(null);
                  void handleSend();
                }}
              >
                {t("common.retry")}
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
