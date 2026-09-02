import { cn } from "@/lib/utils";

const map = {
  neutral: "bg-[var(--sunken)] text-dim border-[var(--line)]",
  ember:
    "bg-[var(--ember-soft)] text-ember border-[color-mix(in_oklab,var(--ember)_32%,transparent)]",
  verified:
    "bg-[color-mix(in_oklab,var(--verified)_12%,transparent)] text-[var(--verified)] border-[color-mix(in_oklab,var(--verified)_30%,transparent)]",
  caution:
    "bg-[color-mix(in_oklab,var(--caution)_12%,transparent)] text-[var(--caution)] border-[color-mix(in_oklab,var(--caution)_30%,transparent)]",
  alert:
    "bg-[color-mix(in_oklab,var(--alert)_12%,transparent)] text-[var(--alert)] border-[color-mix(in_oklab,var(--alert)_30%,transparent)]",
  halo: "bg-[color-mix(in_oklab,var(--halo)_14%,transparent)] text-[var(--halo)] border-[color-mix(in_oklab,var(--halo)_30%,transparent)]",
};

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: keyof typeof map;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] leading-5 font-medium",
        map[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
