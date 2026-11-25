/**
 * Fills an empty timezone field with the one the browser reports, so nobody
 * has to look theirs up. It writes to the input rather than to state because
 * the value only exists in the browser, after the page has rendered.
 */
export function fillTimezone(input: HTMLInputElement | null) {
  if (!input || input.value) return;
  try {
    input.value = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
  } catch {
    // Left empty; the field stays optional.
  }
}
