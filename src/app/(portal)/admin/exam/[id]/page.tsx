import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { bankForVersion } from "@/features/exam/bank";
import { AdminQuestion } from "@/features/exam/admin-question";
import { mutateExam } from "@/features/exam/service";
import type { Answers, ExamLayout } from "@/features/exam/types";

export const metadata = { title: "Exam attempt review" };
export default async function AttemptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  let attempt = await db.examAttempt.findUnique({
    where: { id },
    include: {
      user: {
        select: { email: true, profile: { select: { fullName: true } } },
      },
      certificate: true,
    },
  });
  if (!attempt) notFound();
  if (attempt.status === "IN_PROGRESS" && attempt.deadline <= new Date()) {
    await mutateExam(attempt.userId, id, {}, true);
    attempt = await db.examAttempt.findUniqueOrThrow({
      where: { id },
      include: {
        user: {
          select: { email: true, profile: { select: { fullName: true } } },
        },
        certificate: true,
      },
    });
  }
  const layout = attempt.layout as ExamLayout;
  const bank = bankForVersion(attempt.version);
  return (
    <>
      <PageHeader
        eyebrow="Private attempt review"
        title={`${attempt.user.profile?.fullName ?? attempt.user.email} · Attempt ${attempt.number}`}
        description={`${attempt.user.email} · ${attempt.status === "IN_PROGRESS" ? "In progress" : attempt.passed ? "PASS" : "FAIL"} · ${attempt.score === null ? "Awaiting submission" : `${attempt.score}%`}`}
        action={
          <Link href="/admin/exam" className="text-ember text-sm">
            Back to exam console
          </Link>
        }
      />
      <Card className="mb-6 p-5 text-sm">
        <p>Started: {attempt.startedAt.toISOString()}</p>
        <p className="mt-2">Deadline: {attempt.deadline.toISOString()}</p>
        <p className="mt-2">
          Submitted: {attempt.submittedAt?.toISOString() ?? "Not submitted"}
        </p>
        {attempt.certificate && (
          <p className="mt-3">
            <Link
              className="text-ember underline"
              href={`/certificates/${attempt.certificate.id}`}
              target="_blank"
            >
              Verify certificate: {attempt.certificate.name}
            </Link>
          </p>
        )}
      </Card>
      <div className="space-y-3">
        {layout.ids.map((questionId, i) => (
          <AdminQuestion
            key={questionId}
            question={bank.find((q) => q.id === questionId)!}
            number={i + 1}
            answer={(attempt.answers as Answers)[questionId] ?? ""}
          />
        ))}
      </div>
    </>
  );
}
