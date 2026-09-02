"use client";
import { useMemo, useState, useTransition } from "react";
import {
  Check,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  LoaderCircle,
  RotateCcw,
  Terminal,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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
  const [pending, start] = useTransition();
  const total = categories.flatMap((c) => c.items).length;
  const done = Object.values(checked).filter(Boolean).length;
  const changed = JSON.stringify(checked) !== JSON.stringify(initial);
  const validConfirmation =
    confirmation &&
    !confirmation.invalidatedAt &&
    confirmation.confirmedVersion === currentVersion;
  const toggle = (id: string) =>
    setChecked((value) => ({ ...value, [id]: !value[id] }));
  const save = () =>
    start(async () => {
      const result = await savePrerequisiteChecklist(
        Object.entries(checked).map(([id, completed]) => ({ id, completed })),
      );
      if (result.success) toast.success(result.success);
      else toast.error("Could not save progress.");
    });
  const confirm = () =>
    start(async () => {
      if (changed) {
        await savePrerequisiteChecklist(
          Object.entries(checked).map(([id, completed]) => ({ id, completed })),
        );
      }
      const result = await confirmPrerequisites();
      if (result.success) toast.success(result.success);
      else toast.error(result.error);
    });
  return (
    <>
      <Card className="mb-6 p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="bg-accent/10 grid size-16 shrink-0 place-items-center rounded-2xl text-xl font-bold text-[#ff987e]">
            {done}
            <span className="sr-only">completed</span>
          </div>
          <div className="flex-1">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-white">
                {done} of {total} checks complete
              </p>
              {validConfirmation ? (
                <span className="flex items-center gap-1.5 text-xs text-emerald-300">
                  <CheckCircle2 size={15} />
                  Confirmed
                </span>
              ) : confirmation ? (
                <span className="flex items-center gap-1.5 text-xs text-amber-300">
                  <RotateCcw size={15} />
                  Reconfirmation required
                </span>
              ) : null}
            </div>
            <Progress value={(done / total) * 100} />
            {confirmation && (
              <p className="text-muted mt-3 text-[11px]">
                Last confirmed{" "}
                {new Date(confirmation.confirmedAt).toLocaleString()} ·
                configuration v{currentVersion}
              </p>
            )}
          </div>
        </div>
      </Card>
      {(confirmation?.confirmedVersion ?? currentVersion) < currentVersion && (
        <div className="mb-6 flex gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/[.08] p-4 text-sm text-amber-200">
          <CircleAlert className="shrink-0" size={20} />
          <span>
            Prerequisites have been updated. Please review and reconfirm.
          </span>
        </div>
      )}
      <div className="space-y-4">
        {categories.map((category, index) => (
          <Card key={category.id} className="overflow-hidden">
            <details open={index === 0} className="group">
              <summary className="flex cursor-pointer list-none items-center gap-4 p-5 sm:p-6">
                <span className="text-muted grid size-9 shrink-0 place-items-center rounded-xl bg-white/[.05] text-xs font-bold">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0 flex-1">
                  <b className="block text-sm font-semibold text-white">
                    {category.name}
                  </b>
                  {category.description && (
                    <small className="text-muted mt-1 block text-xs font-normal">
                      {category.description}
                    </small>
                  )}
                </span>
                <span className="text-muted text-xs">
                  {category.items.filter((i) => checked[i.id]).length}/
                  {category.items.length}
                </span>
                <ChevronDown
                  size={17}
                  className="text-muted transition group-open:rotate-180"
                />
              </summary>
              <div className="border-t border-white/[.06] px-4 py-2 sm:px-6">
                {category.items.map((item) => (
                  <label
                    key={item.id}
                    className="group/item flex cursor-pointer gap-3 border-b border-white/[.05] py-4 last:border-0"
                  >
                    <input
                      className="sr-only"
                      type="checkbox"
                      checked={Boolean(checked[item.id])}
                      onChange={() => toggle(item.id)}
                    />
                    <span
                      className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border transition ${checked[item.id] ? "border-accent bg-accent text-white" : "border-white/20 bg-black/10 group-hover/item:border-white/40"}`}
                    >
                      {checked[item.id] && <Check size={13} strokeWidth={3} />}
                    </span>
                    <span className="min-w-0">
                      <span
                        className={`block text-sm leading-5 ${checked[item.id] ? "text-muted line-through decoration-white/20" : "text-white"}`}
                      >
                        {item.title}
                      </span>
                      {item.description && (
                        <span className="text-muted mt-1 block text-xs leading-5">
                          {item.description}
                        </span>
                      )}
                      {item.verification && (
                        <span className="text-muted mt-2 flex items-start gap-2 rounded-lg bg-black/20 px-3 py-2 font-mono text-[11px] leading-5">
                          <Terminal
                            size={13}
                            className="mt-1 shrink-0 text-[#ff987e]"
                          />
                          {item.verification}
                        </span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
            </details>
          </Card>
        ))}
      </div>
      <Card className="sticky bottom-4 mt-6 flex flex-col gap-4 p-4 shadow-[0_20px_80px_rgba(0,0,0,.65)] sm:flex-row sm:items-center sm:justify-between">
        <label className="text-muted flex items-start gap-2 text-xs leading-5">
          <input
            type="checkbox"
            checked={done === total}
            readOnly
            className="mt-1 accent-[#d6401a]"
          />
          <span>
            I confirm that I have completed and verified the prerequisites
            above.
          </span>
        </label>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            disabled={!changed || pending}
            onClick={save}
          >
            {pending && <LoaderCircle size={15} className="animate-spin" />}Save
            progress
          </Button>
          <Button disabled={done !== total || pending} onClick={confirm}>
            Confirm Prerequisites
          </Button>
        </div>
      </Card>
    </>
  );
}
