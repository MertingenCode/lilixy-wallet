"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Globe2Icon, LoaderCircleIcon, RadioTowerIcon } from "lucide-react";
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
import { useT } from "@/hooks/use-locale";
import {
  getChainRpcUrls,
  isSafeHttpUrl,
  type SupportedNetwork,
} from "@/lib/wagmi/networks";
import { clearRpcCache } from "@/lib/wagmi/rpc";
import { useSettingsStore } from "@/store/settings";

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

export function BuiltInRpcDialog({
  network,
  open,
  onOpenChange,
}: {
  network: SupportedNetwork | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useT();
  const queryClient = useQueryClient();
  const overrides = useSettingsStore((state) => state.builtInRpcOverrides);
  const setBuiltInRpcOverride = useSettingsStore(
    (state) => state.setBuiltInRpcOverride,
  );
  const [mode, setMode] = useState<"default" | "custom">("default");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const chainId = network?.chain.id;
  const currentOverride = chainId ? overrides[chainId] : undefined;
  const defaultUrl = network ? (getChainRpcUrls(network.chain)[0] ?? "") : "";

  useEffect(() => {
    if (!open) return;
    setMode(currentOverride ? "custom" : "default");
    setUrl(currentOverride ?? "");
    setError(null);
  }, [currentOverride, open]);

  async function save() {
    if (!network || saving) return;
    let nextUrl: string | null = null;
    if (mode === "custom") {
      const trimmed = url.trim();
      if (!trimmed || !isSafeHttpUrl(trimmed)) {
        setError(t("networks.rpcInvalid"));
        return;
      }
      nextUrl = trimmed;
    }
    setSaving(true);
    try {
      setBuiltInRpcOverride(network.chain.id, nextUrl);
      clearRpcCache();
      await queryClient.invalidateQueries({ queryKey: ["balances"] });
      await queryClient.invalidateQueries({ queryKey: ["token-market"] });
      toast.success(t("networks.rpcSaved"));
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-[1.5rem]">
            {network
              ? t("networks.rpcTitle", { network: network.chain.name })
              : t("networks.rpc")}
          </DialogTitle>
          <DialogDescription>{t("networks.rpcDescription")}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setMode("default");
              setError(null);
            }}
            className={
              mode === "default"
                ? "border-primary bg-primary/10 flex flex-col items-start gap-1 rounded-[12px] border p-3 text-start"
                : "border-rule flex flex-col items-start gap-1 rounded-[12px] border p-3 text-start"
            }
            aria-pressed={mode === "default"}
          >
            <Globe2Icon className="text-primary size-4" />
            <span className="text-sm font-medium">
              {t("networks.defaultRpc")}
            </span>
            <span className="text-muted-foreground truncate text-[0.6875rem]">
              {hostOf(defaultUrl)}
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("custom");
              setError(null);
            }}
            className={
              mode === "custom"
                ? "border-primary bg-primary/10 flex flex-col items-start gap-1 rounded-[12px] border p-3 text-start"
                : "border-rule flex flex-col items-start gap-1 rounded-[12px] border p-3 text-start"
            }
            aria-pressed={mode === "custom"}
          >
            <RadioTowerIcon className="text-primary size-4" />
            <span className="text-sm font-medium">
              {t("networks.customRpc")}
            </span>
            <span className="text-muted-foreground text-[0.6875rem]">
              {t("networks.customRpcShort")}
            </span>
          </button>
        </div>

        {mode === "custom" ? (
          <div className="space-y-1.5">
            <Label htmlFor="built-in-rpc-url">
              {t("networks.customRpcUrl")}
            </Label>
            <Input
              id="built-in-rpc-url"
              value={url}
              onChange={(event) => {
                setUrl(event.target.value.trim());
                setError(null);
              }}
              placeholder="https://..."
              autoComplete="off"
              spellCheck={false}
              className="font-mono text-sm"
              aria-invalid={Boolean(error)}
            />
            <p className="text-muted-foreground text-[0.6875rem] leading-5">
              {t("networks.customRpcHint")}
            </p>
          </div>
        ) : (
          <p className="text-muted-foreground text-xs leading-5">
            {t("networks.defaultRpcHint")}
          </p>
        )}

        {error ? (
          <p role="alert" className="text-destructive text-xs">
            {error}
          </p>
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
          <Button type="button" onClick={() => void save()} disabled={saving}>
            {saving ? <LoaderCircleIcon className="animate-spin" /> : null}
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
