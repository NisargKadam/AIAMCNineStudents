"use client";
import { useSyncExternalStore } from "react";

/**
 * The theme lives on the document element — an inline script sets it before
 * paint — so React reads it from there instead of keeping a second copy.
 */
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observer.disconnect();
}

export function useTheme(): "dark" | "light" {
  return useSyncExternalStore(
    subscribe,
    () =>
      document.documentElement.classList.contains("light") ? "light" : "dark",
    () => "dark" as const,
  );
}

export function toggleTheme() {
  const next = document.documentElement.classList.toggle("light")
    ? "light"
    : "dark";
  try {
    localStorage.setItem("aiamc-theme", next);
  } catch {
    // Storage can be unavailable; the toggle still applies for this visit.
  }
  return next;
}
