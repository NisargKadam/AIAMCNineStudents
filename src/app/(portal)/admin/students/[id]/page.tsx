import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowLeft,
  Check,
  Code2,
  ExternalLink,
  Heart,
  MessageSquare,
  Minus,
} from "lucide-react";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dial, Progress } from "@/components/ui/progress";
import { LinkTabs } from "@/components/ui/tabs";
import { Avatar } from "@/components/avatar";
import { ReviewSubmission } from "@/features/admin/review-submission";
import { percentage, pluralize, submissionStatus } from "@/lib/utils";

const TABS = [
  "overview",
  "readiness",
  "assignments",
  "community",
  "account",
] as const;
type Tab = (typeof TABS)[number];

export default async function StudentRecordPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const requested = (await searchParams).tab;
  const tab: Tab = TABS.includes(requested as Tab)
    ? (requested as Tab)
    : "overview";

  const [user, categories, assignments, auditLog] = await Promise.all([
    db.user.findUnique({
      where: { id },
      include: {
        profile: true,
        prerequisiteConfirmation: true,
        prerequisites: {
          where: { completed: true },
          select: { prerequisiteId: true },
        },
        submissions: {
          orderBy: { assignment: { sortOrder: "asc" } },
          include: { assignment: true },
        },
        posts: {
          orderBy: { createdAt: "desc" },
          take: 20,
          include: { _count: { select: { likes: true, comments: true } } },
        },
        comments: {
          orderBy: { createdAt: "desc" },
          take: 20,
          include: { post: { select: { id: true, content: true } } },
        },
        _count: { select: { posts: true, comments: true, sessions: true } },
      },
    }),
    db.prerequisiteCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      include: {
        prerequisites: {
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
        },
      },
    }),
    db.assignment.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
    db.auditLog.findMany({
      where: { entityType: "User", entityId: id },
      orderBy: { createdAt: "desc" },
      take: 25,
      include: { actor: { include: { profile: true } } },
    }),
  ]);

  if (!user) notFound();

  const name = user.profile?.fullName ?? user.email;
  const completedIds = new Set(user.prerequisites.map((p) => p.prerequisiteId));
  const prereqTotal = categories.reduce(
    (sum, category) => sum + category.prerequisites.length,
    0,
  );
  const prereqDone = categories.reduce(
    (sum, category) =>
      sum +
      category.prerequisites.filter((item) => completedIds.has(item.id)).length,
    0,
  );
  const submissionsByAssignment = new Map(
    user.submissions.map((submission) => [submission.assignmentId, submission]),
  );
  const approved = user.submissions.filter(
    (submission) => submission.status === "COMPLETED",
  ).length;
  const awaitingReview = user.submissions.filter(
    (submission) => submission.status === "SUBMITTED",
  ).length;

  const profileFields = [
    user.profile?.fullName,
    user.profile?.githubUsername,
    user.profile?.currentRole,
    user.profile?.country,
    user.profile?.timezone,
    user.profile?.bio,
  ];
  const profilePercent = percentage(
    profileFields.filter(Boolean).length,
    profileFields.length,
  );
  const overall = Math.round(
    (percentage(prereqDone, prereqTotal) +
      percentage(approved, assignments.length) +
      profilePercent) /
      3,
  );

  const confirmed =
    user.prerequisiteConfirmation !== null &&
    user.prerequisiteConfirmation.invalidatedAt === null;

  const base = `/admin/students/${id}`;
  const tabs = [
    { key: "overview", label: "Overview", href: base },
    {
      key: "readiness",
      label: "Readiness",
      href: `${base}?tab=readiness`,
      count: prereqDone,
    },
    {
      key: "assignments",
      label: "Assignments",
      href: `${base}?tab=assignments`,
      count: user.submissions.length,
    },
    {
      key: "community",
      label: "Community",
      href: `${base}?tab=community`,
      count: user._count.posts + user._count.comments,
    },
    { key: "account", label: "Account", href: `${base}?tab=account` },
  ];

  return (
    <>
      <Link
        href="/admin/students"
        className="text-dim hover:text-ink mb-5 inline-flex items-center gap-1.5 text-xs transition-colors"
      >
        <ArrowLeft size={13} />
        All students
      </Link>

      <PageHeader
        eyebrow="Student record"
        title={name}
        description={`${user.email}. Joined ${user.createdAt.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}.`}
        action={
          <div className="flex flex-wrap gap-2">
            <Badge tone={user.isActive ? "verified" : "alert"}>
              {user.isActive ? "Active" : "Inactive"}
            </Badge>
            <Badge tone={user.role === "ADMIN" ? "ember" : "neutral"}>
              {user.role === "ADMIN" ? "Administrator" : "Student"}
            </Badge>
            {awaitingReview > 0 && (
              <Badge tone="caution">{awaitingReview} awaiting review</Badge>
            )}
          </div>
        }
      />

      <LinkTabs tabs={tabs} active={tab} className="mb-5" />

      {tab === "overview" && (
        <div className="grid gap-4 xl:grid-cols-[.8fr_1.2fr]">
          <Card className="p-6">
            <div className="flex items-center gap-5">
              <Avatar name={name} url={user.profile?.avatarUrl} size="xl" />
              <div className="min-w-0">
                <p className="font-display text-ink truncate text-base font-semibold">
                  {name}
                </p>
                <p className="text-dim mt-1 truncate text-xs">
                  {user.profile?.currentRole ?? "No role given"}
                </p>
                {user.profile?.country && (
                  <p className="text-faint mt-1 truncate text-[11px]">
                    {user.profile.country}
                    {user.profile.timezone && `, ${user.profile.timezone}`}
                  </p>
                )}
              </div>
            </div>

            {user.profile?.bio && (
              <p className="text-dim mt-5 text-xs leading-6">
                {user.profile.bio}
              </p>
            )}

            <div className="mt-6 flex flex-wrap gap-2">
              {user.profile?.githubUsername && (
                <a
                  href={`https://github.com/${user.profile.githubUsername}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-dim hover:text-ink inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--sunken)] px-2.5 py-1.5 text-[11px] transition-colors"
                >
                  <Code2 size={12} />
                  {user.profile.githubUsername}
                  <ExternalLink size={9} />
                </a>
              )}
              {user.profile?.linkedinUrl && (
                <a
                  href={user.profile.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-dim hover:text-ink inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--sunken)] px-2.5 py-1.5 text-[11px] transition-colors"
                >
                  LinkedIn
                  <ExternalLink size={9} />
                </a>
              )}
              {user.profile?.openAiKeyLastFour && (
                <span className="text-faint inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--sunken)] px-2.5 py-1.5 font-mono text-[11px]">
                  API key ••••{user.profile.openAiKeyLastFour}
                </span>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex flex-wrap items-center gap-6">
              <Dial value={overall} caption="overall" />
              <div className="min-w-[240px] flex-1 space-y-4">
                <Progress
                  label={`Readiness ${prereqDone}/${prereqTotal}`}
                  value={percentage(prereqDone, prereqTotal)}
                  tone={prereqDone === prereqTotal ? "verified" : "ember"}
                />
                <Progress
                  label={`Assignments approved ${approved}/${assignments.length}`}
                  value={percentage(approved, assignments.length)}
                  tone={approved === assignments.length ? "verified" : "ember"}
                />
                <Progress
                  label="Profile completeness"
                  value={profilePercent}
                  tone="halo"
                />
              </div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Posts", value: user._count.posts },
                { label: "Comments", value: user._count.comments },
                { label: "Submissions", value: user.submissions.length },
                { label: "Active sessions", value: user._count.sessions },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-[var(--line)] bg-[var(--sunken)] p-3.5"
                >
                  <p className="num font-display text-ink text-xl font-semibold">
                    {stat.value}
                  </p>
                  <p className="text-faint mt-0.5 text-[11px]">{stat.label}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === "readiness" && (
        <div className="space-y-3">
          <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div>
              <p className="text-ink text-sm font-semibold">
                <span className="num">{prereqDone}</span> of{" "}
                <span className="num">{prereqTotal}</span> checks complete
              </p>
              <p className="text-faint mt-1 text-[11px]">
                {confirmed
                  ? `Confirmed ${user.prerequisiteConfirmation?.confirmedAt.toLocaleDateString()}`
                  : user.prerequisiteConfirmation
                    ? "Confirmation is out of date"
                    : "Never confirmed"}
              </p>
            </div>
            <Badge tone={confirmed ? "verified" : "caution"}>
              {confirmed ? "Confirmed" : "Not confirmed"}
            </Badge>
          </Card>

          {categories.map((category) => {
            const done = category.prerequisites.filter((item) =>
              completedIds.has(item.id),
            ).length;
            return (
              <Card key={category.id} className="overflow-hidden">
                <div className="flex items-center justify-between gap-4 border-b border-[var(--line)] p-4">
                  <p className="font-display text-ink text-sm font-semibold">
                    {category.name}
                  </p>
                  <span className="num text-faint text-xs">
                    {done}/{category.prerequisites.length}
                  </span>
                </div>
                <ul className="divide-y divide-[var(--line)]">
                  {category.prerequisites.map((item) => {
                    const isDone = completedIds.has(item.id);
                    return (
                      <li
                        key={item.id}
                        className="flex items-start gap-3 px-4 py-2.5"
                      >
                        <span
                          className={
                            isDone
                              ? "mt-0.5 text-[var(--verified)]"
                              : "text-faint mt-0.5"
                          }
                        >
                          {isDone ? <Check size={14} /> : <Minus size={14} />}
                        </span>
                        <span
                          className={
                            isDone
                              ? "text-dim text-xs leading-5"
                              : "text-ink text-xs leading-5"
                          }
                        >
                          {item.title}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            );
          })}
        </div>
      )}

      {tab === "assignments" && (
        <div className="space-y-3">
          {assignments.map((assignment) => {
            const submission = submissionsByAssignment.get(assignment.id);
            const state = submission
              ? submissionStatus[submission.status]
              : null;
            return (
              <Card key={assignment.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 gap-3">
                    <span className="text-faint num grid size-9 shrink-0 place-items-center rounded-xl border border-[var(--line)] bg-[var(--sunken)] font-mono text-[11px]">
                      {String(assignment.sortOrder).padStart(2, "0")}
                    </span>
                    <div className="min-w-0">
                      <h2 className="font-display text-ink text-sm font-semibold">
                        {assignment.title}
                      </h2>
                      {submission ? (
                        <p className="text-faint mt-1 text-[11px]">
                          Submitted{" "}
                          {submission.submittedAt.toLocaleDateString(
                            undefined,
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            },
                          )}
                        </p>
                      ) : (
                        <p className="text-faint mt-1 text-[11px]">
                          Nothing submitted yet
                        </p>
                      )}
                    </div>
                  </div>
                  {state ? (
                    <Badge tone={state.tone}>{state.label}</Badge>
                  ) : (
                    <Badge tone="neutral">Not started</Badge>
                  )}
                </div>

                {submission && (
                  <>
                    <a
                      href={submission.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-ember mt-4 inline-flex items-center gap-1.5 font-mono text-xs hover:underline"
                    >
                      {submission.githubUrl}
                      <ExternalLink size={11} />
                    </a>
                    {submission.studentNote && (
                      <p className="text-dim mt-3 rounded-xl border border-[var(--line)] bg-[var(--sunken)] p-3.5 text-xs leading-6">
                        {submission.studentNote}
                      </p>
                    )}
                    <ReviewSubmission
                      id={submission.id}
                      currentFeedback={submission.instructorFeedback ?? ""}
                    />
                  </>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {tab === "community" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <h2 className="font-display text-ink text-sm font-semibold">
              Posts
              <span className="text-faint num ml-2 font-normal">
                {user._count.posts}
              </span>
            </h2>
            {user.posts.length ? (
              user.posts.map((post) => (
                <Card key={post.id} className="p-4">
                  <p className="text-dim line-clamp-4 text-xs leading-6">
                    {post.content ?? post.linkUrl ?? "Shared an image"}
                  </p>
                  <div className="text-faint mt-3 flex items-center gap-4 text-[11px]">
                    <span>
                      {formatDistanceToNow(post.createdAt, { addSuffix: true })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart size={11} />
                      {post._count.likes}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare size={11} />
                      {post._count.comments}
                    </span>
                  </div>
                </Card>
              ))
            ) : (
              <Card className="text-dim p-8 text-center text-xs">
                No posts yet.
              </Card>
            )}
          </div>

          <div className="space-y-3">
            <h2 className="font-display text-ink text-sm font-semibold">
              Comments
              <span className="text-faint num ml-2 font-normal">
                {user._count.comments}
              </span>
            </h2>
            {user.comments.length ? (
              user.comments.map((comment) => (
                <Card key={comment.id} className="p-4">
                  <p className="text-dim text-xs leading-6">
                    {comment.content}
                  </p>
                  <p className="text-faint mt-2.5 line-clamp-1 text-[11px]">
                    on “{comment.post.content ?? "a shared link"}”
                  </p>
                </Card>
              ))
            ) : (
              <Card className="text-dim p-8 text-center text-xs">
                No comments yet.
              </Card>
            )}
          </div>
        </div>
      )}

      {tab === "account" && (
        <Card className="overflow-hidden">
          <div className="border-b border-[var(--line)] p-5">
            <h2 className="font-display text-ink text-sm font-semibold">
              Administrative history
            </h2>
            <p className="text-dim mt-1 text-xs">
              Every action taken on this account, newest first.
            </p>
          </div>
          {auditLog.length ? (
            <ul className="divide-y divide-[var(--line)]">
              {auditLog.map((entry) => (
                <li
                  key={entry.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
                >
                  <div className="min-w-0">
                    <p className="text-ink text-xs font-medium">
                      {entry.action.replaceAll("_", " ")}
                    </p>
                    <p className="text-faint mt-0.5 truncate text-[11px]">
                      by{" "}
                      {entry.actor?.profile?.fullName ??
                        entry.actor?.email ??
                        "a removed account"}
                    </p>
                  </div>
                  <span className="text-faint shrink-0 text-[11px]">
                    {entry.createdAt.toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-dim p-10 text-center text-sm">
              Nothing has been changed on this account yet.
            </p>
          )}
          <div className="border-t border-[var(--line)] p-5">
            <p className="text-faint text-[11px] leading-5">
              {user._count.sessions} active{" "}
              {pluralize(user._count.sessions, "session")}. Resetting or setting
              a password ends all of them.
            </p>
          </div>
        </Card>
      )}
    </>
  );
}
