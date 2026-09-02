import Link from "next/link";
import { ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
export default function UnauthorizedPage() {
  return (
    <main className="grid min-h-screen place-items-center p-6 text-center">
      <div>
        <ShieldX className="text-accent mx-auto" size={44} />
        <p className="text-accent mt-5 text-xs font-bold tracking-[.2em] uppercase">
          403 · Access denied
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-white">
          This area is for administrators.
        </h1>
        <p className="text-muted mx-auto mt-3 max-w-md text-sm">
          Your account is working, but it does not have permission to access the
          Admin Console.
        </p>
        <Button asChild className="mt-7">
          <Link href="/dashboard">Return to dashboard</Link>
        </Button>
      </div>
    </main>
  );
}
