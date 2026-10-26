"use client";

import { useEffect, useState, type FormEvent } from "react";
import { getAddress, isAddress } from "viem";
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
import type { AddressBookEntry } from "@/lib/config/types";
import { useSettingsStore } from "@/store/settings";

function newAddressBookId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `contact-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function AddressBookDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: AddressBookEntry | null;
}) {
  const { t } = useT();
  const addressBook = useSettingsStore((state) => state.addressBook);
  const addAddressBookEntry = useSettingsStore(
    (state) => state.addAddressBookEntry,
  );
  const updateAddressBookEntry = useSettingsStore(
    (state) => state.updateAddressBookEntry,
  );
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(editing?.name ?? "");
    setAddress(editing?.address ?? "");
    setError(null);
  }, [editing, open]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const cleanName = name.trim().slice(0, 32);
    if (!cleanName) {
      setError(t("settings.contactNameRequired"));
      return;
    }
    if (!isAddress(address)) {
      setError(t("errors.invalidAddress"));
      return;
    }

    const checksummed = getAddress(address);
    const duplicate = addressBook.some(
      (entry) =>
        entry.id !== editing?.id &&
        entry.address.toLowerCase() === checksummed.toLowerCase(),
    );
    if (duplicate) {
      setError(t("settings.addressExists"));
      return;
    }

    if (editing) {
      updateAddressBookEntry({
        ...editing,
        name: cleanName,
        address: checksummed,
      });
      toast.success(t("settings.addressUpdated"));
    } else {
      addAddressBookEntry({
        id: newAddressBookId(),
        name: cleanName,
        address: checksummed,
        createdAt: Date.now(),
      });
      toast.success(t("settings.addressSaved"));
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="text-[1.5rem]">
            {editing ? t("settings.editAddress") : t("settings.addAddress")}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? t("settings.editAddressDescription")
              : t("settings.addAddressDescription")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(event) => void submit(event)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="address-book-name">
              {t("settings.contactName")}
            </Label>
            <Input
              id="address-book-name"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setError(null);
              }}
              placeholder={t("settings.contactNamePlaceholder")}
              maxLength={32}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="address-book-address">
              {t("common.address")}
            </Label>
            <Input
              id="address-book-address"
              value={address}
              onChange={(event) => {
                setAddress(event.target.value.trim());
                setError(null);
              }}
              placeholder="0x…"
              autoComplete="off"
              spellCheck={false}
              className="font-mono text-sm"
              aria-invalid={Boolean(address) && !isAddress(address)}
            />
          </div>

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
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit">
              {editing ? t("common.save") : t("common.add")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
