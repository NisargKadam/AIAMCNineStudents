import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { canAccessAdmin } from "@/lib/authorization";
import { PageHeader } from "@/components/page-header";
import { pickNextSession } from "@/features/sessions/next-session";
import { SessionBoard } from "@/features/sessions/session-board";

export const metadata = { title: "Sessions" };

export default async function SessionsPage() {
  const user = await requireUser();
  const canEdit = canAccessAdmin(user.role);

  // Students only ever see published sessions; administrators see hidden ones
  // too so they can prepare a session before announcing it.
  const sessions = await db.cohortSession.findMany({
    where: canEdit ? {} : { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  const nextSession = pickNextSession(sessions);

  return (
    <>
      <PageHeader
        eyebrow="Live classes"
        title="Sessions"
        description={
          canEdit
            ? "Post the join link before each session and the recording afterwards. Students can open both, but only you can change them."
            : "Join the live class here, and come back for the recording once it is posted."
        }
      />
      <SessionBoard
        canEdit={canEdit}
        nextSessionId={nextSession?.id ?? null}
        sessions={sessions.map((session) => ({
          id: session.id,
          sortOrder: session.sortOrder,
          title: session.title,
          description: session.description,
          scheduledAt: session.scheduledAt?.toISOString() ?? null,
          joinUrl: session.joinUrl,
          recordingUrl: session.recordingUrl,
          isActive: session.isActive,
        }))}
      />
    </>
  );
}
