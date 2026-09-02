"use client";
import { Toaster as Sonner } from "sonner";
import { useTheme } from "@/components/use-theme";

export function Toaster() {
  const theme = useTheme();
  return (
    <Sonner
      theme={theme}
      position="top-center"
      closeButton
      toastOptions={{
        style: {
          background: "var(--raised)",
          border: "1px solid var(--line-strong)",
          color: "var(--ink)",
          borderRadius: "14px",
          boxShadow: "var(--shadow-lift)",
        },
      }}
    />
  );
}
