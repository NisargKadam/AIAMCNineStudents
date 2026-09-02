import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  ClipboardCheck,
  MessageSquare,
  UserRound,
} from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { firstName, percentage } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/avatar";
import { formatDistanceToNow } from "date-fns";
export const metadata = { title: "Dashboard" };
export default async function DashboardPage() {
  const user = await requireUser();
  const [
    prereqTotal,
    prereqDone,
    assignments,
    submissions,
    postCount,
    recentPosts,
  ] = await Promise.all([
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
      select: { id: true, title: true },
    }),
    db.assignmentSubmission.findMany({
      where: { userId: user.id },
      select: { assignmentId: true, status: true },
    }),
    db.post.count({ where: { userId: user.id } }),
    db.post.findMany({
      take: 3,
      orderBy: { createdAt: "desc" },
      include: {
        user: { include: { profile: true } },
        _count: { select: { likes: true, comments: true } },
      },
    }),
  ]);
  const completed = submissions.filter((s) => s.status === "COMPLETED").length;
  const submitted = submissions.length;
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
  const assignmentPercent = percentage(completed, assignments.length);
  const overall = Math.round(
    (prereqPercent + assignmentPercent + profilePercent) / 3,
  );
  const submittedIds = new Set(submissions.map((s) => s.assignmentId));
  const nextAssignment = assignments.find((a) => !submittedIds.has(a.id));
  const metrics = [
    {
      label: "Prerequisites",
      value: `${prereqDone} / ${prereqTotal}`,
      caption: "completed",
      icon: BookOpenCheck,
      color: "text-emerald-300",
    },
    {
      label: "Assignments",
      value: `${submitted} / ${assignments.length}`,
      caption: "submitted",
      icon: ClipboardCheck,
      color: "text-[#ff987e]",
    },
    {
      label: "Profile",
      value: `${profilePercent}%`,
      caption: "complete",
      icon: UserRound,
      color: "text-sky-300",
    },
    {
      label: "Community",
      value: String(postCount),
      caption: "posts shared",
      icon: MessageSquare,
      color: "text-violet-300",
    },
  ];
  return (
    <>
      <header className="mb-8">
        <Badge tone="accent">AI AMC NINE</Badge>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-.04em] text-white sm:text-4xl">
          Welcome back, {firstName(user.profile?.fullName ?? user.email)}
        </h1>
        <p className="text-muted mt-2 text-sm">
          Keep your momentum. Every completed step compounds.
        </p>
      </header>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, caption, icon: Icon, color }) => (
          <Card key={label} className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-muted text-xs font-medium">{label}</p>
              <span className="grid size-9 place-items-center rounded-xl bg-white/[.05]">
                <Icon size={18} className={color} />
              </span>
            </div>
            <p className="mt-5 text-2xl font-semibold tracking-tight text-white">
              {value}
            </p>
            <p className="text-muted mt-1 text-xs">{caption}</p>
          </Card>
        ))}
      </section>
      <section className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        <Card className="relative overflow-hidden p-6 sm:p-7">
          <div className="bg-accent/10 absolute -top-16 -right-12 size-48 rounded-full blur-3xl" />
          <div className="relative flex flex-col gap-8 sm:flex-row sm:items-center">
            <div className="bg-elevated grid size-28 shrink-0 place-items-center rounded-full border-[10px] border-white/[.05]">
              <span className="text-center">
                <b className="block text-2xl text-white">{overall}%</b>
                <small className="text-muted text-[10px] tracking-wider uppercase">
                  overall
                </small>
              </span>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-white">
                Overall Learning Progress
              </h2>
              <p className="text-muted mt-1 text-xs leading-5">
                A balanced view of setup readiness, assignment mastery, and
                profile completion.
              </p>
              <div className="mt-5 space-y-3">
                <Progress label="Prerequisites" value={prereqPercent} />
                <Progress
                  label="Assignments completed"
                  value={assignmentPercent}
                />
                <Progress label="Profile" value={profilePercent} />
              </div>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <p className="text-accent text-xs font-bold tracking-[.16em] uppercase">
            Continue where you left off
          </p>
          {nextAssignment ? (
            <>
              <h2 className="mt-4 text-xl font-semibold text-white">
                {nextAssignment.title}
              </h2>
              <p className="text-muted mt-2 text-sm leading-6">
                Push your work to GitHub, then share the repository for review.
              </p>
              <Link
                href="/assignments"
                className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-white hover:text-[#ff987e]"
              >
                Open assignment <ArrowRight size={16} />
              </Link>
            </>
          ) : prereqDone < prereqTotal ? (
            <>
              <h2 className="mt-4 text-xl font-semibold text-white">
                Complete your prerequisites
              </h2>
              <p className="text-muted mt-2 text-sm leading-6">
                Verify your environment and foundations before moving ahead.
              </p>
              <Link
                href="/prerequisites"
                className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-white"
              >
                Continue checklist <ArrowRight size={16} />
              </Link>
            </>
          ) : (
            <div className="mt-8 flex items-center gap-3 text-emerald-300">
              <CheckCircle2 />
              <span className="font-semibold">You’re fully caught up.</span>
            </div>
          )}
        </Card>
      </section>
      <section className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        <Card className="p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-semibold text-white">
              Recent community activity
            </h2>
            <Link
              href="/community"
              className="text-muted text-xs hover:text-white"
            >
              View feed
            </Link>
          </div>
          {recentPosts.length ? (
            <div className="space-y-5">
              {recentPosts.map((post) => (
                <article key={post.id} className="flex gap-3">
                  <Avatar
                    name={post.user.profile?.fullName ?? post.user.email}
                    url={post.user.profile?.avatarUrl}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <p className="truncate text-xs font-semibold text-white">
                        {post.user.profile?.fullName ?? post.user.email}
                      </p>
                      <span className="text-muted text-[10px]">
                        {formatDistanceToNow(post.createdAt, {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                    <p className="text-muted mt-1 line-clamp-2 text-xs leading-5">
                      {post.content ?? post.linkUrl ?? "Shared an image"}
                    </p>
                  </div>
                  <span className="text-muted text-[10px]">
                    {post._count.likes} likes
                  </span>
                </article>
              ))}
            </div>
          ) : (
            <p className="text-muted py-8 text-center text-sm">
              Be the first to share what you’re building.
            </p>
          )}
        </Card>
        <Card className="to-surface flex flex-col justify-between overflow-hidden bg-gradient-to-br from-[#201a18] p-6">
          <div>
            <p className="text-xs tracking-[.18em] text-[#ff987e] uppercase">
              Course principle
            </p>
            <blockquote className="mt-4 text-xl leading-8 font-medium tracking-tight text-white">
              “Learn to build agents before agents learn to replace you.”
            </blockquote>
          </div>
          <p className="text-muted mt-10 text-xs">
            AI AMC — Agentic AI Masterclass
          </p>
        </Card>
      </section>
    </>
  );
}
