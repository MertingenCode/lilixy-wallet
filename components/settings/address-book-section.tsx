"use client";

import { useMemo, useState } from "react";
import {
  BookUserIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { CopyButton } from "@/components/common/copy-button";
import { AddressBookDialog } from "@/components/settings/address-book-dialog";
import { SettingsSection } from "@/components/settings/settings-section";
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
import { useT } from "@/hooks/use-locale";
import type { AddressBookEntry } from "@/lib/config/types";
import { useSettingsStore } from "@/store/settings";

export function AddressBookSection() {
  const { t } = useT();
  const addressBook = useSettingsStore((state) => state.addressBook);
  const removeAddressBookEntry = useSettingsStore(
    (state) => state.removeAddressBookEntry,
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AddressBookEntry | null>(null);
  const [deleting, setDeleting] = useState<AddressBookEntry | null>(null);

  const entries = useMemo(
    () =>
      [...addressBook].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
      ),
    [addressBook],
  );

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(entry: AddressBookEntry) {
    setEditing(entry);
    setDialogOpen(true);
  }

  function confirmDelete() {
    if (!deleting) return;
    removeAddressBookEntry(deleting.id);
    toast.success(t("settings.addressRemoved"));
    setDeleting(null);
  }

  return (
    <>
      <SettingsSection
        icon={BookUserIcon}
        title={t("settings.addressBook")}
        description={t("settings.addressBookDescription")}
      >
        <div className="flex flex-col gap-3">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={openCreate}>
              <PlusIcon />
              {t("settings.addAddress")}
            </Button>
          </div>

          {entries.length === 0 ? (
            <div className="rounded-[14px] border border-rule bg-paper-2/50 px-4 py-6 text-center">
              <BookUserIcon className="text-muted-foreground mx-auto size-6" />
              <p className="mt-2 text-sm font-medium">
                {t("settings.addressBookEmpty")}
              </p>
              <p className="text-muted-foreground mx-auto mt-1 max-w-sm text-xs leading-5">
                {t("settings.addressBookEmptyDescription")}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-rule border-y border-rule">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 py-3"
                >
                  <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                    {entry.name.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{entry.name}</p>
                    <p className="text-muted-foreground mt-0.5 break-all font-mono text-[0.6875rem] leading-4">
                      {entry.address}
                    </p>
                  </div>
                  <CopyButton
                    value={entry.address}
                    label={t("common.copy")}
                    size="iconSm"
                    iconClassName="size-3.5"
                  />
                  <Button
                    variant="ghost"
                    size="iconSm"
                    onClick={() => openEdit(entry)}
                    aria-label={t("settings.editAddress")}
                    title={t("settings.editAddress")}
                  >
                    <PencilIcon className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="iconSm"
                    onClick={() => setDeleting(entry)}
                    aria-label={t("common.delete")}
                    title={t("common.delete")}
                    className="text-destructive"
                  >
                    <Trash2Icon className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {entries.length > 0 ? (
            <p className="text-muted-foreground text-[0.6875rem]">
              {t("settings.savedAddressCount", { count: entries.length })}
            </p>
          ) : null}
        </div>
      </SettingsSection>

      <AddressBookDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
      />

      <AlertDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("settings.deleteAddressTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("settings.deleteAddressDescription", {
                name: deleting?.name ?? "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
