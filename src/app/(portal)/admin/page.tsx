import Link from "next/link";
import {
  ArrowUpRight,
  BookOpenCheck,
  CheckCircle2,
  ClipboardCheck,
  MessageSquare,
  UsersRound,
} from "lucide-react";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { percentage } from "@/lib/utils";
export const metadata = { title: "Admin Overview" };
export default async function AdminPage() {
  const [
    students,
    activePrereqs,
    completedPrereqs,
    submissions,
    completedAssignments,
    posts,
    recentSubmissions,
  ] = await Promise.all([
    db.user.count({ where: { role: "STUDENT" } }),
    db.prerequisite.count({
      where: { isActive: true, category: { isActive: true } },
    }),
    db.studentPrerequisite.count({
      where: {
        completed: true,
        prerequisite: { isActive: true, category: { isActive: true } },
      },
    }),
    db.assignmentSubmission.count(),
    db.assignmentSubmission.count({ where: { status: "COMPLETED" } }),
    db.post.count(),
    db.assignmentSubmission.findMany({
      take: 6,
      orderBy: { updatedAt: "desc" },
      include: { assignment: true, user: { include: { profile: true } } },
    }),
  ]);
  const prereqRate = percentage(
    completedPrereqs,
    Math.max(students * activePrereqs, 1),
  );
  const metrics = [
    {
      label: "Total Students",
      value: students,
      icon: UsersRound,
      tone: "text-sky-300",
    },
    {
      label: "Prerequisite Completion",
      value: `${prereqRate}%`,
      icon: BookOpenCheck,
      tone: "text-emerald-300",
    },
    {
      label: "Assignments Submitted",
      value: submissions,
      icon: ClipboardCheck,
      tone: "text-[#ff987e]",
    },
    {
      label: "Assignments Completed",
      value: completedAssignments,
      icon: CheckCircle2,
      tone: "text-emerald-300",
    },
    {
      label: "Community Posts",
      value: posts,
      icon: MessageSquare,
      tone: "text-violet-300",
    },
  ];
  return (
    <>
      <PageHeader
        eyebrow="Admin Console"
        title="Cohort operations"
        description="A clear view of readiness, delivery, and community activity across AI AMC Nine."
      />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {metrics.map(({ label, value, icon: Icon, tone }) => (
          <Card key={label} className="p-5">
            <Icon size={18} className={tone} />
            <p className="mt-5 text-2xl font-semibold text-white">{value}</p>
            <p className="text-muted mt-1 text-[11px]">{label}</p>
          </Card>
        ))}
      </section>
      <section className="mt-5 grid gap-5 xl:grid-cols-[1.3fr_.7fr]">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/[.07] p-5">
            <h2 className="text-sm font-semibold text-white">
              Recent submissions
            </h2>
            <Link
              href="/admin/students"
              className="text-muted flex items-center gap-1 text-xs hover:text-white"
            >
              Review students
              <ArrowUpRight size={13} />
            </Link>
          </div>
          <div className="divide-y divide-white/[.06]">
            {recentSubmissions.length ? (
              recentSubmissions.map((item) => (
                <div
                  key={item.id}
                  className="grid gap-2 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-center"
                >
                  <div>
                    <p className="text-xs font-semibold text-white">
                      {item.user.profile?.fullName ?? item.user.email}
                    </p>
                    <p className="text-muted mt-1 text-[10px]">
                      {item.user.email}
                    </p>
                  </div>
                  <p className="text-muted text-xs">{item.assignment.title}</p>
                  <Badge
                    tone={
                      item.status === "COMPLETED"
                        ? "success"
                        : item.status === "NEEDS_CHANGES"
                          ? "warning"
                          : "accent"
                    }
                  >
                    {item.status.replaceAll("_", " ")}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-muted p-10 text-center text-sm">
                No assignments submitted yet.
              </p>
            )}
          </div>
        </Card>
        <Card className="p-6">
          <p className="text-accent text-xs tracking-[.16em] uppercase">
            Needs attention
          </p>
          <h2 className="mt-3 text-xl font-semibold text-white">
            {Math.max(
              students -
                Math.floor(completedPrereqs / Math.max(activePrereqs, 1)),
              0,
            )}{" "}
            students
          </h2>
          <p className="text-muted mt-2 text-xs leading-5">
            have not completed every active prerequisite.
          </p>
          <Link
            href="/admin/students"
            className="mt-6 inline-flex items-center gap-1 text-xs font-semibold text-white hover:text-[#ff987e]"
          >
            Open student management
            <ArrowUpRight size={13} />
          </Link>
        </Card>
      </section>
    </>
  );
}
