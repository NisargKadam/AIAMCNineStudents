type Schedulable = { isActive: boolean; scheduledAt: Date | null };

/**
 * The soonest published session still ahead of us, or null.
 *
 * Reading the clock is a side effect, so it lives here rather than in a
 * component body where React expects render to be pure and repeatable.
 */
export function pickNextSession<T extends Schedulable>(
  sessions: T[],
): T | null {
  const now = Date.now();
  const upcoming = sessions.filter(
    (session) =>
      session.isActive &&
      session.scheduledAt !== null &&
      session.scheduledAt.getTime() > now,
  );
  upcoming.sort(
    (a, b) =>
      (a.scheduledAt as Date).getTime() - (b.scheduledAt as Date).getTime(),
  );
  return upcoming[0] ?? null;
}
