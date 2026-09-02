import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="grid min-h-svh place-items-center p-6 text-center">
      <div className="max-w-md">
        <span className="text-ember mx-auto grid size-12 place-items-center rounded-2xl border border-[var(--line)] bg-[var(--sunken)]">
          <Compass size={22} />
        </span>
        <h1 className="font-display text-ink mt-6 text-2xl font-semibold">
          There is no page here
        </h1>
        <p className="text-dim mt-3 text-sm leading-6">
          The link may be out of date. Your dashboard has everything current.
        </p>
        <Button asChild className="mt-7">
          <Link href="/dashboard">Go to dashboard</Link>
        </Button>
      </div>
    </main>
  );
}
