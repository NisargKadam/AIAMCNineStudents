import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
export function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "AI"
  );
}
export function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || "there";
}
export function percentage(value: number, total: number) {
  return total ? Math.round((value / total) * 100) : 0;
}
export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export type SubmissionStatusName =
  "SUBMITTED" | "REVIEWED" | "NEEDS_CHANGES" | "COMPLETED";

/** One vocabulary for submission state, shared by student and admin screens. */
export const submissionStatus: Record<
  SubmissionStatusName,
  { label: string; tone: "ember" | "verified" | "caution" | "halo" }
> = {
  SUBMITTED: { label: "In review", tone: "ember" },
  REVIEWED: { label: "Reviewed", tone: "halo" },
  NEEDS_CHANGES: { label: "Changes requested", tone: "caution" },
  COMPLETED: { label: "Approved", tone: "verified" },
};

export function pluralize(count: number, one: string, many?: string) {
  return count === 1 ? one : (many ?? `${one}s`);
}
