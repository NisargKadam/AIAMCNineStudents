import * as React from "react";
import { cn } from "@/lib/utils";

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  tone?: "panel" | "raised" | "glass" | "sunken";
  lit?: boolean;
};

export function Card({
  className,
  tone = "panel",
  lit = true,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "relative rounded-2xl",
        tone === "panel" && "panel",
        tone === "raised" && "panel-raised",
        tone === "glass" && "glass",
        tone === "sunken" && "bg-sunken border border-[var(--line)]",
        lit && "lit overflow-hidden",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  title,
  meta,
  action,
  className,
}: {
  title: React.ReactNode;
  meta?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 border-b border-[var(--line)] px-5 py-4",
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="text-ink truncate text-sm font-semibold">{title}</h2>
        {meta && <p className="text-dim mt-0.5 truncate text-xs">{meta}</p>}
      </div>
      {action}
    </div>
  );
}
