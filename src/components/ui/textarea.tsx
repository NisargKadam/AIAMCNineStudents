import * as React from "react";
import { cn } from "@/lib/utils";

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "text-ink placeholder:text-faint focus:border-ember min-h-28 w-full resize-y rounded-xl border border-[var(--line-strong)] bg-[var(--sunken)] px-3.5 py-3 text-sm leading-6 transition-[border-color,box-shadow,background-color] focus:bg-[var(--panel)] focus:ring-4 focus:ring-[var(--ember-soft)] focus:outline-none",
        className,
      )}
      {...props}
    />
  );
}
