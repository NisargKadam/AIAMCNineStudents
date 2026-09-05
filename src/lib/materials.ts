/**
 * What counts as a session material, shared by the upload route (server) and
 * the materials board (browser). Kept free of server-only imports so both
 * sides and the tests can use it.
 */
export const maxMaterialBytes = 50 * 1024 * 1024;

export const acceptedMaterials: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    "pptx",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
  "application/msword": "doc",
  "application/vnd.apple.keynote": "key",
};

/** Value for a file input's `accept` attribute. */
export const materialAccept = [
  ...Object.values(acceptedMaterials).map((ext) => `.${ext}`),
  ...Object.keys(acceptedMaterials),
].join(",");

function extensionOf(fileName: string) {
  const dot = fileName.lastIndexOf(".");
  return dot === -1 ? "" : fileName.slice(dot + 1).toLowerCase();
}

/**
 * The MIME type to store, or null when the file is not a slide deck, PDF, or
 * document. Browsers sometimes send a blank or generic type, so the name's
 * extension is trusted as a fallback.
 */
export function materialContentType(file: { name: string; type: string }) {
  if (acceptedMaterials[file.type]) return file.type;
  const extension = extensionOf(file.name);
  const match = Object.entries(acceptedMaterials).find(
    ([, ext]) => ext === extension,
  );
  return match?.[0] ?? null;
}

/** Slides, PDF, or document, from the extension the instructor uploaded. */
export function materialType(fileName: string) {
  const extension = extensionOf(fileName);
  if (extension === "pdf") return { label: "PDF", tone: "alert" as const };
  if (["ppt", "pptx", "key"].includes(extension))
    return { label: "Slides", tone: "ember" as const };
  if (["doc", "docx"].includes(extension))
    return { label: "Document", tone: "halo" as const };
  return { label: extension.toUpperCase() || "File", tone: "neutral" as const };
}

export function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
