"use client";
import { useRef, useState } from "react";
import { ImagePlus, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { prepareAvatar } from "./avatar-image";

/**
 * Picks, crops, and uploads a profile photo. A photo can be dropped on it or
 * chosen from the device; the previous photo stays if anything goes wrong.
 */
export function PhotoPicker({
  name,
  value,
  onChange,
  allowRemove = false,
  invalid = false,
  className,
}: {
  /** Used for the initials shown until there is a photo. */
  name: string;
  value: string;
  onChange: (url: string) => void;
  allowRemove?: boolean;
  /** Marks the control when a save was attempted without a photo. */
  invalid?: boolean;
  className?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  async function accept(file: File | undefined) {
    if (!file || uploading) return;
    setUploading(true);
    setProblem(null);
    try {
      const data = new FormData();
      data.set("file", await prepareAvatar(file));
      const response = await fetch("/api/uploads", {
        method: "POST",
        body: data,
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.url)
        throw new Error(result.error ?? "The upload did not go through.");
      onChange(result.url);
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "That photo could not be used.";
      setProblem(message);
      toast.error(message);
    } finally {
      setUploading(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        void accept(event.dataTransfer.files?.[0]);
      }}
      className={cn(
        "flex flex-wrap items-center gap-5 rounded-2xl border border-dashed p-4 transition-colors duration-200 sm:p-5",
        dragging
          ? "border-ember bg-[var(--ember-soft)]"
          : invalid && !value
            ? "border-[var(--alert)] bg-[color-mix(in_oklab,var(--alert)_7%,transparent)]"
            : "border-[var(--line-strong)] bg-[var(--sunken)]",
        className,
      )}
    >
      <div className="relative shrink-0">
        <Avatar name={name || "You"} url={value} size="xl" />
        {uploading && (
          <span className="absolute inset-0 grid place-items-center rounded-full bg-[rgba(7,9,16,.6)] text-white">
            <LoaderCircle size={22} className="animate-spin" />
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-ink text-sm font-semibold">
          {value ? "Looking good" : "Add your photo"}
        </p>
        <p className="text-dim mt-1 text-xs leading-5">
          {value
            ? "Drop another photo here any time to replace it."
            : "Drop a photo here or choose one. A clear picture of your face works best; we crop and resize it for you."}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            ref={input}
            type="file"
            accept="image/*"
            className="sr-only"
            tabIndex={-1}
            aria-label="Profile photo"
            onChange={(event) => void accept(event.target.files?.[0])}
          />
          <Button
            type="button"
            variant={value ? "secondary" : "default"}
            size="sm"
            disabled={uploading}
            onClick={() => input.current?.click()}
          >
            {uploading ? (
              <LoaderCircle size={14} className="animate-spin" />
            ) : (
              <ImagePlus size={14} />
            )}
            {uploading
              ? "Uploading"
              : value
                ? "Replace photo"
                : "Choose a photo"}
          </Button>
          {allowRemove && value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={uploading}
              onClick={() => onChange("")}
            >
              Remove
            </Button>
          )}
        </div>
        <p
          role="status"
          className={cn(
            "mt-2 text-[11px] leading-4 text-[var(--alert)]",
            !problem && !(invalid && !value) && "hidden",
          )}
        >
          {problem ?? "Add a photo to continue."}
        </p>
      </div>
    </div>
  );
}
