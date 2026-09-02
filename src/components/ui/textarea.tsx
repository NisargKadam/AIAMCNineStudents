import * as React from "react";
import { cn } from "@/lib/utils";
export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "placeholder:text-muted/60 focus:border-accent/70 focus:ring-accent/15 min-h-28 w-full resize-y rounded-xl border border-white/10 bg-[#10141a] px-3.5 py-3 text-sm text-white focus:ring-2",
        className,
      )}
      {...props}
    />
  );
}
