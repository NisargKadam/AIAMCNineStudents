import "server-only";
import { v2 as cloudinary } from "cloudinary";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const maxBytes = 5 * 1024 * 1024;
const accepted = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export async function uploadCommunityImage(file: File) {
  if (!accepted.has(file.type))
    throw new Error("Use a JPEG, PNG, WebP, or GIF image.");
  if (file.size > maxBytes)
    throw new Error("Images must be smaller than 5 MB.");
  const bytes = Buffer.from(await file.arrayBuffer());
  if (
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  ) {
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
  if (process.env.NODE_ENV === "production")
    throw new Error(
      "Cloudinary must be configured for production image uploads.",
    );
  const extension = file.type.split("/")[1].replace("jpeg", "jpg");
  const fileName = `${randomUUID()}.${extension}`;
  const directory = path.join(process.cwd(), "public", "uploads");
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, fileName), bytes);
  return `/uploads/${fileName}`;
}
