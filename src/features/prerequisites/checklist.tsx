"use client";
import { useMemo, useState, useTransition } from "react";
import {
  Check,
  ChevronDown,
  CircleCheckBig,
  LoaderCircle,
  RotateCcw,
  Search,
  Terminal,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn, pluralize } from "@/lib/utils";
import { confirmPrerequisites, savePrerequisiteChecklist } from "./actions";

type Item = {
  id: string;
  title: string;
  description: string | null;
  verification: string | null;
  completed: boolean;
};
type Category = {
  id: string;
  name: string;
  description: string | null;
  items: Item[];
};

export function PrerequisiteChecklist({
  categories,
  confirmation,
  currentVersion,
}: {
  categories: Category[];
  confirmation: {
    confirmedAt: string;
    confirmedVersion: number;
    invalidatedAt: string | null;
  } | null;
  currentVersion: number;
}) {
  const initial = useMemo(
    () =>
      Object.fromEntries(
        categories.flatMap((c) => c.items.map((i) => [i.id, i.completed])),
      ),
    [categories],
  );
  const [checked, setChecked] = useState<Record<string, boolean>>(initial);
  const [query, setQuery] = useState("");
  const [openOnly, setOpenOnly] = useState(false);
  const [pending, start] = useTransition();

  const total = categories.flatMap((c) => c.items).length;
  const done = Object.values(checked).filter(Boolean).length;
  const changed = JSON.stringify(checked) !== JSON.stringify(initial);
  const confirmed =
    confirmation &&
    !confirmation.invalidatedAt &&
    confirmation.confirmedVersion === currentVersion;
  const staleConfirmation =
    confirmation && confirmation.confirmedVersion < currentVersion;

  const order = useMemo(
    () => new Map(categories.map((category, i) => [category.id, i + 1])),
    [categories],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return categories
      .map((category) => ({
        ...category,
        items: category.items.filter((item) => {
          if (openOnly && checked[item.id]) return false;
          if (!q) return true;
          return `${item.title} ${item.description ?? ""} ${item.verification ?? ""}`
            .toLowerCase()
            .includes(q);
        }),
      }))
      .filter((category) => category.items.length > 0);
  }, [categories, checked, openOnly, query]);

  function persist(next: Record<string, boolean>) {
    return savePrerequisiteChecklist(
      Object.entries(next).map(([id, completed]) => ({ id, completed })),
    );
  }

  const save = () =>
    start(async () => {
      const result = await persist(checked);
      if (result.success) toast.success(result.success);
      else toast.error("Progress could not be saved. Try again.");
    });

  const confirm = () =>
    start(async () => {
      if (changed) await persist(checked);
      const result = await confirmPrerequisites();
      if (result.success) toast.success(result.success);
      else toast.error(result.error ?? "Confirmation failed.");
    });

  return (
    <>
      <Card className="mb-5 p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="flex-1">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-ink text-sm font-semibold">
                <span className="num">{done}</span> of{" "}
                <span className="num">{total}</span> checks complete
              </p>
              {confirmed ? (
                <Badge tone="verified">
                  <CircleCheckBig size={12} />
                  Confirmed
                </Badge>
              ) : confirmation ? (
                <Badge tone="caution">
                  <RotateCcw size={12} />
                  Reconfirmation needed
                </Badge>
              ) : (
                <Badge tone="neutral">Not confirmed yet</Badge>
              )}
            </div>
            <Progress
              value={(done / Math.max(total, 1)) * 100}
              tone={done === total ? "verified" : "ember"}
            />
            {confirmation && (
              <p className="text-faint mt-3 text-[11px]">
                Last confirmed{" "}
                {new Date(confirmation.confirmedAt).toLocaleString()} against
                checklist version {confirmation.confirmedVersion}.
              </p>
            )}
          </div>
        </div>
      </Card>

      {staleConfirmation && (
        <div className="mb-5 flex gap-3 rounded-2xl border border-[color-mix(in_oklab,var(--caution)_30%,transparent)] bg-[color-mix(in_oklab,var(--caution)_10%,transparent)] p-4">
          <TriangleAlert
            className="mt-0.5 shrink-0 text-[var(--caution)]"
            size={18}
          />
          <p className="text-dim text-sm leading-6">
            The checklist changed since you last confirmed. Review the items and
            confirm again so your record stays accurate.
          </p>
        </div>
      )}

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search
            size={15}
            className="text-faint absolute top-1/2 left-3.5 -translate-y-1/2"
          />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="pl-10"
            placeholder="Search checks"
            aria-label="Search checks"
          />
        </div>
        <Button
          variant={openOnly ? "default" : "secondary"}
          onClick={() => setOpenOnly(!openOnly)}
        >
          {openOnly ? "Showing open only" : "Show open only"}
        </Button>
      </div>

      <div className="space-y-3">
        {visible.map((category, index) => {
          const categoryDone = category.items.filter(
            (item) => checked[item.id],
          ).length;
          const allDone = categoryDone === category.items.length;
          return (
            <Card key={category.id} className="overflow-hidden">
              <details
                className="group"
                open={index === 0 || Boolean(query) || openOnly}
              >
                <summary className="flex cursor-pointer list-none items-center gap-4 p-5 marker:content-none [&::-webkit-details-marker]:hidden">
                  <span
                    className={cn(
                      "grid size-9 shrink-0 place-items-center rounded-xl border text-[11px] font-semibold transition-colors",
                      allDone
                        ? "border-[color-mix(in_oklab,var(--verified)_40%,transparent)] bg-[color-mix(in_oklab,var(--verified)_12%,transparent)] text-[var(--verified)]"
                        : "text-dim border-[var(--line)] bg-[var(--sunken)]",
                    )}
                  >
                    {allDone ? (
                      <Check size={15} strokeWidth={3} />
                    ) : (
                      <span className="num font-mono">
                        {String(order.get(category.id) ?? index + 1).padStart(
                          2,
                          "0",
                        )}
                      </span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="font-display text-ink block text-sm font-semibold">
                      {category.name}
                    </span>
                    {category.description && (
                      <span className="text-dim mt-1 block text-xs leading-5">
                        {category.description}
                      </span>
                    )}
                  </span>
                  <span className="num text-faint shrink-0 text-xs">
                    {categoryDone}/{category.items.length}
                  </span>
                  <ChevronDown
                    size={16}
                    className="text-faint shrink-0 transition-transform duration-300 group-open:rotate-180"
                  />
                </summary>
                <ul className="border-t border-[var(--line)] px-4 sm:px-5">
                  {category.items.map((item) => {
                    const isDone = Boolean(checked[item.id]);
                    return (
                      <li key={item.id}>
                        <label className="group flex cursor-pointer gap-3.5 border-b border-[var(--line)] py-4 last:border-0">
                          <input
                            className="sr-only"
                            type="checkbox"
                            checked={isDone}
                            onChange={() =>
                              setChecked((value) => ({
                                ...value,
                                [item.id]: !value[item.id],
                              }))
                            }
                          />
                          <span
                            className={cn(
                              "mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border transition-all duration-200",
                              isDone
                                ? "border-[var(--verified)] bg-[var(--verified)] text-[var(--void)]"
                                : "group-hover:border-ember border-[var(--line-strong)] bg-[var(--sunken)]",
                            )}
                          >
                            {isDone && <Check size={13} strokeWidth={3.5} />}
                          </span>
                          <span className="min-w-0">
                            <span
                              className={cn(
                                "block text-sm leading-6 transition-colors",
                                isDone ? "text-faint line-through" : "text-ink",
                              )}
                            >
                              {item.title}
                            </span>
                            {item.description && (
                              <span className="text-dim mt-1 block text-xs leading-5">
                                {item.description}
                              </span>
                            )}
                            {item.verification && (
                              <span className="text-dim mt-2 flex items-start gap-2 rounded-lg border border-[var(--line)] bg-[var(--sunken)] px-3 py-2 font-mono text-[11px] leading-5">
                                <Terminal
                                  size={12}
                                  className="text-ember mt-1 shrink-0"
                                />
                                {item.verification}
                              </span>
                            )}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </details>
            </Card>
          );
        })}
        {visible.length === 0 && (
          <Card className="text-dim p-12 text-center text-sm">
            {openOnly && !query
              ? "Every check is ticked. Confirm below to lock it in."
              : `Nothing matches “${query}”.`}
          </Card>
        )}
      </div>

      <Card
        tone="raised"
        className="sticky bottom-4 z-20 mt-5 flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <p className="text-dim text-xs leading-5">
          {changed
            ? `${Math.abs(done - Object.values(initial).filter(Boolean).length)} unsaved ${pluralize(Math.abs(done - Object.values(initial).filter(Boolean).length), "change")}.`
            : done === total
              ? "Everything is ticked. Confirm to record your readiness."
              : `${total - done} ${pluralize(total - done, "check")} still open.`}
        </p>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            disabled={!changed || pending}
            onClick={save}
          >
            {pending && <LoaderCircle size={15} className="animate-spin" />}
            Save progress
          </Button>
          <Button
            variant={done === total ? "verified" : "default"}
            disabled={done !== total || pending}
            onClick={confirm}
          >
            Confirm readiness
          </Button>
        </div>
      </Card>
    </>
  );
}
