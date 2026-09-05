import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { canAccessAdmin } from "@/lib/authorization";
import { storeSessionMaterial } from "@/lib/storage";
import { audit } from "@/lib/audit";

/**
 * Attaches one or more slide decks, PDFs, or documents to a session. This is
 * a route handler rather than a server action so uploads are not capped by
 * the server action body limit.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user || !canAccessAdmin(user.role))
    return NextResponse.json(
      { error: "Administrators only." },
      { status: 403 },
    );

  const { id } = await params;
  const session = await db.cohortSession.findUnique({ where: { id } });
  if (!session)
    return NextResponse.json(
      { error: "That session no longer exists." },
      { status: 404 },
    );

  let files: File[];
  try {
    const formData = await request.formData();
    files = formData
      .getAll("files")
      .filter((f): f is File => f instanceof File);
  } catch {
    return NextResponse.json(
      { error: "The upload could not be read." },
      { status: 400 },
    );
  }
  if (!files.length)
    return NextResponse.json(
      { error: "Choose at least one file." },
      { status: 400 },
    );

  const stored: { id: string; fileName: string }[] = [];
  const failed: string[] = [];
  for (const file of files) {
    try {
      const material = await storeSessionMaterial(id, file, user.id);
      stored.push(material);
      await audit(user.id, "material_uploaded", "StoredFile", material.id, {
        sessionId: id,
        fileName: material.fileName,
        size: material.size,
      });
    } catch (error) {
      failed.push(error instanceof Error ? error.message : file.name);
    }
  }

  if (stored.length) {
    revalidatePath("/materials");
    revalidatePath("/sessions");
  }
  return NextResponse.json(
    { stored: stored.length, failed },
    { status: stored.length ? 200 : 400 },
  );
}
