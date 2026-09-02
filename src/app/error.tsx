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
    <main className="grid min-h-screen place-items-center p-6 text-center">
      <div>
        <CircleAlert className="text-accent mx-auto" size={44} />
        <h1 className="mt-5 text-3xl font-semibold text-white">
          Something interrupted the flow.
        </h1>
        <p className="text-muted mt-3 text-sm">
          No sensitive details were exposed. Try the operation again.
        </p>
        <Button className="mt-7" onClick={reset}>
          Try again
        </Button>
      </div>
    </main>
  );
}
