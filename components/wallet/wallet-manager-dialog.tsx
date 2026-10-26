"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRightIcon, PlusIcon, WalletCardsIcon } from "lucide-react";
import { toast } from "sonner";

import { AddWalletDialog } from "@/components/wallet/add-wallet-dialog";
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
import { switchWallet } from "@/lib/wallet/controller";
import { isWalletError } from "@/lib/wallet/errors";
import {
  getActiveWalletId,
  getWallets,
  setActiveWalletId,
  type WalletProfile,
} from "@/lib/wallet/wallets";
import { shortenAddress } from "@/lib/utils";

export function WalletManagerDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useT();
  const queryClient = useQueryClient();
  const [wallets, setWallets] = useState<WalletProfile[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [target, setTarget] = useState<WalletProfile | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  function refresh() {
    setWallets(getWallets());
    setActiveId(getActiveWalletId());
  }

  useEffect(() => {
    if (!open) return;
    refresh();
    setTarget(null);
    setPassword("");
    setError(null);
  }, [open]);

  async function handleSwitch() {
    if (!target || !password || switching) return;
    setSwitching(true);
    setError(null);
    try {
      await switchWallet(target.id, password);
      setActiveWalletId(target.id);
      await queryClient.resetQueries();
      toast.success(t("wallets.switched"));
      setTarget(null);
      setPassword("");
      onOpenChange(false);
    } catch (caught) {
      setError(
        isWalletError(caught) && caught.code === "WRONG_PASSWORD"
          ? t("lock.wrongPassword")
          : t("errors.generic"),
      );
    } finally {
      setSwitching(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-[1.5rem]">
              {target
                ? t("wallets.switchTitle")
                : t("wallets.title")}
            </DialogTitle>
            <DialogDescription>
              {target
                ? t("wallets.switchDescription", { name: target.name })
                : t("wallets.description")}
            </DialogDescription>
          </DialogHeader>

          {target ? (
            <div className="space-y-4">
              <div className="rounded-[14px] border border-rule bg-paper-2/60 p-3">
                <p className="text-sm font-medium">{target.name}</p>
                <p className="text-muted-foreground mt-0.5 font-mono text-xs">
                  {shortenAddress(target.address, 8)}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="switch-wallet-password">
                  {t("lock.passwordPlaceholder")}
                </Label>
                <Input
                  id="switch-wallet-password"
                  type="password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setError(null);
                  }}
                  autoComplete="current-password"
                  autoFocus
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void handleSwitch();
                    }
                  }}
                />
              </div>
              {error ? (
                <p role="alert" className="text-destructive text-xs">
                  {error}
                </p>
              ) : null}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setTarget(null);
                    setPassword("");
                    setError(null);
                  }}
                  disabled={switching}
                >
                  {t("common.back")}
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => void handleSwitch()}
                  disabled={switching || !password}
                >
                  {switching ? t("common.loading") : t("wallets.switch")}
                  <ArrowRightIcon />
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="divide-y divide-rule border-y border-rule">
                {wallets.map((wallet) => {
                  const active = wallet.id === activeId;
                  return (
                    <div
                      key={wallet.id}
                      className="flex items-center gap-3 py-3"
                    >
                      <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-full">
                        <WalletCardsIcon className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {wallet.name}
                        </p>
                        <p className="text-muted-foreground mt-0.5 truncate font-mono text-xs">
                          {shortenAddress(wallet.address, 6)}
                        </p>
                      </div>
                      {active ? (
                        <span className="text-primary rounded-full bg-primary/10 px-2.5 py-1 text-[0.6875rem] font-medium">
                          {t("wallets.active")}
                        </span>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setTarget(wallet);
                            setPassword("");
                            setError(null);
                          }}
                        >
                          {t("wallets.switch")}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => setAddOpen(true)}
                >
                  <PlusIcon />
                  {t("wallets.add")}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AddWalletDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onAdded={() => {
          refresh();
          onOpenChange(false);
        }}
      />
    </>
  );
}
