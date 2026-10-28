"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  Layers,
  LoaderCircle,
  Plus,
  Trash2,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import {
  createBatchAction,
  deleteBatchAction,
  setEnrollingBatchAction,
} from "./batch-actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Field, Input } from "@/components/ui/input";
import { Confirm, Modal } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { formatSessionTime } from "@/features/sessions/schedule";
import { batchLabel, pluralize } from "@/lib/utils";

export type ManagedBatch = {
  id: string;
  number: number;
  isEnrolling: boolean;
  students: number;
  activeStudents: number;
  sessions: number;
  recordings: number;
  submissions: number;
  nextSessionAt: string | null;
};

type Result = { error?: string; success?: string };

export function BatchManager({ batches }: { batches: ManagedBatch[] }) {
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<ManagedBatch | null>(null);
  const [pending, start] = useTransition();
  const suggested = Math.max(0, ...batches.map((batch) => batch.number)) + 1;

  function run(action: () => Promise<Result>, after?: () => void) {
    start(async () => {
      const result = await action();
      if (result.error) toast.error(result.error);
      else {
        toast.success(result.success ?? "Done.");
        after?.();
      }
    });
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-dim text-xs">
          {batches.length} {pluralize(batches.length, "batch", "batches")}. Each
          has its own students and its own sessions; the curriculum and
          community are shared.
        </p>
        <Button onClick={() => setAdding(true)}>
          <Plus size={16} />
          New batch
        </Button>
      </div>

      {batches.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {batches.map((batch) => (
            <Card
              key={batch.id}
              tone={batch.isEnrolling ? "raised" : "panel"}
              className={
                batch.isEnrolling
                  ? "border-[color-mix(in_oklab,var(--ember)_40%,var(--line))] p-5 sm:p-6"
                  : "p-5 sm:p-6"
              }
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-display text-ink text-2xl font-semibold">
                    {batchLabel(batch.number)}
                  </p>
                  <p className="text-dim mt-1 text-xs">
                    {batch.isEnrolling
                      ? "New students join this batch."
                      : "Not taking new students."}
                  </p>
                </div>
                {batch.isEnrolling ? (
                  <Badge tone="ember">
                    <UserPlus size={12} />
                    Enrolling
                  </Badge>
                ) : (
                  <Badge tone="neutral">Closed</Badge>
                )}
              </div>

              <dl className="mt-5 grid grid-cols-3 gap-2">
                {[
                  {
                    label: "students",
                    value: batch.students,
                    caption: `${batch.activeStudents} active`,
                  },
                  {
                    label: pluralize(batch.sessions, "session"),
                    value: batch.sessions,
                    caption: `${batch.recordings} recorded`,
                  },
                  {
                    label: pluralize(batch.submissions, "submission"),
                    value: batch.submissions,
                    caption: "all projects",
                  },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-xl border border-[var(--line)] bg-[var(--sunken)] px-3 py-2.5"
                  >
                    <dd className="num font-display text-ink text-xl font-semibold">
                      {stat.value}
                    </dd>
                    <dt className="text-dim text-[11px]">{stat.label}</dt>
                    <p className="text-faint text-[10px]">{stat.caption}</p>
                  </div>
                ))}
              </dl>

              <p className="text-faint mt-4 flex items-center gap-1.5 text-[11px]">
                <CalendarDays size={11} />
                {batch.nextSessionAt
                  ? `Next session ${formatSessionTime(batch.nextSessionAt)}`
                  : "No upcoming session scheduled"}
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[var(--line)] pt-4">
                <Button asChild variant="secondary" size="sm">
                  <Link href={`/admin/students?batch=${batch.number}`}>
                    Students
                    <ArrowUpRight size={12} />
                  </Link>
                </Button>
                <Button asChild variant="secondary" size="sm">
                  <Link href={`/sessions?batch=${batch.number}`}>
                    Sessions
                    <ArrowUpRight size={12} />
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/admin?batch=${batch.number}`}>Overview</Link>
                </Button>
                <div className="ml-auto flex gap-1">
                  {!batch.isEnrolling && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pending}
                      onClick={() =>
                        run(() => setEnrollingBatchAction(batch.id))
                      }
                    >
                      Enroll new students here
                    </Button>
                  )}
                  {batch.students === 0 && !batch.isEnrolling && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={pending}
                      title="Delete batch"
                      aria-label={`Delete ${batchLabel(batch.number)}`}
                      className="hover:text-[var(--alert)]"
                      onClick={() => setDeleting(batch)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Layers}
          title="No batches yet"
          description="Create the first batch. New students join it automatically."
          action={
            <Button onClick={() => setAdding(true)}>
              <Plus size={16} />
              New batch
            </Button>
          }
        />
      )}

      <Modal
        open={adding}
        onOpenChange={setAdding}
        title="New batch"
        description="The new batch starts with the same session titles as the latest one, without dates, links, or recordings."
        width="28rem"
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            run(
              () =>
                createBatchAction({
                  number: form.get("number"),
                  isEnrolling: form.get("isEnrolling") === "on",
                }),
              () => setAdding(false),
            );
          }}
        >
          <Field label="Batch number" htmlFor="batch-number">
            <Input
              id="batch-number"
              name="number"
              type="number"
              min={1}
              max={999}
              defaultValue={suggested}
              required
              autoFocus
            />
          </Field>
          <label className="text-dim flex cursor-pointer items-center gap-2 text-xs">
            <input
              type="checkbox"
              name="isEnrolling"
              className="accent-ember size-4"
              defaultChecked
            />
            New students join this batch from now on
          </label>
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setAdding(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <LoaderCircle size={15} className="animate-spin" />}
              Create batch
            </Button>
          </div>
        </form>
      </Modal>

      <Confirm
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete ${deleting ? batchLabel(deleting.number) : "this batch"}?`}
        description={`Its ${deleting?.sessions ?? 0} ${pluralize(deleting?.sessions ?? 0, "session")}, their links, and any uploaded materials are removed too. This cannot be undone.`}
        confirmLabel="Delete batch"
        pending={pending}
        onConfirm={() => {
          const target = deleting;
          if (!target) return;
          setDeleting(null);
          run(() => deleteBatchAction(target.id));
        }}
      />
    </>
  );
}
