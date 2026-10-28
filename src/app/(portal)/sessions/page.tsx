import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { canAccessAdmin } from "@/lib/authorization";
import { chooseBatch } from "@/lib/batches";
import { batchLabel } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { LinkTabs } from "@/components/ui/tabs";
import { pickNextSession } from "@/features/sessions/next-session";
import { SessionBoard } from "@/features/sessions/session-board";

export const metadata = { title: "Sessions" };

export default async function SessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ batch?: string }>;
}) {
  const user = await requireUser();
  const canEdit = canAccessAdmin(user.role);

  // Each batch has its own schedule. Students see their batch's; an
  // administrator switches between batches with the tabs.
  const batches = canEdit
    ? await db.batch.findMany({
        orderBy: { number: "desc" },
        include: { _count: { select: { sessions: true } } },
      })
    : [];
  const batch = canEdit
    ? chooseBatch((await searchParams).batch, batches)
    : user.batch;

  // Students only ever see published sessions; administrators see hidden ones
  // too so they can prepare a session before announcing it.
  const sessions = batch
    ? await db.cohortSession.findMany({
        where: canEdit
          ? { batchId: batch.id }
          : { batchId: batch.id, isActive: true },
        orderBy: { sortOrder: "asc" },
      })
    : [];

  const nextSession = pickNextSession(sessions);
  const label = batch ? batchLabel(batch.number) : null;

  return (
    <>
      <PageHeader
        eyebrow={label ? `Live classes · ${label}` : "Live classes"}
        title="Sessions"
        description={
          canEdit
            ? `Post the join link before each session and the recording afterwards. Only students in ${label ?? "the batch"} see these, and they cannot change them.`
            : label
              ? `${label}'s live classes. Join here, and come back for the recording once it is posted.`
              : "You are not in a batch yet, so there is no schedule to show. Ask your instructor to add you to one."
        }
      />
      {canEdit && batches.length > 0 && (
        <LinkTabs
          className="mb-5"
          active={batch ? String(batch.number) : ""}
          tabs={batches.map((option) => ({
            key: String(option.number),
            label: option.isEnrolling
              ? `${batchLabel(option.number)} · enrolling`
              : batchLabel(option.number),
            href: `/sessions?batch=${option.number}`,
            count: option._count.sessions,
          }))}
        />
      )}
      <SessionBoard
        canEdit={canEdit}
        batchId={batch?.id ?? null}
        batchName={label}
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
