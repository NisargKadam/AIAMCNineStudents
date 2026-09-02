import * as React from "react";
import { cn } from "@/lib/utils";
export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-surface rounded-2xl border border-white/[.08] shadow-[0_20px_60px_rgba(0,0,0,.18)]",
        className,
      )}
      {...props}
    />
  );
}
