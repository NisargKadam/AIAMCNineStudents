"use client";
import { useState, useTransition } from "react";
import { ChevronDown, LoaderCircle, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  deleteAssignmentAction,
  upsertAssignmentAction,
} from "@/features/assignments/actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Confirm } from "@/components/ui/dialog";
import { cn, pluralize } from "@/lib/utils";

type Assignment = {
  id: string;
  title: string;
  description: string;
  instructions: string;
  sortOrder: number;
  dueDate: string;
  isActive: boolean;
  submissionCount: number;
};

function AssignmentEditor({
  assignment,
  defaultOpen = false,
  onDone,
}: {
  assignment: Assignment;
  defaultOpen?: boolean;
  onDone?: () => void;
}) {
  const [pending, start] = useTransition();
  const [data, setData] = useState(assignment);
  const [open, setOpen] = useState(defaultOpen);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const update = <K extends keyof Assignment>(key: K, value: Assignment[K]) =>
    setData((current) => ({ ...current, [key]: value }));

  return (
    <Card className="overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center gap-4 p-4 text-left"
      >
        <span className="text-faint num grid size-9 shrink-0 place-items-center rounded-xl border border-[var(--line)] bg-[var(--sunken)] font-mono text-[11px]">
          {String(data.sortOrder).padStart(2, "0")}
        </span>
        <span className="min-w-0 flex-1">
          <span className="font-display text-ink block truncate text-sm font-semibold">
            {data.title || "Untitled assignment"}
          </span>
          <span className="text-faint mt-0.5 block text-[11px]">
            {data.submissionCount}{" "}
            {pluralize(data.submissionCount, "submission")}
          </span>
        </span>
        {!data.isActive && <Badge tone="neutral">Hidden</Badge>}
        <ChevronDown
          size={16}
          className={cn(
            "text-faint shrink-0 transition-transform duration-300",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="rise border-t border-[var(--line)] p-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Order" htmlFor={`order-${data.id}`}>
              <Input
                id={`order-${data.id}`}
                type="number"
                min={1}
                value={data.sortOrder}
                onChange={(event) =>
                  update("sortOrder", Number(event.target.value))
                }
              />
            </Field>
            <Field
              label="Title"
              htmlFor={`title-${data.id}`}
              className="sm:col-span-2"
            >
              <Input
                id={`title-${data.id}`}
                value={data.title}
                onChange={(event) => update("title", event.target.value)}
                placeholder="What are they building?"
              />
            </Field>
            <Field label="Due date" htmlFor={`due-${data.id}`}>
              <Input
                id={`due-${data.id}`}
                type="date"
                value={data.dueDate}
                onChange={(event) => update("dueDate", event.target.value)}
              />
            </Field>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Field
              label="Description"
              htmlFor={`desc-${data.id}`}
              hint="Shown on the assignment list."
            >
              <Textarea
                id={`desc-${data.id}`}
                className="min-h-24"
                value={data.description}
                onChange={(event) => update("description", event.target.value)}
                placeholder="One or two sentences on what this build proves."
              />
            </Field>
            <Field
              label="Instructions"
              htmlFor={`inst-${data.id}`}
              hint="Optional. Shown when the student opens the assignment."
            >
              <Textarea
                id={`inst-${data.id}`}
                className="min-h-24"
                value={data.instructions}
                onChange={(event) => update("instructions", event.target.value)}
                placeholder="Requirements, constraints, and what good looks like."
              />
            </Field>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <label className="text-dim flex cursor-pointer items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={data.isActive}
                onChange={(event) => update("isActive", event.target.checked)}
                className="accent-ember size-4"
              />
              Visible to students
            </label>
            <div className="flex gap-2">
              {data.id && (
                <Button
                  variant="danger"
                  size="sm"
                  disabled={pending}
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 size={14} />
                  Delete
                </Button>
              )}
              <Button
                size="sm"
                disabled={pending || !data.title.trim()}
                onClick={() =>
                  start(async () => {
                    const result = await upsertAssignmentAction(data);
                    if (result.error) toast.error(result.error);
                    else {
                      toast.success(
                        data.id ? "Assignment saved." : "Assignment created.",
                      );
                      onDone?.();
                    }
                  })
                }
              >
                {pending ? (
                  <LoaderCircle size={14} className="animate-spin" />
                ) : (
                  <Save size={14} />
                )}
                Save
              </Button>
            </div>
          </div>
        </div>
      )}

      <Confirm
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this assignment?"
        description={`Every student submission for it (${data.submissionCount}) is deleted too. Hide it instead if you only want it off the list.`}
        confirmLabel="Delete assignment"
        pending={pending}
        onConfirm={() => {
          setConfirmDelete(false);
          start(async () => {
            const result = await deleteAssignmentAction(data.id);
            if (result.success) toast.success("Assignment deleted.");
          });
        }}
      />
    </Card>
  );
}

export function AssignmentManager({
  assignments,
}: {
  assignments: Assignment[];
}) {
  const [adding, setAdding] = useState(false);
  const nextOrder = Math.max(0, ...assignments.map((a) => a.sortOrder)) + 1;

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-dim text-xs">
          {assignments.length} {pluralize(assignments.length, "assignment")} ·{" "}
          {assignments.filter((a) => a.isActive).length} visible
        </p>
        <Button onClick={() => setAdding(!adding)}>
          <Plus size={16} />
          New assignment
        </Button>
      </div>

      {adding && (
        <div className="mb-3">
          <AssignmentEditor
            defaultOpen
            onDone={() => setAdding(false)}
            assignment={{
              id: "",
              title: "",
              description: "",
              instructions: "",
              sortOrder: nextOrder,
              dueDate: "",
              isActive: true,
              submissionCount: 0,
            }}
          />
        </div>
      )}

      <div className="space-y-2.5">
        {assignments.map((assignment) => (
          <AssignmentEditor key={assignment.id} assignment={assignment} />
        ))}
      </div>
    </>
  );
}
