import { cn } from "@/lib/utils";

/**
 * A meter, not a decoration: the track carries ticks so a partial value can be
 * read at a glance without the numeric label.
 */
export function Progress({
  value,
  label,
  tone = "ember",
  className,
}: {
  value: number;
  label?: React.ReactNode;
  tone?: "ember" | "verified" | "halo";
  className?: string;
}) {
  const clamped = Math.min(100, Math.max(0, value));
  const color =
    tone === "verified"
      ? "var(--verified)"
      : tone === "halo"
        ? "var(--halo)"
        : "var(--ember)";
  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <div className="text-dim flex items-baseline justify-between gap-3 text-xs">
          <span className="truncate">{label}</span>
          <span className="num text-ink font-semibold">
            {Math.round(clamped)}%
          </span>
        </div>
      )}
      <div
        className="relative h-1.5 overflow-hidden rounded-full bg-[var(--sunken)] ring-1 ring-[var(--line)] ring-inset"
        role="progressbar"
        aria-label={typeof label === "string" ? label : undefined}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(clamped)}
      >
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-out"
          style={{
            width: `${clamped}%`,
            background: `linear-gradient(90deg, color-mix(in oklab, ${color} 65%, transparent), ${color})`,
            boxShadow: `0 0 14px -2px ${color}`,
          }}
        />
      </div>
    </div>
  );
}

/** Circular readout for the single most important number on a screen. */
export function Dial({
  value,
  size = 128,
  label,
  caption,
}: {
  value: number;
  size?: number;
  label?: string;
  caption?: string;
}) {
  const clamped = Math.min(100, Math.max(0, value));
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${label ?? "Progress"}: ${Math.round(clamped)} percent`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="color-mix(in oklab, var(--ink) 9%, transparent)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#dial)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped / 100)}
          style={{
            transition: "stroke-dashoffset 900ms cubic-bezier(.2,.7,.2,1)",
          }}
        />
        <defs>
          <linearGradient id="dial" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--ember)" />
            <stop offset="100%" stopColor="var(--caution)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="num font-display text-ink text-3xl font-semibold">
            {Math.round(clamped)}
            <span className="text-dim text-base">%</span>
          </p>
          {caption && (
            <p className="text-faint mt-0.5 text-[10px]">{caption}</p>
          )}
        </div>
      </div>
    </div>
  );
}
