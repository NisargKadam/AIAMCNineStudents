import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { uploadCommunityImage } from "@/lib/storage";

export async function POST(request: Request) {
  await requireUser();
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File))
      return NextResponse.json({ error: "Select an image." }, { status: 400 });
    const url = await uploadCommunityImage(file);
    return NextResponse.json({ url });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed." },
      { status: 400 },
    );
  }
}
