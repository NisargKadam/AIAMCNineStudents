import { getInstructor } from "@/features/exam/instructor";
import { findPublicCertificate } from "@/features/exam/public-certificate";
import { certificateShareImage } from "@/features/exam/share-image";

export const alt = "AI AMC certificate of completion";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** The preview a certificate link shows wherever it is pasted. */
export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const certificate = await findPublicCertificate(id);
  if (!certificate)
    return new Response("Certificate not found", { status: 404 });
  return certificateShareImage(certificate, "wide", getInstructor());
}
