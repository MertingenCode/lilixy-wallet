"use client";

import { useEffect, useState } from "react";
import { AlertTriangleIcon, Trash2Icon } from "lucide-react";
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
import { resetWallet } from "@/lib/wallet/controller";

export function ResetWalletDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useT();
  const [confirmation, setConfirmation] = useState("");
  const [understood, setUnderstood] = useState(false);
  const [resetting, setResetting] = useState(false);
  const word = t("reset.confirmWord");

  useEffect(() => {
    if (!open) {
      setConfirmation("");
      setUnderstood(false);
      setResetting(false);
    }
  }, [open]);

  async function handleReset() {
    if (confirmation !== word || !understood || resetting) return;
    setResetting(true);
    try {
      await resetWallet();
      toast.success(t("reset.success"));
      onOpenChange(false);
    } catch {
      toast.error(t("reset.failed"));
      setResetting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="bg-destructive/10 text-destructive mb-2 flex size-11 items-center justify-center rounded-2xl">
            <AlertTriangleIcon className="size-5" />
          </div>
          <DialogTitle>{t("reset.title")}</DialogTitle>
          <DialogDescription>{t("reset.description")}</DialogDescription>
        </DialogHeader>

        <div className="border-destructive/25 bg-destructive/6 text-destructive rounded-xl border p-3 text-sm leading-relaxed">
          {t("reset.warning")}
        </div>

        <div className="space-y-2">
          <Label htmlFor="reset-confirmation">
            {t("reset.typeToConfirm", { word })}
          </Label>
          <Input
            id="reset-confirmation"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            autoComplete="off"
            spellCheck={false}
            disabled={resetting}
          />
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm">
          <input
            type="checkbox"
            className="accent-destructive mt-0.5 size-4"
            checked={understood}
            onChange={(event) => setUnderstood(event.target.checked)}
            disabled={resetting}
          />
          <span>{t("reset.understood")}</span>
        </label>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={resetting}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => void handleReset()}
            disabled={
              resetting || confirmation !== word || !understood
            }
          >
            <Trash2Icon />
            {resetting ? t("reset.resetting") : t("reset.button")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
