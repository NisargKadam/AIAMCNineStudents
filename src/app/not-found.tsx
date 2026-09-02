import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center p-6 text-center">
      <div>
        <Compass className="text-accent mx-auto" size={44} />
        <p className="text-accent mt-5 text-xs font-bold tracking-[.2em] uppercase">
          404 · Off course
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-white">
          That page doesn’t exist.
        </h1>
        <p className="text-muted mt-3 text-sm">
          Let’s get you back to the cohort workspace.
        </p>
        <Button asChild className="mt-7">
          <Link href="/dashboard">Go to dashboard</Link>
        </Button>
      </div>
    </main>
  );
}
