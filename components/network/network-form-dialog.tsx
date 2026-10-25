"use client";

import { useState, type FormEvent } from "react";
import {
  CheckCircle2Icon,
  LoaderCircleIcon,
  ServerIcon,
} from "lucide-react";
import { toast } from "sonner";

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
import { Switch } from "@/components/ui/switch";
import { useT } from "@/hooks/use-locale";
import type { CustomNetwork } from "@/lib/config/types";
import { BUILT_IN_NETWORKS, isSafeHttpUrl } from "@/lib/wagmi/networks";
import { clearRpcCache } from "@/lib/wagmi/rpc";
import { validateRpc } from "@/lib/wagmi/validation";
import { useSettingsStore } from "@/store/settings";

interface FormState {
  name: string;
  rpcUrl: string;
  chainId: string;
  symbol: string;
  explorerUrl: string;
  testnet: boolean;
}

const EMPTY_FORM: FormState = {
  name: "",
  rpcUrl: "",
  chainId: "",
  symbol: "",
  explorerUrl: "",
  testnet: false,
};

export function NetworkFormDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: CustomNetwork | null;
}) {
  const { t } = useT();
  const customNetworks = useSettingsStore((state) => state.customNetworks);
  const addCustomNetwork = useSettingsStore((state) => state.addCustomNetwork);
  const updateCustomNetwork = useSettingsStore(
    (state) => state.updateCustomNetwork,
  );
  const [form, setForm] = useState<FormState>(
    editing
      ? {
          name: editing.name,
          rpcUrl: editing.rpcUrl,
          chainId: String(editing.chainId),
          symbol: editing.symbol,
          explorerUrl: editing.explorerUrl ?? "",
          testnet: editing.testnet,
        }
      : EMPTY_FORM,
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [validated, setValidated] = useState(false);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setError(null);
    setValidated(false);
  }

  async function validate(): Promise<boolean> {
    if (form.name.trim().length < 2) {
      setError(t("common.required"));
      return false;
    }
    const chainId = Number(form.chainId);
    if (!Number.isSafeInteger(chainId) || chainId <= 0) {
      setError(t("networks.invalidChainId"));
      return false;
    }
    if (
      BUILT_IN_NETWORKS.some((item) => item.chain.id === chainId) ||
      customNetworks.some(
        (item) => item.chainId === chainId && item.chainId !== editing?.chainId,
      )
    ) {
      setError(t("networks.duplicate"));
      return false;
    }
    if (!isSafeHttpUrl(form.rpcUrl)) {
      setError(t("networks.invalidRpc"));
      return false;
    }
    if (form.explorerUrl && !isSafeHttpUrl(form.explorerUrl)) {
      setError(t("networks.invalidExplorer"));
      return false;
    }
    if (form.symbol.trim().length < 2) {
      setError(t("common.required"));
      return false;
    }

    setChecking(true);
    const result = await validateRpc(form.rpcUrl.trim(), chainId);
    setChecking(false);
    if (!result.ok) {
      if (result.error === "CHAIN_ID_MISMATCH") {
        setError(
          t("networks.mismatch", {
            actual: result.chainId ?? "?",
            expected: chainId,
          }),
        );
      } else if (result.error === "INVALID_URL") {
        setError(t("networks.invalidRpc"));
      } else {
        setError(t("networks.rpcError"));
      }
      return false;
    }
    setValidated(true);
    return true;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const ok = await validate();
      if (!ok) return;
      const network: CustomNetwork = {
        chainId: Number(form.chainId),
        name: form.name.trim().slice(0, 60),
        rpcUrl: form.rpcUrl.trim(),
        symbol: form.symbol.trim().toUpperCase().slice(0, 12),
        explorerUrl: form.explorerUrl.trim() || undefined,
        testnet: form.testnet,
        addedAt: editing?.addedAt ?? Date.now(),
      };
      if (editing) {
        updateCustomNetwork(network);
        toast.success(t("toast.networkUpdated"));
      } else {
        addCustomNetwork(network);
        toast.success(t("toast.networkAdded"));
      }
      clearRpcCache();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !saving && onOpenChange(value)}>
      <DialogContent className="max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="text-[1.5rem]">
            {editing ? t("networks.editNetwork") : t("networks.addNetwork")}
          </DialogTitle>
          <DialogDescription>{t("networks.description")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={(event) => void submit(event)} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="network-name">{t("networks.name")}</Label>
              <Input
                id="network-name"
                value={form.name}
                onChange={(event) => update("name", event.target.value)}
                placeholder={t("networks.namePlaceholder")}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="network-chain-id">{t("networks.chainId")}</Label>
              <Input
                id="network-chain-id"
                value={form.chainId}
                onChange={(event) =>
                  update("chainId", event.target.value.replace(/\D/gu, ""))
                }
                placeholder={t("networks.chainIdPlaceholder")}
                inputMode="numeric"
                disabled={Boolean(editing)}
                required
              />
              {editing ? (
                <p className="text-muted-foreground text-[0.6875rem]">
                  {t("networks.chainIdLocked")}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="network-symbol">{t("networks.symbol")}</Label>
              <Input
                id="network-symbol"
                value={form.symbol}
                onChange={(event) => update("symbol", event.target.value)}
                placeholder={t("networks.symbolPlaceholder")}
                maxLength={12}
                required
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="network-rpc">{t("networks.rpcUrl")}</Label>
              <Input
                id="network-rpc"
                value={form.rpcUrl}
                onChange={(event) => update("rpcUrl", event.target.value)}
                placeholder={t("networks.rpcPlaceholder")}
                inputMode="url"
                spellCheck={false}
                required
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="network-explorer">
                {t("networks.explorerUrl")}{" "}
                <span className="text-muted-foreground font-normal">
                  ({t("common.optional")})
                </span>
              </Label>
              <Input
                id="network-explorer"
                value={form.explorerUrl}
                onChange={(event) => update("explorerUrl", event.target.value)}
                placeholder={t("networks.explorerPlaceholder")}
                inputMode="url"
                spellCheck={false}
              />
            </div>
          </div>

          <div className="flex items-center justify-between border-y border-rule py-3">
            <div>
              <p className="text-sm font-medium">{t("networks.testnet")}</p>
            </div>
            <Switch
              checked={form.testnet}
              onCheckedChange={(value) => update("testnet", value)}
              aria-label={t("networks.testnet")}
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
          {validated ? (
            <div className="text-success bg-success/5 flex items-center gap-2 rounded-[10px] px-3 py-2.5 text-sm">
              <CheckCircle2Icon className="size-4" />
              {t("networks.valid")}
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
              type="button"
              variant="secondary"
              onClick={() => void validate()}
              disabled={checking || saving}
            >
              {checking ? (
                <LoaderCircleIcon className="animate-spin" />
              ) : (
                <ServerIcon />
              )}
              {checking ? t("networks.validating") : t("networks.validate")}
            </Button>
            <Button type="submit" disabled={saving || checking}>
              {saving ? <LoaderCircleIcon className="animate-spin" /> : null}
              {editing ? t("networks.save") : t("networks.add")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
