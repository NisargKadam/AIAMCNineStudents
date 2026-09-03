/**
 * Converting between a `datetime-local` field and a stored instant.
 *
 * A `datetime-local` value is wall-clock text with no timezone ("2026-09-07T04:00").
 * Resolving it has to happen in the browser, where the administrator's own
 * timezone applies — doing it on the server resolves it in the server's zone
 * instead, which on a UTC host silently shifts every time that is entered.
 * The database therefore stores a real instant, and each viewer renders it in
 * their own timezone.
 */

/** Browser wall-clock text to a UTC instant. Returns "" for an empty field. */
export function localInputToIso(value: string): string {
  if (!value.trim()) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime()))
    throw new Error(`Not a valid date and time: ${value}`);
  return date.toISOString();
}

/** A stored instant back to wall-clock text the field can display. */
export function isoToLocalInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const localMs = date.getTime() - date.getTimezoneOffset() * 60_000;
  return new Date(localMs).toISOString().slice(0, 16);
}

/** How a session time reads to a viewer, in their own timezone. */
export function formatSessionTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}
