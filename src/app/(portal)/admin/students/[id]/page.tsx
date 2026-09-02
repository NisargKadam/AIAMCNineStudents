import { notFound } from "next/navigation";
import { Code2, ExternalLink, MessageSquare } from "lucide-react";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ReviewSubmission } from "@/features/admin/review-submission";
import { percentage } from "@/lib/utils";
export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = (await params).id;
  const [user, prereqTotal, assignmentTotal] = await Promise.all([
    db.user.findUnique({
      where: { id },
      include: {
        profile: true,
        prerequisites: {
          where: {
            completed: true,
            prerequisite: { isActive: true, category: { isActive: true } },
          },
        },
        submissions: {
          orderBy: { assignment: { sortOrder: "asc" } },
          include: { assignment: true },
        },
        posts: { select: { id: true } },
        comments: { select: { id: true } },
      },
    }),
    db.prerequisite.count({
      where: { isActive: true, category: { isActive: true } },
    }),
    db.assignment.count({ where: { isActive: true } }),
  ]);
  if (!user) notFound();
  const completed = user.submissions.filter(
    (s) => s.status === "COMPLETED",
  ).length;
  return (
    <>
      <PageHeader
        eyebrow="Student detail"
        title={user.profile?.fullName ?? user.email}
        description={user.email}
      />
      <div className="grid gap-5 xl:grid-cols-[.7fr_1.3fr]">
        <div className="space-y-5">
          <Card className="p-6">
            <div className="flex items-center gap-2">
              <Badge tone={user.isActive ? "success" : "danger"}>
                {user.isActive ? "ACTIVE" : "INACTIVE"}
              </Badge>
              <Badge tone={user.role === "ADMIN" ? "accent" : "neutral"}>
                {user.role}
              </Badge>
            </div>
            <div className="mt-6 space-y-4">
              <Progress
                label={`Prerequisites ${user.prerequisites.length}/${prereqTotal}`}
                value={percentage(user.prerequisites.length, prereqTotal)}
              />
              <Progress
                label={`Assignments ${completed}/${assignmentTotal}`}
                value={percentage(completed, assignmentTotal)}
              />
            </div>
            {user.profile?.githubUsername && (
              <a
                className="mt-6 flex items-center gap-2 text-xs text-[#ff987e]"
                href={`https://github.com/${user.profile.githubUsername}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Code2 size={15} />
                {user.profile.githubUsername}
                <ExternalLink size={11} />
              </a>
            )}
            <p className="text-muted mt-5 flex items-center gap-2 text-xs">
              <MessageSquare size={14} />
              {user.posts.length} posts · {user.comments.length} comments
            </p>
          </Card>
        </div>
        <div className="space-y-4">
          {user.submissions.length ? (
            user.submissions.map((s) => (
              <Card key={s.id} className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-white">
                      {s.assignment.title}
                    </h2>
                    <p className="text-muted mt-1 text-[11px]">
                      Submitted {s.submittedAt.toLocaleString()}
                    </p>
                  </div>
                  <Badge
                    tone={
                      s.status === "COMPLETED"
                        ? "success"
                        : s.status === "NEEDS_CHANGES"
                          ? "warning"
                          : "accent"
                    }
                  >
                    {s.status.replaceAll("_", " ")}
                  </Badge>
                </div>
                <a
                  className="mt-4 inline-flex items-center gap-1 text-xs text-[#ff987e]"
                  href={s.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open GitHub submission
                  <ExternalLink size={12} />
                </a>
                <ReviewSubmission
                  id={s.id}
                  currentFeedback={s.instructorFeedback ?? ""}
                />
              </Card>
            ))
          ) : (
            <Card className="text-muted p-10 text-center text-sm">
              No assignment submissions yet.
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
