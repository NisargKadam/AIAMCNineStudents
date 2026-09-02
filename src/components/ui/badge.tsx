import { cn } from "@/lib/utils";
const map = {
  neutral: "bg-white/[.07] text-muted",
  accent: "bg-accent/15 text-[#ff987e]",
  success: "bg-emerald-500/15 text-emerald-300",
  warning: "bg-amber-500/15 text-amber-300",
  danger: "bg-red-500/15 text-red-300",
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
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide",
        map[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
