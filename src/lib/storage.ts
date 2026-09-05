import "server-only";
import { v2 as cloudinary } from "cloudinary";
import { db } from "@/lib/db";
import { materialContentType, maxMaterialBytes } from "@/lib/materials";

const maxImageBytes = 5 * 1024 * 1024;
const acceptedImages = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

/** Path the browser uses to fetch a file kept in the database. */
export function storedFileUrl(id: string) {
  return `/api/files/${id}`;
}

function cloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET,
  );
}

/**
 * Avatars and community attachments. Cloudinary is used when configured;
 * otherwise the image is kept in PostgreSQL, which is what the Railway
 * deployment relies on since its filesystem does not survive a redeploy.
 */
export async function uploadCommunityImage(file: File, uploadedById?: string) {
  if (!acceptedImages.has(file.type))
    throw new Error("Use a JPEG, PNG, WebP, or GIF image.");
  if (file.size > maxImageBytes)
    throw new Error("Images must be smaller than 5 MB.");
  const bytes = Buffer.from(await file.arrayBuffer());
  if (cloudinaryConfigured()) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
    return new Promise<string>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "ai-amc-nine/community", resource_type: "image" },
        (error, result) =>
          error || !result
            ? reject(error ?? new Error("Upload failed"))
            : resolve(result.secure_url),
      );
      stream.end(bytes);
    });
  }
  const stored = await db.storedFile.create({
    data: {
      kind: "IMAGE",
      fileName: file.name || "image",
      contentType: file.type,
      size: bytes.byteLength,
      bytes,
      uploadedById,
    },
    select: { id: true },
  });
  return storedFileUrl(stored.id);
}

export async function storeSessionMaterial(
  sessionId: string,
  file: File,
  uploadedById: string,
) {
  const contentType = materialContentType(file);
  if (!contentType)
    throw new Error(
      `${file.name || "That file"} is not a slide deck, PDF, or Word document.`,
    );
  if (file.size > maxMaterialBytes)
    throw new Error(`${file.name} is larger than 50 MB.`);
  if (file.size === 0) throw new Error(`${file.name} is empty.`);
  const bytes = Buffer.from(await file.arrayBuffer());
  return db.storedFile.create({
    data: {
      kind: "SESSION_MATERIAL",
      fileName: file.name.slice(0, 200),
      contentType,
      size: bytes.byteLength,
      bytes,
      uploadedById,
      sessionId,
    },
    select: { id: true, fileName: true, size: true, createdAt: true },
  });
}
