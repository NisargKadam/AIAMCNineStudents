import { headers } from "next/headers";

/**
 * The address a request really came from, for rate limiting. The host's edge
 * reports it in `X-Real-IP` and replaces whatever a caller sends there. The
 * first entry of `X-Forwarded-For` is whatever the caller chose to write, so
 * when there is no `X-Real-IP` only the last entry, added by the nearest
 * proxy, is used.
 */
export async function clientAddress() {
  const incoming = await headers();
  const real = incoming.get("x-real-ip")?.trim();
  if (real) return real;
  const forwarded = incoming.get("x-forwarded-for")?.split(",") ?? [];
  return forwarded.at(-1)?.trim() || "local";
}
