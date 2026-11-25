import { getInstructor } from "@/features/exam/instructor";
import { findPublicCertificate } from "@/features/exam/public-certificate";
import { certificateShareImage } from "@/features/exam/share-image";

export const runtime = "nodejs";

/**
 * The certificate as a picture for sharing: square for an Instagram post, or
 * `?shape=wide` for a link preview. Public like the verification page, since
 * it shows nothing that page does not.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const certificate = await findPublicCertificate(id);
  if (!certificate)
    return new Response("Certificate not found", { status: 404 });
  const query = new URL(request.url).searchParams;
  return certificateShareImage(
    certificate,
    query.get("shape") === "wide" ? "wide" : "square",
    getInstructor(),
    { download: query.get("download") === "1" },
  );
}
