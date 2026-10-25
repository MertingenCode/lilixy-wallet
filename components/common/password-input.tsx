"use client";

import { useId, useState } from "react";
import { EyeIcon, EyeOffIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT } from "@/hooks/use-locale";
import { cn } from "@/lib/utils";

export function PasswordInput({
  value,
  onChange,
  placeholder,
  autoComplete = "current-password",
  id,
  name,
  disabled,
  autoFocus,
  className,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: "current-password" | "new-password";
  id?: string;
  name?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}) {
  const { t } = useT();
  const generatedId = useId();
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id ?? generatedId}
        name={name}
        type={visible ? "text" : "password"}
        value={value}
        disabled={disabled}
        autoFocus={autoFocus}
        autoComplete={autoComplete}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={cn("pe-12", className)}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        spellCheck={false}
      />
      <Button
        type="button"
        variant="ghost"
        size="iconSm"
        tabIndex={-1}
        aria-label={visible ? t("password.hide") : t("password.show")}
        aria-pressed={visible}
        onClick={() => setVisible((current) => !current)}
        className="text-muted-foreground absolute end-1.5 top-1/2 -translate-y-1/2"
        disabled={disabled}
      >
        {visible ? (
          <EyeOffIcon className="size-4" />
        ) : (
          <EyeIcon className="size-4" />
        )}
      </Button>
    </div>
  );
}
