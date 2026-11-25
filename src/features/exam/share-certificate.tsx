"use client";
import { useEffect, useState } from "react";
import { ChevronDown, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  instagramCaption,
  linkedinComposeUrl,
  linkedinPost,
  type Instructor,
} from "./instructor";

const FILE_NAME = "AI-AMC-Certificate.png";

function LinkedInMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9.75h4V21H3V9.75Zm6.5 0h3.8v1.6h.06c.53-.95 1.84-1.95 3.78-1.95 4.04 0 4.86 2.5 4.86 5.9V21h-4v-5.1c0-1.3-.03-2.9-1.84-2.9-1.84 0-2.12 1.36-2.12 2.8V21h-4V9.75Z"
      />
    </svg>
  );
}

function InstagramMark() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.3" cy="6.7" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

/**
 * Sharing an earned certificate. Neither LinkedIn nor Instagram lets a site
 * post or tag for someone, so the credit to the instructor travels in what
 * the portal hands over: the written post, the caption, and the image.
 */
export function ShareCertificate({
  certificateId,
  url,
  instructor,
}: {
  certificateId: string;
  url: string;
  instructor: Instructor;
}) {
  const post = linkedinPost(url, instructor);
  const caption = instagramCaption(url, instructor);
  const imageUrl = `/api/exam/certificate/${encodeURIComponent(certificateId)}/image?shape=square`;
  // Fetched ahead of the tap: a phone only opens its share sheet when asked
  // directly from the tap, with the file already in hand.
  const [picture, setPicture] = useState<File | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!caption) return;
    let current = true;
    fetch(imageUrl)
      .then((response) => (response.ok ? response.blob() : null))
      .then((blob) => {
        if (current && blob)
          setPicture(new File([blob], FILE_NAME, { type: "image/png" }));
      })
      .catch(() => {
        // The button falls back to a plain download.
      });
    return () => {
      current = false;
    };
  }, [caption, imageUrl]);

  function copy(text: string, done: string) {
    navigator.clipboard?.writeText(text).then(
      () => toast.success(done),
      () => toast.message("Copy the text shown below into your post."),
    );
  }

  function shareToInstagram() {
    if (!caption) return;
    copy(caption, "Caption copied. Paste it into your Instagram post.");
    if (picture && navigator.canShare?.({ files: [picture] })) {
      navigator.share({ files: [picture], text: caption }).catch(() => {
        // Closing the share sheet is not an error.
      });
      return;
    }
    const link = document.createElement("a");
    link.href = `${imageUrl}&download=1`;
    link.download = FILE_NAME;
    link.click();
    setSaved(true);
  }

  return (
    <section
      aria-labelledby="share-heading"
      className="mt-6 rounded-2xl border border-[var(--line)] bg-[var(--sunken)] p-4 sm:p-5"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[color-mix(in_oklab,var(--caution)_14%,transparent)] text-[var(--caution)]">
          <Share2 size={16} />
        </span>
        <div className="min-w-0">
          <h3
            id="share-heading"
            className="font-display text-ink text-sm font-semibold"
          >
            Share your achievement
          </h3>
          <p className="text-dim mt-1 text-xs leading-5">
            Your post is written for you and credits your instructor,{" "}
            {instructor.name}. The certificate image carries the same credit.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild>
          <a
            href={linkedinComposeUrl(post)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() =>
              copy(post, "Post copied too, in case LinkedIn opens it empty.")
            }
          >
            <LinkedInMark />
            Share on LinkedIn
          </a>
        </Button>
        {caption && (
          <Button variant="secondary" onClick={shareToInstagram}>
            <InstagramMark />
            Share on Instagram
          </Button>
        )}
      </div>

      <ul className="text-dim mt-4 space-y-1.5 text-xs leading-5">
        <li>
          <span className="text-ink font-medium">LinkedIn:</span> to make the
          tag clickable, type @ before {instructor.name} in the post and pick
          the name from the list.
        </li>
        {caption && (
          <li>
            <span className="text-ink font-medium">Instagram:</span>{" "}
            {saved
              ? "the image is saved and the caption is copied. Create a post with the image and paste the caption."
              : `pick Instagram, then paste the caption. It tags @${instructor.instagramHandle.replace(/^@+/, "")} for you.`}
          </li>
        )}
      </ul>

      <details className="group mt-4 rounded-xl border border-[var(--line)] bg-[var(--panel)]">
        <summary className="text-dim hover:text-ink flex cursor-pointer list-none items-center justify-between gap-3 px-3.5 py-2.5 text-xs font-medium transition-colors [&::-webkit-details-marker]:hidden">
          See what will be posted
          <ChevronDown
            size={14}
            className="transition-transform group-open:rotate-180"
          />
        </summary>
        <div className="space-y-4 border-t border-[var(--line)] p-3.5">
          <div>
            <p className="text-faint text-[11px]">LinkedIn post</p>
            <p className="text-dim mt-1.5 text-xs leading-5 break-words whitespace-pre-line">
              {post}
            </p>
          </div>
          {caption && (
            <div>
              <p className="text-faint text-[11px]">Instagram caption</p>
              <p className="text-dim mt-1.5 text-xs leading-5 break-words whitespace-pre-line">
                {caption}
              </p>
            </div>
          )}
        </div>
      </details>
    </section>
  );
}
