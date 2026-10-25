"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";
import { useChainId, useSwitchChain } from "wagmi";

import { NetworkFormDialog } from "@/components/network/network-form-dialog";
import { NetworkLogo } from "@/components/wallet/network-logo";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useT } from "@/hooks/use-locale";
import type { CustomNetwork } from "@/lib/config/types";
import { deleteTransactionsByChain } from "@/lib/db/transactions-repo";
import { clearRpcCache } from "@/lib/wagmi/rpc";
import { BUILT_IN_NETWORKS } from "@/lib/wagmi/networks";
import { useSettingsStore } from "@/store/settings";

export function NetworkManagerDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useT();
  const queryClient = useQueryClient();
  const customNetworks = useSettingsStore((state) => state.customNetworks);
  const removeCustomNetwork = useSettingsStore(
    (state) => state.removeCustomNetwork,
  );
  const activeChainId = useChainId();
  const setActiveChainId = useSettingsStore(
    (state) => state.setActiveChainId,
  );
  const { switchChainAsync } = useSwitchChain();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CustomNetwork | null>(null);
  const [deleting, setDeleting] = useState<CustomNetwork | null>(null);

  async function confirmDelete() {
    if (!deleting) return;
    const chainId = deleting.chainId;
    removeCustomNetwork(chainId);
    await deleteTransactionsByChain(chainId);
    clearRpcCache();
    await queryClient.invalidateQueries({ queryKey: ["history"] });
    await queryClient.invalidateQueries({ queryKey: ["balances"] });
    if (activeChainId === chainId) {
      setActiveChainId(1);
      await switchChainAsync({ chainId: 1 } as never).catch(() => undefined);
    }
    toast.success(t("toast.networkDeleted"));
    setDeleting(null);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[560px]">
          <DialogHeader>
            <DialogTitle className="text-[1.5rem]">{t("networks.title")}</DialogTitle>
            <DialogDescription className="text-[0.75rem] leading-5">{t("networks.description")}</DialogDescription>
          </DialogHeader>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <PlusIcon />
            {t("networks.addNetwork")}
          </Button>

          <div className="mt-2">
            {BUILT_IN_NETWORKS.map((item) => (
              <div
                key={item.chain.id}
                className="flex items-center gap-3 border-b border-rule py-3"
              >
                <NetworkLogo
                  chainId={item.chain.id}
                  size={24}
                  label={item.chain.name}
                />
                <span className="min-w-0 flex-1 truncate text-[0.8125rem]">
                  {item.chain.name}
                </span>
                <Badge variant="outline">{t("networks.builtIn")}</Badge>
              </div>
            ))}

            {customNetworks.map((network) => (
              <div
                key={network.chainId}
                className="flex items-center gap-2 border-b border-rule py-3"
              >
                <NetworkLogo
                  chainId={network.chainId}
                  size={24}
                  label={network.name}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.8125rem]">{network.name}</p>
                  <p className="text-muted-foreground mt-0.5 flex gap-2 truncate text-[0.6875rem]">
                    <span>{network.symbol}</span>
                    <span>{network.chainId}</span>
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t("common.actions")}
                    >
                      <MoreHorizontalIcon />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onSelect={() => {
                        setEditing(network);
                        setFormOpen(true);
                      }}
                    >
                      <PencilIcon />
                      {t("common.edit")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={() => setDeleting(network)}
                    >
                      <Trash2Icon />
                      {t("common.delete")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {formOpen ? (
        <NetworkFormDialog
          key={editing?.chainId ?? "new"}
          open={formOpen}
          onOpenChange={setFormOpen}
          editing={editing}
        />
      ) : null}

      <AlertDialog
        open={Boolean(deleting)}
        onOpenChange={(next) => !next && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("networks.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("networks.deleteDescription", {
                network: deleting?.name ?? "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDelete()}>
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
