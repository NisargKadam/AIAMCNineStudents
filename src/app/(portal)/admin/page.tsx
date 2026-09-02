import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ArrowUpRight, CircleAlert } from "lucide-react";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar } from "@/components/avatar";
import { percentage, pluralize, submissionStatus } from "@/lib/utils";

export const metadata = { title: "Admin overview" };

export default async function AdminPage() {
  const [
    students,
    activeStudents,
    prereqCount,
    assignments,
    submissions,
    posts,
    recent,
    confirmations,
  ] = await Promise.all([
    db.user.count({ where: { role: "STUDENT" } }),
    db.user.count({ where: { role: "STUDENT", isActive: true } }),
    db.prerequisite.count({
      where: { isActive: true, category: { isActive: true } },
    }),
    db.assignment.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { submissions: true } } },
    }),
    db.assignmentSubmission.groupBy({ by: ["status"], _count: true }),
    db.post.count(),
    db.assignmentSubmission.findMany({
      take: 6,
      orderBy: { updatedAt: "desc" },
      include: {
        assignment: { select: { title: true } },
        user: { include: { profile: true } },
      },
    }),
    db.prerequisiteConfirmation.count({ where: { invalidatedAt: null } }),
  ]);

  const countFor = (status: string) =>
    submissions.find((row) => row.status === status)?._count ?? 0;
  const totalSubmissions = submissions.reduce(
    (sum, row) => sum + row._count,
    0,
  );
  const awaitingReview = countFor("SUBMITTED");
  const approvedSubmissions = countFor("COMPLETED");
  const maxSubmissions = Math.max(
    ...assignments.map((a) => a._count.submissions),
    1,
  );

  const metrics = [
    {
      label: "Students",
      value: students,
      caption: `${activeStudents} active`,
    },
    {
      label: "Readiness confirmed",
      value: confirmations,
      caption: `of ${students} ${pluralize(students, "student")}`,
    },
    {
      label: "Submissions",
      value: totalSubmissions,
      caption: `${approvedSubmissions} approved`,
    },
    {
      label: "Community posts",
      value: posts,
      caption: "across the cohort",
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Admin console"
        title="Cohort operations"
        description="Where the cohort stands on readiness, delivery, and participation."
        action={
          awaitingReview > 0 ? (
            <Badge tone="caution">
              <CircleAlert size={12} />
              {awaitingReview} {pluralize(awaitingReview, "submission")}{" "}
              awaiting review
            </Badge>
          ) : (
            <Badge tone="verified">Review queue is clear</Badge>
          )
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.label} className="p-5">
            <p className="text-dim text-xs">{metric.label}</p>
            <p className="num font-display text-ink mt-4 text-3xl font-semibold">
              {metric.value}
            </p>
            <p className="text-faint mt-1 text-[11px]">{metric.caption}</p>
          </Card>
        ))}
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[1.25fr_.75fr]">
        <Card className="p-5 sm:p-6">
          <h2 className="font-display text-ink text-sm font-semibold">
            Submissions per assignment
          </h2>
          <p className="text-dim mt-1 text-xs">
            How far the cohort has travelled through the curriculum.
          </p>
          <div className="mt-6 flex h-44 items-end gap-2">
            {assignments.map((assignment) => (
              <div
                key={assignment.id}
                className="group flex h-full flex-1 flex-col justify-end gap-2"
                title={`${assignment.title}: ${assignment._count.submissions} of ${students}`}
              >
                <span className="num text-faint text-center text-[10px]">
                  {assignment._count.submissions}
                </span>
                <span
                  className="bg-ember/70 group-hover:bg-ember w-full rounded-t-md transition-[height,background-color] duration-500"
                  style={{
                    height: `${Math.max(
                      (assignment._count.submissions / maxSubmissions) * 100,
                      2,
                    )}%`,
                  }}
                />
                <span className="num text-faint text-center font-mono text-[10px]">
                  {String(assignment.sortOrder).padStart(2, "0")}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <h2 className="font-display text-ink text-sm font-semibold">
            Review pipeline
          </h2>
          <p className="text-dim mt-1 text-xs">
            Every submission by its current state.
          </p>
          <div className="mt-6 space-y-4">
            {(
              ["SUBMITTED", "REVIEWED", "NEEDS_CHANGES", "COMPLETED"] as const
            ).map((status) => (
              <Progress
                key={status}
                label={`${submissionStatus[status].label} (${countFor(status)})`}
                tone={status === "COMPLETED" ? "verified" : "ember"}
                value={percentage(countFor(status), totalSubmissions)}
              />
            ))}
          </div>
          <p className="text-faint mt-6 text-[11px] leading-5">
            {prereqCount} active readiness {pluralize(prereqCount, "check")} are
            configured for this cohort.
          </p>
        </Card>
      </section>

      <section className="mt-4">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--line)] p-5">
            <h2 className="font-display text-ink text-sm font-semibold">
              Latest submissions
            </h2>
            <Link
              href="/admin/students"
              className="text-dim hover:text-ink flex items-center gap-1 text-xs transition-colors"
            >
              Open student management
              <ArrowUpRight size={13} />
            </Link>
          </div>
          {recent.length ? (
            <ul className="divide-y divide-[var(--line)]">
              {recent.map((submission) => {
                const state = submissionStatus[submission.status];
                const name =
                  submission.user.profile?.fullName ?? submission.user.email;
                return (
                  <li key={submission.id}>
                    <Link
                      href={`/admin/students/${submission.userId}?tab=assignments`}
                      className="flex flex-wrap items-center gap-4 px-5 py-3.5 transition-colors hover:bg-[var(--sunken)]"
                    >
                      <Avatar
                        name={name}
                        url={submission.user.profile?.avatarUrl}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-ink truncate text-xs font-semibold">
                          {name}
                        </p>
                        <p className="text-faint truncate text-[11px]">
                          {submission.assignment.title}
                        </p>
                      </div>
                      <span className="text-faint text-[11px]">
                        {formatDistanceToNow(submission.updatedAt, {
                          addSuffix: true,
                        })}
                      </span>
                      <Badge tone={state.tone}>{state.label}</Badge>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-dim p-10 text-center text-sm">
              No submissions yet. They will appear here as students deliver.
            </p>
          )}
        </Card>
      </section>
    </>
  );
}
