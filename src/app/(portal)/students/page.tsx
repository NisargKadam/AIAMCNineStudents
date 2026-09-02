import { BriefcaseBusiness, Code2, ExternalLink, MapPin } from "lucide-react";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/avatar";
export const metadata = { title: "Students" };
export default async function StudentsPage() {
  const students = await db.user.findMany({
    where: { isActive: true, role: "STUDENT" },
    orderBy: { profile: { fullName: "asc" } },
    select: {
      profile: {
        select: {
          fullName: true,
          githubUsername: true,
          linkedinUrl: true,
          currentRole: true,
          country: true,
          bio: true,
          avatarUrl: true,
        },
      },
    },
  });
  return (
    <>
      <PageHeader
        eyebrow="Cohort directory"
        title="Meet the builders"
        description="Discover the people learning and shipping alongside you. Private account data never appears here."
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {students.map((student, index) => {
          const p = student.profile;
          if (!p) return null;
          return (
            <Card key={`${p.fullName}-${index}`} className="p-5">
              <div className="flex items-start gap-4">
                <Avatar name={p.fullName} url={p.avatarUrl} size="lg" />
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-semibold text-white">
                    {p.fullName}
                  </h2>
                  <p className="text-muted mt-1 text-xs">
                    {p.currentRole ?? "AI AMC Nine Student"}
                  </p>
                  {p.country && (
                    <p className="text-muted mt-2 flex items-center gap-1 text-[11px]">
                      <MapPin size={12} />
                      {p.country}
                    </p>
                  )}
                </div>
              </div>
              {p.bio && (
                <p className="text-muted mt-5 line-clamp-3 text-xs leading-5">
                  {p.bio}
                </p>
              )}
              <div className="mt-5 flex gap-2">
                {p.githubUsername && (
                  <a
                    href={`https://github.com/${p.githubUsername}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-white/[.05] px-2.5 py-2 text-[11px] text-white hover:bg-white/[.1]"
                  >
                    <Code2 size={14} />
                    {p.githubUsername}
                  </a>
                )}
                {p.linkedinUrl && (
                  <a
                    href={p.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500/10 px-2.5 py-2 text-[11px] text-sky-300 hover:bg-sky-500/20"
                  >
                    <BriefcaseBusiness size={14} />
                    LinkedIn
                    <ExternalLink size={10} />
                  </a>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}
