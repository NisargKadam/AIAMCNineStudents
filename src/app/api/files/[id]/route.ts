import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { canAccessAdmin } from "@/lib/authorization";

/**
 * Serves a file kept in the database. Everything requires a signed-in user;
 * session materials additionally stay hidden until the session is published,
 * and only students in that session's batch can download them.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const { id } = await params;
  const file = await db.storedFile.findUnique({
    where: { id },
    include: { session: { select: { isActive: true, batchId: true } } },
  });
  if (!file) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (
    file.kind === "SESSION_MATERIAL" &&
    !canAccessAdmin(user.role) &&
    (!file.session?.isActive || file.session.batchId !== user.batchId)
  )
    return NextResponse.json({ error: "Not found." }, { status: 404 });

  const download =
    file.kind !== "IMAGE" ||
    new URL(request.url).searchParams.get("download") === "1";
  const safeName = file.fileName.replace(/["\r\n\\]/g, "_");
  const encodedName = encodeURIComponent(file.fileName);

  return new Response(new Uint8Array(file.bytes), {
    headers: {
      "Content-Type": file.contentType,
      "Content-Length": String(file.size),
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${safeName}"; filename*=UTF-8''${encodedName}`,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
