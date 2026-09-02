import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ArrowUpRight, Check, Heart, MessageSquare } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { firstName, percentage, submissionStatus } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/avatar";
import { ProgressDeck } from "@/features/dashboard/progress-deck";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUser();
  const [prereqTotal, prereqDone, assignments, submissions, recentPosts] =
    await Promise.all([
      db.prerequisite.count({
        where: { isActive: true, category: { isActive: true } },
      }),
      db.studentPrerequisite.count({
        where: {
          userId: user.id,
          completed: true,
          prerequisite: { isActive: true, category: { isActive: true } },
        },
      }),
      db.assignment.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: { id: true, title: true, sortOrder: true },
      }),
      db.assignmentSubmission.findMany({
        where: { userId: user.id },
        select: { assignmentId: true, status: true },
      }),
      db.post.findMany({
        take: 4,
        orderBy: { createdAt: "desc" },
        include: {
          user: { include: { profile: true } },
          _count: { select: { likes: true, comments: true } },
        },
      }),
    ]);

  const byAssignment = new Map(submissions.map((s) => [s.assignmentId, s]));
  const approved = submissions.filter((s) => s.status === "COMPLETED").length;

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
  const prereqPercent = percentage(prereqDone, prereqTotal);
  const assignmentPercent = percentage(approved, assignments.length);
  const overall = Math.round(
    (prereqPercent + assignmentPercent + profilePercent) / 3,
  );

  const nextAssignment = assignments.find((a) => !byAssignment.has(a.id));
  const needsChanges = submissions.find((s) => s.status === "NEEDS_CHANGES");

  const focus = needsChanges
    ? {
        headline: "One submission needs another pass",
        subline:
          "Your instructor asked for changes. Read the feedback, push an update, and resubmit.",
        cta: { label: "Open assignments", href: "/assignments" },
      }
    : prereqDone < prereqTotal
      ? {
          headline: "Finish your readiness checks",
          subline: `${prereqTotal - prereqDone} of ${prereqTotal} items are still open. Clearing them now keeps the build weeks unblocked.`,
          cta: { label: "Open the checklist", href: "/prerequisites" },
        }
      : nextAssignment
        ? {
            headline: nextAssignment.title,
            subline:
              "This is your next build. Push it to GitHub, then submit the repository for review.",
            cta: { label: "Start this assignment", href: "/assignments" },
          }
        : profilePercent < 100
          ? {
              headline: "Round out your profile",
              subline:
                "The cohort directory is how people find you. A complete profile makes collaboration easier.",
              cta: { label: "Edit profile", href: "/profile" },
            }
          : {
              headline: "Everything is clear",
              subline:
                "No open checks, no pending submissions. Good moment to help someone in the community.",
              cta: { label: "Open community", href: "/community" },
            };

  return (
    <>
      <header className="mb-7">
        <p className="text-dim flex items-center gap-2.5 text-xs">
          <span className="live-dot size-1.5 rounded-full bg-[var(--verified)]" />
          Signed in as{" "}
          {user.role === "ADMIN" ? "an administrator" : "a student"}
        </p>
        <h1 className="font-display text-ink mt-3 text-[30px] leading-tight font-semibold sm:text-[34px]">
          Welcome back, {firstName(user.profile?.fullName ?? user.email)}
        </h1>
      </header>

      <ProgressDeck
        overall={overall}
        prereqDone={prereqDone}
        prereqTotal={prereqTotal}
        assignmentsDone={approved}
        assignmentsTotal={assignments.length}
        profilePercent={profilePercent}
        headline={focus.headline}
        subline={focus.subline}
        cta={focus.cta}
      />

      {/* A sequence, so it is numbered: the ten builds, in delivery order. */}
      <section className="mt-4">
        <Card className="p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-ink text-sm font-semibold">
                Your build sequence
              </h2>
              <p className="text-dim mt-1 text-xs">
                {approved} of {assignments.length} approved
              </p>
            </div>
            <Link
              href="/assignments"
              className="text-dim hover:text-ink flex items-center gap-1 text-xs transition-colors"
            >
              Open assignments
              <ArrowUpRight size={13} />
            </Link>
          </div>
          <ol className="grid grid-cols-2 gap-2 sm:grid-cols-5 xl:grid-cols-10">
            {assignments.map((assignment) => {
              const submission = byAssignment.get(assignment.id);
              const state = submission
                ? submissionStatus[submission.status]
                : null;
              return (
                <li key={assignment.id}>
                  <Link
                    href="/assignments"
                    title={`${assignment.title} — ${state?.label ?? "Not started"}`}
                    className="group hover:border-ember/50 block rounded-xl border border-[var(--line)] bg-[var(--sunken)] p-3 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="num text-faint font-mono text-[11px]">
                        {String(assignment.sortOrder).padStart(2, "0")}
                      </span>
                      {submission?.status === "COMPLETED" && (
                        <Check size={12} className="text-[var(--verified)]" />
                      )}
                    </div>
                    <p className="text-ink group-hover:text-ember mt-2 line-clamp-2 text-[11px] leading-4 font-medium transition-colors">
                      {assignment.title}
                    </p>
                    <span
                      className="mt-2.5 block h-0.5 rounded-full"
                      style={{
                        background: submission
                          ? submission.status === "COMPLETED"
                            ? "var(--verified)"
                            : submission.status === "NEEDS_CHANGES"
                              ? "var(--caution)"
                              : "var(--ember)"
                          : "var(--line-strong)",
                      }}
                    />
                  </Link>
                </li>
              );
            })}
          </ol>
        </Card>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[1.25fr_.75fr]">
        <Card className="p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-display text-ink text-sm font-semibold">
              What the cohort is working on
            </h2>
            <Link
              href="/community"
              className="text-dim hover:text-ink flex items-center gap-1 text-xs transition-colors"
            >
              Open feed
              <ArrowUpRight size={13} />
            </Link>
          </div>
          {recentPosts.length ? (
            <div className="divide-y divide-[var(--line)]">
              {recentPosts.map((post) => (
                <article key={post.id} className="flex gap-3 py-3.5 first:pt-0">
                  <Avatar
                    name={post.user.profile?.fullName ?? post.user.email}
                    url={post.user.profile?.avatarUrl}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <p className="text-ink truncate text-xs font-semibold">
                        {post.user.profile?.fullName ?? post.user.email}
                      </p>
                      <span className="text-faint shrink-0 text-[11px]">
                        {formatDistanceToNow(post.createdAt, {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                    <p className="text-dim mt-1 line-clamp-2 text-xs leading-5">
                      {post.content ?? post.linkUrl ?? "Shared an image"}
                    </p>
                  </div>
                  <div className="text-faint flex shrink-0 items-center gap-3 text-[11px]">
                    <span className="flex items-center gap-1">
                      <Heart size={11} />
                      {post._count.likes}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare size={11} />
                      {post._count.comments}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="text-dim py-10 text-center text-sm">
              Nothing shared yet. Post the first build note.
            </p>
          )}
        </Card>

        <Card className="relative flex flex-col justify-between overflow-hidden p-6">
          <span
            aria-hidden
            className="absolute -top-24 -right-20 size-56 rounded-full opacity-40 blur-3xl"
            style={{ background: "var(--ember)" }}
          />
          <div className="relative">
            <Badge tone="ember">Course principle</Badge>
            <blockquote className="font-display text-ink mt-5 text-[21px] leading-8 font-medium text-balance">
              Learn to build agents before agents learn to replace you.
            </blockquote>
          </div>
          <p className="text-faint relative mt-10 text-xs">
            AI AMC — Agentic AI Masterclass
          </p>
        </Card>
      </section>
    </>
  );
}
