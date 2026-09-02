"use client";
import { useEffect } from "react";
import { CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error", error.digest ?? "unknown");
  }, [error]);

  return (
    <main className="grid min-h-svh place-items-center p-6 text-center">
      <div className="max-w-md">
        <span className="text-ember mx-auto grid size-12 place-items-center rounded-2xl border border-[var(--line)] bg-[var(--sunken)]">
          <CircleAlert size={22} />
        </span>
        <h1 className="font-display text-ink mt-6 text-2xl font-semibold">
          That step did not complete
        </h1>
        <p className="text-dim mt-3 text-sm leading-6">
          Nothing sensitive was exposed. Run the action again, and tell an
          administrator if it keeps failing.
        </p>
        <Button className="mt-7" onClick={reset}>
          Try again
        </Button>
      </div>
    </main>
  );
}
