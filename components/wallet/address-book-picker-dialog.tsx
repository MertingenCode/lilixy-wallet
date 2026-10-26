"use client";

import { useEffect, useMemo, useState } from "react";
import { BookUserIcon, SearchIcon } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useT } from "@/hooks/use-locale";
import { shortenAddress } from "@/lib/utils";
import { useSettingsStore } from "@/store/settings";

export function AddressBookPickerDialog({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (address: string) => void;
}) {
  const { t } = useT();
  const addressBook = useSettingsStore((state) => state.addressBook);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (open) setQuery("");
  }, [open]);

  const entries = useMemo(() => {
    const search = query.trim().toLowerCase();
    return [...addressBook]
      .filter((entry) => {
        if (!search) return true;
        return (
          entry.name.toLowerCase().includes(search) ||
          entry.address.toLowerCase().includes(search)
        );
      })
      .sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
      );
  }, [addressBook, query]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="text-[1.5rem]">
            {t("send.addressBookTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("send.addressBookDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <SearchIcon className="text-muted-foreground pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("send.searchAddressBook")}
            autoFocus
            className="ps-9"
            aria-label={t("send.searchAddressBook")}
          />
        </div>

        {entries.length === 0 ? (
          <div className="rounded-[14px] border border-rule bg-paper-2/50 px-4 py-8 text-center">
            <BookUserIcon className="text-muted-foreground mx-auto size-6" />
            <p className="mt-2 text-sm font-medium">
              {addressBook.length === 0
                ? t("send.noSavedAddresses")
                : t("common.noResults")}
            </p>
            <p className="text-muted-foreground mx-auto mt-1 max-w-sm text-xs leading-5">
              {t("send.addressBookHint")}
            </p>
          </div>
        ) : (
          <div className="-mx-1 max-h-[min(22rem,50dvh)] overflow-y-auto">
            {entries.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => {
                  onSelect(entry.address);
                  onOpenChange(false);
                }}
                className="hover:bg-paper-2 flex w-full items-center gap-3 rounded-[12px] px-1 py-3 text-start transition-colors duration-[var(--dur-short)]"
              >
                <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                  {entry.name.slice(0, 2).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {entry.name}
                  </span>
                  <span className="text-muted-foreground block truncate font-mono text-[0.6875rem]">
                    {shortenAddress(entry.address, 8)}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
