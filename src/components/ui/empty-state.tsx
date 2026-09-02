import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <Card className="grid place-items-center px-6 py-16 text-center">
      <div className="max-w-sm">
        <span className="text-dim mx-auto grid size-12 place-items-center rounded-2xl border border-[var(--line)] bg-[var(--sunken)]">
          <Icon size={20} />
        </span>
        <h2 className="text-ink font-display mt-5 text-base font-semibold">
          {title}
        </h2>
        <p className="text-dim mt-2 text-sm leading-6 text-pretty">
          {description}
        </p>
        {action && <div className="mt-6 flex justify-center">{action}</div>}
      </div>
    </Card>
  );
}
