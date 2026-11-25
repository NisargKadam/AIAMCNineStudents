import { z } from "zod";

const email = z.email().max(254);

/**
 * Reads a pasted list of emails in whatever shape it arrives: commas, spaces,
 * semicolons, new lines, or "Name <email>" pairs. Capitals and duplicates are
 * folded so one person is one entry, in the order first seen.
 */
export function parseEmails(text: string) {
  const emails = new Set<string>();
  const invalid = new Set<string>();
  for (const piece of text.split(/[\s,;<>]+/)) {
    const candidate = piece.trim().toLowerCase();
    if (!candidate) continue;
    if (email.safeParse(candidate).success) emails.add(candidate);
    else invalid.add(candidate);
  }
  return { emails: [...emails], invalid: [...invalid] };
}
