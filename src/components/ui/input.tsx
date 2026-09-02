import * as React from "react";
import { cn } from "@/lib/utils";
export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "placeholder:text-muted/60 focus:border-accent/70 focus:ring-accent/15 h-11 w-full rounded-xl border border-white/10 bg-[#10141a] px-3.5 text-sm text-white transition focus:ring-2",
        className,
      )}
      {...props}
    />
  );
}
