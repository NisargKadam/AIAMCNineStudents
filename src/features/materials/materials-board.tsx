"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Download,
  FileText,
  FolderOpen,
  LoaderCircle,
  Presentation,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { deleteMaterialAction } from "./actions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Confirm } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { pluralize } from "@/lib/utils";
import { formatSessionTime } from "@/features/sessions/schedule";
import { formatBytes, materialAccept, materialType } from "@/lib/materials";

export type Material = {
  id: string;
  fileName: string;
  contentType: string;
  size: number;
  createdAt: string;
};

export type SessionWithMaterials = {
  id: string;
  sortOrder: number;
  title: string;
  scheduledAt: string | null;
  isActive: boolean;
  materials: Material[];
};

function MaterialIcon({ fileName }: { fileName: string }) {
  const { label } = materialType(fileName);
  const Icon = label === "Slides" ? Presentation : FileText;
  return <Icon size={16} />;
}

function UploadButton({
  sessionId,
  sessionTitle,
}: {
  sessionId: string;
  sessionTitle: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function upload(files: FileList) {
    setUploading(true);
    const data = new FormData();
    for (const file of Array.from(files)) data.append("files", file);
    try {
      const response = await fetch(`/api/sessions/${sessionId}/materials`, {
        method: "POST",
        body: data,
      });
      const result = (await response.json()) as {
        stored?: number;
        failed?: string[];
        error?: string;
      };
      if (!response.ok && result.error) throw new Error(result.error);
      if (result.stored)
        toast.success(
          `${result.stored} ${pluralize(result.stored, "file")} added to ${sessionTitle}.`,
        );
      for (const message of result.failed ?? []) toast.error(message);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "The upload failed.",
      );
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={materialAccept}
        className="hidden"
        onChange={(event) => {
          if (event.target.files?.length) void upload(event.target.files);
        }}
      />
      <Button
        variant="secondary"
        size="sm"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? (
          <LoaderCircle size={14} className="animate-spin" />
        ) : (
          <Upload size={14} />
        )}
        {uploading ? "Uploading" : "Upload files"}
      </Button>
    </>
  );
}

export function MaterialsBoard({
  sessions,
  canEdit,
}: {
  sessions: SessionWithMaterials[];
  canEdit: boolean;
}) {
  const [deleting, setDeleting] = useState<Material | null>(null);
  const [pending, start] = useTransition();

  const total = sessions.reduce((sum, s) => sum + s.materials.length, 0);
  const withFiles = sessions.filter((s) => s.materials.length).length;

  if (!sessions.length)
    return (
      <EmptyState
        icon={FolderOpen}
        title="No sessions yet"
        description={
          canEdit
            ? "Add sessions on the Sessions page first, then attach their slides here."
            : "Your instructor has not published the schedule yet."
        }
      />
    );

  return (
    <>
      <Card className="mb-5 p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-dim text-xs">Library</p>
            <p className="font-display text-ink mt-2 text-lg font-semibold">
              {total
                ? `${total} ${pluralize(total, "file")} across ${withFiles} ${pluralize(withFiles, "session")}`
                : "Nothing uploaded yet"}
            </p>
            <p className="text-dim mt-1 text-xs">
              {canEdit
                ? "Slides, PDFs, and Word documents up to 50 MB each. You can select several files at once."
                : "Files open in a new tab or download straight to your device."}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--line)] bg-[var(--sunken)] px-4 py-3 text-center">
            <p className="num font-display text-ink text-xl font-semibold">
              {withFiles}
              <span className="text-faint text-sm"> / {sessions.length}</span>
            </p>
            <p className="text-faint mt-0.5 text-[11px]">sessions with files</p>
          </div>
        </div>
      </Card>

      <div className="space-y-2.5">
        {sessions.map((session) => (
          <Card key={session.id} className="p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 items-start gap-3.5">
                <span className="text-faint num grid size-10 shrink-0 place-items-center rounded-xl border border-[var(--line)] bg-[var(--sunken)] font-mono text-xs">
                  {String(session.sortOrder).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-ink text-sm font-semibold">
                      {session.title}
                    </h2>
                    {!session.isActive && <Badge tone="neutral">Hidden</Badge>}
                    {session.materials.length > 0 && (
                      <Badge tone="verified">
                        {session.materials.length}{" "}
                        {pluralize(session.materials.length, "file")}
                      </Badge>
                    )}
                  </div>
                  {session.scheduledAt && (
                    <p className="text-faint mt-1.5 flex items-center gap-1.5 text-[11px]">
                      <CalendarDays size={11} />
                      {formatSessionTime(session.scheduledAt)}
                    </p>
                  )}
                </div>
              </div>
              {canEdit && (
                <UploadButton
                  sessionId={session.id}
                  sessionTitle={session.title}
                />
              )}
            </div>

            {session.materials.length ? (
              <ul className="mt-4 divide-y divide-[var(--line)] rounded-xl border border-[var(--line)]">
                {session.materials.map((file) => {
                  const type = materialType(file.fileName);
                  return (
                    <li
                      key={file.id}
                      className="flex flex-col gap-3 px-3.5 py-3 sm:flex-row sm:items-center"
                    >
                      <span className="text-dim grid size-9 shrink-0 place-items-center rounded-lg bg-[var(--sunken)]">
                        <MaterialIcon fileName={file.fileName} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-ink truncate text-sm font-medium">
                          {file.fileName}
                        </p>
                        <p className="text-faint mt-0.5 flex flex-wrap items-center gap-2 text-[11px]">
                          <Badge tone={type.tone}>{type.label}</Badge>
                          <span className="num">{formatBytes(file.size)}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button asChild size="sm">
                          <a href={`/api/files/${file.id}`} download>
                            <Download size={14} />
                            Download
                          </a>
                        </Button>
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Delete ${file.fileName}`}
                            className="hover:text-[var(--alert)]"
                            onClick={() => setDeleting(file)}
                          >
                            <Trash2 size={14} />
                          </Button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-faint mt-4 rounded-xl border border-dashed border-[var(--line)] px-3.5 py-3 text-xs">
                {canEdit
                  ? "No files yet. Upload the slides for this session."
                  : "Nothing posted for this session yet."}
              </p>
            )}
          </Card>
        ))}
      </div>

      <Confirm
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete ${deleting?.fileName ?? "this file"}?`}
        description="Students will no longer be able to download it. This cannot be undone."
        confirmLabel="Delete file"
        pending={pending}
        onConfirm={() => {
          const target = deleting;
          if (!target) return;
          setDeleting(null);
          start(async () => {
            const result = await deleteMaterialAction(target.id);
            if (result.error) toast.error(result.error);
            else toast.success(result.success ?? "File removed.");
          });
        }}
      />
    </>
  );
}
