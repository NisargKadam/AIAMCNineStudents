"use client";
import { useState, useTransition } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Code2,
  LoaderCircle,
  MessageSquareText,
  PartyPopper,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { submitAssignmentAction } from "./actions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
type Status =
  "NOT_STARTED" | "SUBMITTED" | "REVIEWED" | "NEEDS_CHANGES" | "COMPLETED";
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
    status: Exclude<Status, "NOT_STARTED">;
    instructorFeedback: string | null;
    submittedAt: string;
    updatedAt: string;
    reviewedAt: string | null;
    completedAt: string | null;
  } | null;
};
const tones: Record<Status, "neutral" | "accent" | "warning" | "success"> = {
  NOT_STARTED: "neutral",
  SUBMITTED: "accent",
  REVIEWED: "warning",
  NEEDS_CHANGES: "warning",
  COMPLETED: "success",
};
const labels: Record<Status, string> = {
  NOT_STARTED: "Not Started",
  SUBMITTED: "Submitted",
  REVIEWED: "Reviewed",
  NEEDS_CHANGES: "Needs Changes",
  COMPLETED: "Completed",
};
function SubmissionForm({ assignment }: { assignment: Assignment }) {
  const [pending, start] = useTransition();
  const [url, setUrl] = useState(assignment.submission?.githubUrl ?? "");
  const [note, setNote] = useState(assignment.submission?.studentNote ?? "");
  const locked =
    assignment.submission &&
    !["SUBMITTED", "NEEDS_CHANGES"].includes(assignment.submission.status);
  return (
    <div className="mt-5 border-t border-white/[.06] pt-5">
      <div className="grid gap-3 lg:grid-cols-[1fr_.7fr_auto]">
        <div>
          <label className="text-muted mb-2 block text-[11px] font-semibold">
            GitHub Submission URL
          </label>
          <div className="relative">
            <Code2 size={16} className="text-muted absolute top-3.5 left-3" />
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={Boolean(locked)}
              className="pl-9"
              placeholder="https://github.com/student/project"
            />
          </div>
        </div>
        <div>
          <label className="text-muted mb-2 block text-[11px] font-semibold">
            Student note <span className="font-normal">(optional)</span>
          </label>
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={Boolean(locked)}
            placeholder="What should reviewers know?"
          />
        </div>
        <Button
          className="self-end"
          disabled={pending || Boolean(locked) || !url}
          onClick={() =>
            start(async () => {
              const result = await submitAssignmentAction({
                assignmentId: assignment.id,
                githubUrl: url,
                studentNote: note,
              });
              if (result.success) toast.success(result.success);
              else toast.error(result.error);
            })
          }
        >
          {pending ? (
            <LoaderCircle size={15} className="animate-spin" />
          ) : (
            <Send size={15} />
          )}{" "}
          {assignment.submission ? "Update" : "Submit"}
        </Button>
      </div>
      {locked && (
        <p className="text-muted mt-2 text-[11px]">
          This submission is locked while reviewed. An instructor can request
          changes if an update is needed.
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
  const submissions = assignments.filter((a) => a.submission);
  const completed = submissions.filter(
    (a) => a.submission?.status === "COMPLETED",
  ).length;
  const counts = (status: Status) =>
    status === "NOT_STARTED"
      ? assignments.length - submissions.length
      : submissions.filter((a) => a.submission?.status === status).length;
  return (
    <>
      <Card className="mb-6 overflow-hidden p-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-center">
          <div>
            <p className="text-muted text-xs tracking-[.17em] uppercase">
              Assignments completed
            </p>
            <p className="mt-2 text-4xl font-semibold tracking-[-.05em] text-white">
              {completed}{" "}
              <span className="text-muted text-lg">/ {assignments.length}</span>
            </p>
          </div>
          <div className="flex-1 md:px-8">
            <Progress
              value={(completed / Math.max(assignments.length, 1)) * 100}
              label="Cohort curriculum"
            />
          </div>
          <div className="grid grid-cols-4 gap-4 text-center">
            <span>
              <b className="block text-sm text-white">{counts("SUBMITTED")}</b>
              <small className="text-muted text-[9px]">Submitted</small>
            </span>
            <span>
              <b className="block text-sm text-white">{counts("REVIEWED")}</b>
              <small className="text-muted text-[9px]">Reviewed</small>
            </span>
            <span>
              <b className="block text-sm text-amber-300">
                {counts("NEEDS_CHANGES")}
              </b>
              <small className="text-muted text-[9px]">Changes</small>
            </span>
            <span>
              <b className="block text-sm text-emerald-300">{completed}</b>
              <small className="text-muted text-[9px]">Complete</small>
            </span>
          </div>
        </div>
      </Card>
      {completed === assignments.length && assignments.length > 0 && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/[.07] p-5 text-emerald-200">
          <PartyPopper />
          <div>
            <p className="font-semibold">All assignments completed.</p>
            <p className="mt-1 text-xs text-emerald-200/70">
              A serious milestone — your body of work is ready to speak for
              itself.
            </p>
          </div>
        </div>
      )}
      <div className="space-y-4">
        {assignments.map((assignment) => {
          const status = assignment.submission?.status ?? "NOT_STARTED";
          return (
            <Card key={assignment.id} className="p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <span className="bg-elevated grid size-11 shrink-0 place-items-center rounded-xl border border-white/[.07] font-mono text-xs font-bold text-[#ff987e]">
                  {String(assignment.sortOrder).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-base font-semibold text-white">
                      {assignment.title}
                    </h2>
                    <Badge tone={tones[status]}>{labels[status]}</Badge>
                  </div>
                  <p className="text-muted mt-2 text-sm leading-6">
                    {assignment.description ??
                      "No description has been added yet."}
                  </p>
                  {assignment.dueDate && (
                    <p className="text-muted mt-3 flex items-center gap-1.5 text-xs">
                      <CalendarDays size={14} />
                      Due {new Date(assignment.dueDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
                {assignment.submission && (
                  <a
                    href={assignment.submission.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#ff987e] hover:underline"
                  >
                    Open GitHub <ExternalLink size={13} />
                  </a>
                )}
              </div>
              {assignment.submission?.instructorFeedback && (
                <div className="mt-4 flex gap-3 rounded-xl border border-amber-500/15 bg-amber-500/[.06] p-4">
                  <MessageSquareText
                    size={17}
                    className="mt-0.5 shrink-0 text-amber-300"
                  />
                  <div>
                    <p className="text-xs font-semibold text-amber-200">
                      Instructor feedback
                    </p>
                    <p className="text-muted mt-1 text-xs leading-5">
                      {assignment.submission.instructorFeedback}
                    </p>
                  </div>
                </div>
              )}
              {assignment.submission && (
                <div className="text-muted mt-4 flex flex-wrap gap-4 border-t border-white/[.05] pt-4 text-[10px]">
                  <span className="flex items-center gap-1">
                    <Clock3 size={12} />
                    Submitted{" "}
                    {new Date(
                      assignment.submission.submittedAt,
                    ).toLocaleString()}
                  </span>
                  {assignment.submission.reviewedAt && (
                    <span className="flex items-center gap-1">
                      <CheckCircle2 size={12} />
                      Reviewed{" "}
                      {new Date(
                        assignment.submission.reviewedAt,
                      ).toLocaleString()}
                    </span>
                  )}
                  {assignment.submission.completedAt && (
                    <span className="flex items-center gap-1 text-emerald-300">
                      <CheckCircle2 size={12} />
                      Completed{" "}
                      {new Date(
                        assignment.submission.completedAt,
                      ).toLocaleString()}
                    </span>
                  )}
                </div>
              )}
              <SubmissionForm assignment={assignment} />
            </Card>
          );
        })}
      </div>
    </>
  );
}
