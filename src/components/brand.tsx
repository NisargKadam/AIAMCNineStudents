import Link from "next/link";
import { cn } from "@/lib/utils";

export function Brand({
  compact = false,
  href = "/dashboard",
  className,
}: {
  compact?: boolean;
  href?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn("group flex items-center gap-3", className)}
      aria-label="AI AMC Nine home"
    >
      <span className="relative grid size-10 shrink-0 place-items-center rounded-[13px] bg-[linear-gradient(150deg,var(--ember),var(--ember-deep))] shadow-[0_10px_24px_-10px_var(--ember)] transition-transform duration-500 group-hover:[transform:perspective(600px)_rotateY(-18deg)_rotateX(8deg)]">
        <span className="font-display text-lg leading-none font-bold text-white">
          9
        </span>
        <span className="absolute inset-x-2 top-px h-px bg-white/50" />
      </span>
      {!compact && (
        <span className="leading-tight">
          <span className="font-display text-ink block text-[15px] font-semibold">
            AI AMC Nine
          </span>
          <span className="text-faint block text-[11px]">
            Agentic AI Masterclass
          </span>
        </span>
      )}
    </Link>
  );
}
