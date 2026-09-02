import { cn } from "@/lib/utils";

/**
 * The marker is a thin accent rule plus the section name — it carries where
 * you are, rather than repeating a decorative label above every heading.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "mb-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-end",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-dim mb-3 flex items-center gap-2.5 text-xs">
            <span className="bg-ember h-3.5 w-[3px] rounded-full" />
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-ink text-2xl font-semibold text-balance sm:text-[32px] sm:leading-[1.15]">
          {title}
        </h1>
        {description && (
          <p className="text-dim mt-3 max-w-2xl text-sm leading-6 text-pretty">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
