import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { StudentDirectory } from "@/features/students/directory";

export const metadata = { title: "Students" };

export default async function StudentsPage() {
  const students = await db.user.findMany({
    where: { isActive: true, role: "STUDENT", profile: { isNot: null } },
    orderBy: { profile: { fullName: "asc" } },
    select: {
      id: true,
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
        description="Everyone learning and shipping alongside you. Only what people choose to share appears here."
      />
      <StudentDirectory
        students={students.flatMap((student) =>
          student.profile ? [{ id: student.id, ...student.profile }] : [],
        )}
      />
    </>
  );
}
