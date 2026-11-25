import "server-only";
import { db } from "@/lib/db";

/**
 * A certificate as anyone holding its link may see it: only while the holder's
 * account is active and the attempt behind it really passed.
 */
export function findPublicCertificate(id: string) {
  return db.examCertificate.findFirst({
    where: {
      id,
      user: { isActive: true },
      attempt: { status: "SUBMITTED", passed: true, score: { gte: 90 } },
    },
    select: { id: true, name: true, issuedAt: true },
  });
}
