import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Link-driven tabs so an administrator can bookmark or share the exact view
 * they are looking at.
 */
export function LinkTabs({
  tabs,
  active,
  className,
}: {
  tabs: Array<{ key: string; label: string; href: string; count?: number }>;
  active: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex gap-1 overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--sunken)] p-1",
        className,
      )}
    >
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          aria-current={active === tab.key ? "page" : undefined}
          className={cn(
            "flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-medium transition-colors",
            active === tab.key
              ? "panel-raised text-ink"
              : "text-dim hover:text-ink",
          )}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className="num text-faint">{tab.count}</span>
          )}
        </Link>
      ))}
    </div>
  );
}
