import Link from "next/link";
import { Prisma, SubmissionStatus } from "@prisma/client";
import { ClipboardCheck, ExternalLink } from "lucide-react";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { submissionStatus } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { ReviewSubmission } from "@/features/admin/review-submission";

export const metadata = { title: "Student submissions" };
const PAGE_SIZE = 20;

export default async function SubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const query =
    typeof params.q === "string" ? params.q.trim().slice(0, 200) : "";
  const status = Object.values(SubmissionStatus).includes(
    params.status as SubmissionStatus,
  )
    ? (params.status as SubmissionStatus)
    : undefined;
  const requestedPage =
    typeof params.page === "string" ? Number(params.page) : 1;
  const where: Prisma.AssignmentSubmissionWhereInput = {
    ...(status ? { status } : {}),
    ...(query
      ? {
          OR: [
            { user: { email: { contains: query, mode: "insensitive" } } },
            {
              user: {
                profile: { fullName: { contains: query, mode: "insensitive" } },
              },
            },
            { assignment: { title: { contains: query, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
  const [total, matching] = await Promise.all([
    db.assignmentSubmission.count(),
    db.assignmentSubmission.count({ where }),
  ]);
  const pages = Math.max(1, Math.ceil(matching / PAGE_SIZE));
  const page = Number.isSafeInteger(requestedPage)
    ? Math.min(pages, Math.max(1, requestedPage))
    : 1;
  const submissions = await db.assignmentSubmission.findMany({
    where,
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    include: {
      assignment: { select: { title: true, isActive: true } },
      user: {
        select: { email: true, profile: { select: { fullName: true } } },
      },
    },
  });
  function pageHref(value: number) {
    const search = new URLSearchParams({ page: String(value) });
    if (query) search.set("q", query);
    if (status) search.set("status", status);
    return `/admin/submissions?${search}`;
  }

  return (
    <>
      <PageHeader
        eyebrow="Admin console"
        title="Student submissions"
        description="All submitted work across the cohort, including submissions for hidden assignments. Open a repository and leave feedback here."
      />
      <Card className="mb-5 p-5">
        <form
          action="/admin/submissions"
          className="flex flex-wrap items-end gap-3"
        >
          <Field
            label="Student or assignment"
            htmlFor="submission-search"
            className="min-w-48 flex-1"
          >
            <Input
              id="submission-search"
              name="q"
              defaultValue={query}
              placeholder="Search name, email, or assignment"
            />
          </Field>
          <Field label="Status" htmlFor="submission-status">
            <Select
              id="submission-status"
              name="status"
              defaultValue={status ?? ""}
            >
              <option value="">All statuses</option>
              {Object.values(SubmissionStatus).map((value) => (
                <option key={value} value={value}>
                  {submissionStatus[value].label}
                </option>
              ))}
            </Select>
          </Field>
          <Button type="submit">Apply filters</Button>
          {(query || status) && (
            <Button variant="ghost" asChild>
              <Link href="/admin/submissions">Clear filters</Link>
            </Button>
          )}
        </form>
        <p className="text-dim mt-4 text-xs">
          {matching} matching · {total} total submissions
        </p>
      </Card>
      {submissions.length ? (
        <div className="space-y-4">
          {submissions.map((submission) => {
            const state = submissionStatus[submission.status];
            return (
              <Card key={submission.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/admin/students/${submission.userId}?tab=assignments`}
                      className="text-ember text-sm font-semibold hover:underline"
                    >
                      {submission.user.profile?.fullName ??
                        submission.user.email}
                    </Link>
                    <p className="text-faint mt-1 text-xs break-all">
                      {submission.user.email}
                    </p>
                    <h2 className="font-display text-ink mt-3 text-base font-semibold">
                      {submission.assignment.title}
                    </h2>
                    <p className="text-faint mt-1 text-xs">
                      Submitted{" "}
                      {submission.submittedAt.toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        timeZone: "UTC",
                      })}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {!submission.assignment.isActive && (
                      <Badge tone="neutral">Hidden assignment</Badge>
                    )}
                    <Badge tone={state.tone}>{state.label}</Badge>
                  </div>
                </div>
                <a
                  href={submission.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-ember mt-4 inline-flex max-w-full items-center gap-2 text-xs hover:underline"
                >
                  <span className="break-all">{submission.githubUrl}</span>
                  <ExternalLink size={14} className="shrink-0" />
                </a>
                {submission.studentNote && (
                  <p className="text-dim mt-3 rounded-xl bg-[var(--sunken)] p-3 text-sm break-words whitespace-pre-wrap">
                    {submission.studentNote}
                  </p>
                )}
                <ReviewSubmission
                  id={submission.id}
                  currentFeedback={submission.instructorFeedback ?? ""}
                />
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={ClipboardCheck}
          title={
            total
              ? "No submissions match these filters"
              : "No assignments have been submitted yet"
          }
          description={
            total
              ? "Clear the filters or search for another student or assignment."
              : "Students need to open Assignments, enter their GitHub repository, and click Submit. Adding a GitHub link to a profile or community post does not submit an assignment."
          }
        />
      )}
      {pages > 1 && (
        <nav
          aria-label="Submission pages"
          className="mt-5 flex items-center justify-between gap-3"
        >
          {page > 1 ? (
            <Button variant="secondary" asChild>
              <Link href={pageHref(page - 1)}>Previous</Link>
            </Button>
          ) : (
            <span />
          )}
          <p className="text-dim text-xs">
            Page {page} of {pages}
          </p>
          {page < pages ? (
            <Button variant="secondary" asChild>
              <Link href={pageHref(page + 1)}>Next</Link>
            </Button>
          ) : (
            <span />
          )}
        </nav>
      )}
    </>
  );
}
