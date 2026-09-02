"use client";
import { useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  Code2,
  ExternalLink,
  MapPin,
  Search,
  UsersRound,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { Tilt } from "@/components/motion/tilt";

export type DirectoryEntry = {
  id: string;
  fullName: string;
  githubUsername: string | null;
  linkedinUrl: string | null;
  currentRole: string | null;
  country: string | null;
  bio: string | null;
  avatarUrl: string | null;
};

export function StudentDirectory({ students }: { students: DirectoryEntry[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter((student) =>
      [
        student.fullName,
        student.currentRole,
        student.country,
        student.githubUsername,
        student.bio,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [students, query]);

  return (
    <>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            size={15}
            className="text-faint absolute top-1/2 left-3.5 -translate-y-1/2"
          />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="pl-10"
            placeholder="Search by name, role, country, or GitHub"
            aria-label="Search the directory"
          />
        </div>
        <p className="text-faint num shrink-0 text-xs">
          {filtered.length} of {students.length} shown
        </p>
      </div>

      {filtered.length ? (
        <div className="stage grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((student) => (
            <Tilt key={student.id} className="group" strength={5} lift={12}>
              <Card className="flex h-full flex-col p-5">
                <div className="flex items-start gap-4">
                  <Avatar
                    name={student.fullName}
                    url={student.avatarUrl}
                    size="lg"
                  />
                  <div className="min-w-0 flex-1">
                    <h2 className="font-display text-ink truncate text-[15px] font-semibold">
                      {student.fullName}
                    </h2>
                    <p className="text-dim mt-1 truncate text-xs">
                      {student.currentRole ?? "Cohort member"}
                    </p>
                    {student.country && (
                      <p className="text-faint mt-2 flex items-center gap-1.5 text-[11px]">
                        <MapPin size={11} />
                        {student.country}
                      </p>
                    )}
                  </div>
                </div>

                {student.bio && (
                  <p className="text-dim mt-4 line-clamp-3 flex-1 text-xs leading-5">
                    {student.bio}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  {student.githubUsername && (
                    <a
                      href={`https://github.com/${student.githubUsername}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-dim hover:text-ink inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--sunken)] px-2.5 py-1.5 text-[11px] transition-colors hover:border-[var(--line-strong)]"
                    >
                      <Code2 size={12} />
                      {student.githubUsername}
                    </a>
                  )}
                  {student.linkedinUrl && (
                    <a
                      href={student.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-dim hover:text-ink inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--sunken)] px-2.5 py-1.5 text-[11px] transition-colors hover:border-[var(--line-strong)]"
                    >
                      <BriefcaseBusiness size={12} />
                      LinkedIn
                      <ExternalLink size={9} />
                    </a>
                  )}
                </div>
              </Card>
            </Tilt>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={UsersRound}
          title="Nobody matches that search"
          description="Try a different name, role, or country — or clear the search to see the whole cohort."
        />
      )}
    </>
  );
}
