import * as React from "react";
import { cn } from "@/lib/utils";

const base =
  "w-full rounded-xl border border-[var(--line-strong)] bg-[var(--sunken)] text-ink placeholder:text-faint transition-[border-color,box-shadow,background-color] focus:border-ember focus:bg-[var(--panel)] focus:ring-4 focus:ring-[var(--ember-soft)] focus:outline-none disabled:opacity-50";

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input className={cn(base, "h-11 px-3.5 text-sm", className)} {...props} />
  );
}

export function Select({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(base, "h-11 cursor-pointer px-3 text-sm", className)}
      {...props}
    />
  );
}

export function Field({
  label,
  hint,
  htmlFor,
  children,
  className,
}: {
  label: string;
  hint?: React.ReactNode;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <label htmlFor={htmlFor} className="text-ink block text-xs font-semibold">
        {label}
      </label>
      {children}
      {hint && <p className="text-faint text-[11px] leading-4">{hint}</p>}
    </div>
  );
}
