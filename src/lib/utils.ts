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
