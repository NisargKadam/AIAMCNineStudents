import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { createCertificatePDF } from "@/features/exam/certificate";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  const certificate = await db.examCertificate.findFirst({
    where: {
      id,
      ...(user.role === "ADMIN" ? {} : { userId: user.id }),
      user: { isActive: true },
      attempt: { passed: true, score: { gte: 90 }, status: "SUBMITTED" },
    },
    include: { attempt: { select: { score: true } } },
  });
  if (!certificate)
    return new Response("Certificate not found", { status: 404 });
  const bytes = await createCertificatePDF(
    certificate,
    certificate.attempt.score!,
  );
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="AI-AMC-Certification.pdf"',
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
