import Link from "next/link";
import { ScrollText } from "lucide-react";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/avatar";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = { title: "Audit log" };

const PAGE_SIZE = 50;

/** Destructive and access-changing actions are called out in the list. */
const notable = new Set([
  "student_deleted",
  "student_disabled",
  "role_changed",
  "password_reset",
  "password_set_by_admin",
  "post_moderated",
  "comment_moderated",
]);

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const [entries, total] = await Promise.all([
    db.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { actor: { include: { profile: true } } },
    }),
    db.auditLog.count(),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeader
        eyebrow="Admin console"
        title="Audit log"
        description="A permanent record of every administrative action. Entries are never edited or removed."
      />

      {entries.length ? (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-[var(--line)]">
            {entries.map((entry) => {
              const actorName =
                entry.actor?.profile?.fullName ??
                entry.actor?.email ??
                "A removed account";
              const metadata =
                entry.metadata && typeof entry.metadata === "object"
                  ? Object.entries(entry.metadata as Record<string, unknown>)
                  : [];
              return (
                <li
                  key={entry.id}
                  className="flex flex-wrap items-start gap-4 px-5 py-4"
                >
                  <Avatar
                    name={actorName}
                    url={entry.actor?.profile?.avatarUrl}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-ink text-xs font-semibold">
                        {entry.action.replaceAll("_", " ")}
                      </p>
                      {notable.has(entry.action) && (
                        <Badge tone="caution">Sensitive</Badge>
                      )}
                    </div>
                    <p className="text-faint mt-1 text-[11px]">
                      {actorName} · {entry.entityType}
                      {entry.entityId ? ` ${entry.entityId.slice(0, 8)}` : ""}
                    </p>
                    {metadata.length > 0 && (
                      <p className="text-dim mt-1.5 font-mono text-[11px] break-all">
                        {metadata
                          .map(([key, value]) => `${key}=${String(value)}`)
                          .join("  ")}
                      </p>
                    )}
                  </div>
                  <span className="text-faint shrink-0 text-[11px]">
                    {entry.createdAt.toLocaleString()}
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
      ) : (
        <EmptyState
          icon={ScrollText}
          title="Nothing recorded yet"
          description="Administrative actions such as creating a student, resetting a password, or moderating a post will appear here."
        />
      )}

      {pages > 1 && (
        <nav className="mt-4 flex items-center justify-between">
          <Button asChild variant="secondary" disabled={page <= 1}>
            <Link href={`/admin/audit?page=${Math.max(1, page - 1)}`}>
              Previous
            </Link>
          </Button>
          <p className="text-faint num text-xs">
            Page {page} of {pages}
          </p>
          <Button asChild variant="secondary" disabled={page >= pages}>
            <Link href={`/admin/audit?page=${Math.min(pages, page + 1)}`}>
              Next
            </Link>
          </Button>
        </nav>
      )}
    </>
  );
}
