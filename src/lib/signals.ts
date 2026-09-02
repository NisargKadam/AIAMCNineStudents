import "server-only";
import { Role, SubmissionStatus } from "@prisma/client";
import { db } from "@/lib/db";
import type { ShellSignal } from "@/components/app-shell";

const WEEK = 7 * 24 * 60 * 60 * 1000;

/**
 * Derived, honest attention list. Nothing here is an unread counter — every
 * entry is something the signed-in person can still act on right now.
 */
export async function loadSignals(user: {
  id: string;
  role: Role;
}): Promise<ShellSignal[]> {
  const since = new Date(Date.now() - WEEK);

  if (user.role === Role.ADMIN) {
    const [awaiting, freshPosts] = await Promise.all([
      db.assignmentSubmission.findMany({
        where: { status: SubmissionStatus.SUBMITTED },
        orderBy: { updatedAt: "desc" },
        take: 5,
        include: {
          assignment: { select: { title: true } },
          user: { select: { id: true, email: true, profile: true } },
        },
      }),
      db.post.count({ where: { createdAt: { gte: since } } }),
    ]);

    const signals: ShellSignal[] = awaiting.map((submission) => ({
      id: submission.id,
      title: `Review ${submission.user.profile?.fullName ?? submission.user.email}`,
      detail: `${submission.assignment.title} is waiting for feedback.`,
      href: `/admin/students/${submission.user.id}`,
      tone: "ember" as const,
    }));

    if (freshPosts > 0)
      signals.push({
        id: "community-week",
        title: `${freshPosts} new ${freshPosts === 1 ? "post" : "posts"} this week`,
        detail: "Check the community feed for anything that needs moderation.",
        href: "/admin/community",
        tone: "neutral",
      });

    return signals;
  }

  const [submissions, prereqTotal, prereqDone, confirmation, comments] =
    await Promise.all([
      db.assignmentSubmission.findMany({
        where: { userId: user.id },
        orderBy: { updatedAt: "desc" },
        take: 8,
        include: { assignment: { select: { title: true } } },
      }),
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
      db.prerequisiteConfirmation.findUnique({ where: { userId: user.id } }),
      db.postComment.count({
        where: {
          createdAt: { gte: since },
          post: { userId: user.id },
          NOT: { userId: user.id },
        },
      }),
    ]);

  const signals: ShellSignal[] = [];

  for (const submission of submissions) {
    if (submission.status === SubmissionStatus.NEEDS_CHANGES)
      signals.push({
        id: submission.id,
        title: `Changes requested: ${submission.assignment.title}`,
        detail: "Read the feedback, push an update, and resubmit.",
        href: "/assignments",
        tone: "caution",
      });
    else if (
      submission.status === SubmissionStatus.COMPLETED &&
      submission.completedAt &&
      submission.completedAt >= since
    )
      signals.push({
        id: submission.id,
        title: `Approved: ${submission.assignment.title}`,
        detail: "Your instructor signed this one off.",
        href: "/assignments",
        tone: "verified",
      });
  }

  if (prereqTotal > 0 && prereqDone < prereqTotal)
    signals.push({
      id: "prereq-open",
      title: `${prereqTotal - prereqDone} readiness ${prereqTotal - prereqDone === 1 ? "check" : "checks"} left`,
      detail: "Finish the checklist so nothing blocks you later.",
      href: "/prerequisites",
      tone: "ember",
    });
  else if (
    prereqTotal > 0 &&
    (!confirmation || confirmation.invalidatedAt !== null)
  )
    signals.push({
      id: "prereq-confirm",
      title: "Confirm your prerequisites",
      detail: "Everything is checked. Confirm to lock it in.",
      href: "/prerequisites",
      tone: "verified",
    });

  if (comments > 0)
    signals.push({
      id: "comments",
      title: `${comments} new ${comments === 1 ? "reply" : "replies"} this week`,
      detail: "Someone responded to what you shared.",
      href: "/community",
      tone: "neutral",
    });

  return signals.slice(0, 6);
}
