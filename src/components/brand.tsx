import Link from "next/link";
export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/dashboard" className="flex items-center gap-3">
      <span className="bg-accent grid size-10 place-items-center rounded-xl font-mono text-sm font-black text-white shadow-[0_10px_30px_rgba(214,64,26,.3)]">
        A9
      </span>
      {!compact && (
        <span>
          <span className="block text-sm font-bold tracking-tight text-white">
            AI AMC Nine
          </span>
          <span className="text-muted block text-[10px] tracking-[.2em] uppercase">
            Student Portal
          </span>
        </span>
      )}
    </Link>
  );
}
