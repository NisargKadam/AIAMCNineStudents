const SIDE = 512;

/**
 * Turns whatever photo someone picks into a small square JPEG before it is
 * uploaded: a 9 MB phone photo becomes about 60 KB, which keeps uploads
 * instant and the database small. Portrait photos are cropped from a little
 * above the middle, where a face usually is.
 */
export async function prepareAvatar(file: File): Promise<File> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error(
      "That file could not be read as a photo. Try a JPEG or PNG instead.",
    );
  }
  try {
    const side = Math.min(bitmap.width, bitmap.height);
    const portrait = bitmap.height > bitmap.width;
    const canvas = document.createElement("canvas");
    canvas.width = SIDE;
    canvas.height = SIDE;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("no canvas");
    // A transparent PNG would otherwise turn black as a JPEG.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, SIDE, SIDE);
    context.imageSmoothingQuality = "high";
    context.drawImage(
      bitmap,
      (bitmap.width - side) / 2,
      (bitmap.height - side) * (portrait ? 0.3 : 0.5),
      side,
      side,
      0,
      0,
      SIDE,
      SIDE,
    );
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.88),
    );
    if (!blob) throw new Error("no blob");
    return new File([blob], "profile-photo.jpg", { type: "image/jpeg" });
  } catch {
    throw new Error("That photo could not be prepared. Try a different one.");
  } finally {
    bitmap.close();
  }
}
