"use client";
import { useMemo, useState, useTransition } from "react";
import {
  CalendarDays,
  ChevronDown,
  ExternalLink,
  Code2,
  LoaderCircle,
  MessageSquareText,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { submitAssignmentAction } from "./actions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { cn, submissionStatus, type SubmissionStatusName } from "@/lib/utils";

type Assignment = {
  id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  sortOrder: number;
  dueDate: string | null;
  submission: {
    githubUrl: string;
    studentNote: string | null;
    status: SubmissionStatusName;
    instructorFeedback: string | null;
    submittedAt: string;
    updatedAt: string;
    reviewedAt: string | null;
    completedAt: string | null;
  } | null;
};

type Filter = "all" | "open" | "review" | "approved";

function SubmissionForm({ assignment }: { assignment: Assignment }) {
  const [pending, start] = useTransition();
  const [url, setUrl] = useState(assignment.submission?.githubUrl ?? "");
  const [note, setNote] = useState(assignment.submission?.studentNote ?? "");
  const locked =
    assignment.submission !== null &&
    assignment.submission.status !== "SUBMITTED" &&
    assignment.submission.status !== "NEEDS_CHANGES";

  return (
    <div className="mt-5 border-t border-[var(--line)] pt-5">
      <div className="grid gap-3 lg:grid-cols-[1.2fr_.9fr_auto] lg:items-end">
        <Field label="GitHub repository">
          <div className="relative">
            <Code2
              size={15}
              className="text-faint absolute top-1/2 left-3.5 -translate-y-1/2"
            />
            <Input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              disabled={locked}
              className="pl-10 font-mono text-xs"
              placeholder="https://github.com/you/project"
            />
          </div>
        </Field>
        <Field label="Note for your reviewer">
          <Input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            disabled={locked}
            placeholder="Anything worth flagging?"
          />
        </Field>
        <Button
          disabled={pending || locked || !url}
          onClick={() =>
            start(async () => {
              const result = await submitAssignmentAction({
                assignmentId: assignment.id,
                githubUrl: url,
                studentNote: note,
              });
              if (result.success) toast.success(result.success);
              else toast.error(result.error ?? "Submission failed.");
            })
          }
        >
          {pending ? (
            <LoaderCircle size={15} className="animate-spin" />
          ) : (
            <Send size={15} />
          )}
          {assignment.submission ? "Resubmit" : "Submit"}
        </Button>
      </div>
      {locked && (
        <p className="text-faint mt-2.5 text-[11px] leading-5">
          This submission is locked while your instructor reviews it. They can
          request changes if an update is needed.
        </p>
      )}
    </div>
  );
}

export function AssignmentBoard({
  assignments,
}: {
  assignments: Assignment[];
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState<string | null>(
    assignments.find((a) => !a.submission)?.id ?? assignments[0]?.id ?? null,
  );

  const approved = assignments.filter(
    (a) => a.submission?.status === "COMPLETED",
  ).length;
  const inReview = assignments.filter(
    (a) =>
      a.submission?.status === "SUBMITTED" ||
      a.submission?.status === "REVIEWED",
  ).length;
  const changes = assignments.filter(
    (a) => a.submission?.status === "NEEDS_CHANGES",
  ).length;
  const notStarted = assignments.filter((a) => !a.submission).length;

  const filters: Array<{ key: Filter; label: string; count: number }> = [
    { key: "all", label: "All", count: assignments.length },
    { key: "open", label: "Not started", count: notStarted },
    { key: "review", label: "In review", count: inReview },
    { key: "approved", label: "Approved", count: approved },
  ];

  const visible = useMemo(
    () =>
      assignments.filter((assignment) => {
        const status = assignment.submission?.status;
        if (filter === "open") return !assignment.submission;
        if (filter === "review")
          return status === "SUBMITTED" || status === "REVIEWED";
        if (filter === "approved") return status === "COMPLETED";
        return true;
      }),
    [assignments, filter],
  );

  return (
    <>
      <Card className="mb-5 p-5 sm:p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
          <div className="shrink-0">
            <p className="num font-display text-ink text-4xl font-semibold">
              {approved}
              <span className="text-faint text-xl">
                {" "}
                / {assignments.length}
              </span>
            </p>
            <p className="text-dim mt-1.5 text-xs">assignments approved</p>
          </div>
          <div className="flex-1 lg:px-6">
            <Progress
              value={(approved / Math.max(assignments.length, 1)) * 100}
              tone={approved === assignments.length ? "verified" : "ember"}
              label="Curriculum progress"
            />
          </div>
          {changes > 0 && (
            <Badge tone="caution">{changes} waiting on your changes</Badge>
          )}
        </div>
      </Card>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {filters.map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
              filter === key
                ? "text-ink border-[var(--line-strong)] bg-[var(--raised)]"
                : "text-dim hover:text-ink border-transparent hover:bg-[var(--raised)]",
            )}
          >
            {label}
            <span className="num text-faint ml-1.5">{count}</span>
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {visible.map((assignment) => {
          const status = assignment.submission?.status;
          const state = status ? submissionStatus[status] : null;
          const expanded = open === assignment.id;
          return (
            <Card key={assignment.id} className="overflow-hidden">
              <button
                onClick={() => setOpen(expanded ? null : assignment.id)}
                aria-expanded={expanded}
                className="flex w-full items-center gap-4 p-5 text-left"
              >
                <span className="text-faint num grid size-10 shrink-0 place-items-center rounded-xl border border-[var(--line)] bg-[var(--sunken)] font-mono text-xs">
                  {String(assignment.sortOrder).padStart(2, "0")}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="font-display text-ink block text-sm font-semibold">
                    {assignment.title}
                  </span>
                  {assignment.description && (
                    <span className="text-dim mt-1 line-clamp-1 block text-xs leading-5">
                      {assignment.description}
                    </span>
                  )}
                </span>
                {state ? (
                  <Badge tone={state.tone}>{state.label}</Badge>
                ) : (
                  <Badge tone="neutral">Not started</Badge>
                )}
                <ChevronDown
                  size={16}
                  className={cn(
                    "text-faint shrink-0 transition-transform duration-300",
                    expanded && "rotate-180",
                  )}
                />
              </button>

              {expanded && (
                <div className="rise border-t border-[var(--line)] p-5 pt-4">
                  {assignment.instructions && (
                    <p className="text-dim rounded-xl border border-[var(--line)] bg-[var(--sunken)] p-4 text-xs leading-6 whitespace-pre-wrap">
                      {assignment.instructions}
                    </p>
                  )}

                  <div className="text-faint mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] first:mt-0">
                    {assignment.dueDate && (
                      <span className="flex items-center gap-1.5">
                        <CalendarDays size={12} />
                        Due{" "}
                        {new Date(assignment.dueDate).toLocaleDateString(
                          undefined,
                          { day: "numeric", month: "short", year: "numeric" },
                        )}
                      </span>
                    )}
                    {assignment.submission && (
                      <span>
                        Submitted{" "}
                        {new Date(
                          assignment.submission.submittedAt,
                        ).toLocaleDateString(undefined, {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    )}
                    {assignment.submission?.completedAt && (
                      <span className="text-[var(--verified)]">
                        Approved{" "}
                        {new Date(
                          assignment.submission.completedAt,
                        ).toLocaleDateString(undefined, {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    )}
                    {assignment.submission && (
                      <a
                        href={assignment.submission.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-ember inline-flex items-center gap-1.5 hover:underline"
                      >
                        Open repository
                        <ExternalLink size={11} />
                      </a>
                    )}
                  </div>

                  {assignment.submission?.instructorFeedback && (
                    <div className="mt-4 flex gap-3 rounded-xl border border-[color-mix(in_oklab,var(--caution)_28%,transparent)] bg-[color-mix(in_oklab,var(--caution)_8%,transparent)] p-4">
                      <MessageSquareText
                        size={16}
                        className="mt-0.5 shrink-0 text-[var(--caution)]"
                      />
                      <div>
                        <p className="text-ink text-xs font-semibold">
                          Instructor feedback
                        </p>
                        <p className="text-dim mt-1.5 text-xs leading-6 whitespace-pre-wrap">
                          {assignment.submission.instructorFeedback}
                        </p>
                      </div>
                    </div>
                  )}

                  <SubmissionForm assignment={assignment} />
                </div>
              )}
            </Card>
          );
        })}
        {visible.length === 0 && (
          <Card className="text-dim p-12 text-center text-sm">
            Nothing in this view yet.
          </Card>
        )}
      </div>
    </>
  );
}
