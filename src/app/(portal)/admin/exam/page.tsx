import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { bankForVersion } from "@/features/exam/bank";
import { EXAM_VERSION } from "@/features/exam/types";
import { AdminQuestion } from "@/features/exam/admin-question";
import { finalizeExpiredExams } from "@/features/exam/service";

export const metadata = { title: "Exam console" };
export default async function AdminExamPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; batch?: string }>;
}) {
  await requireAdmin();
  const questions = bankForVersion(EXAM_VERSION);
  await finalizeExpiredExams();
  const params = await searchParams;
  const page = Math.max(1, Math.min(100000, Number(params.page) || 1));
  const where = params.batch ? { user: { batchId: params.batch } } : {};
  const [attempts, total, passed, active, certificates, batches] =
    await Promise.all([
      db.examAttempt.findMany({
        where,
        include: {
          user: {
            select: {
              email: true,
              profile: { select: { fullName: true } },
              batch: { select: { number: true } },
            },
          },
          certificate: { select: { id: true } },
        },
        orderBy: { startedAt: "desc" },
        take: 25,
        skip: (Math.floor(page) - 1) * 25,
      }),
      db.examAttempt.count({ where }),
      db.examAttempt.count({ where: { ...where, passed: true } }),
      db.examAttempt.count({ where: { ...where, status: "IN_PROGRESS" } }),
      db.examCertificate.count({ where }),
      db.batch.findMany({
        orderBy: { number: "asc" },
        select: { id: true, number: true },
      }),
    ]);
  return (
    <>
      <PageHeader
        eyebrow="Private instructor workspace"
        title="Exam console"
        description="Student attempts, certification progress, and the complete answer key. Students receive questions and aggregate scores only."
      />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Attempts", total],
          ["In progress", active],
          ["Passed", passed],
          ["Certificates issued", certificates],
        ].map(([label, value]) => (
          <Card className="p-5" key={label}>
            <p className="text-dim text-xs">{label}</p>
            <p className="mt-3 text-3xl font-semibold">{value}</p>
          </Card>
        ))}
      </div>
      <Card className="mb-7 p-5">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">Student results</h2>
          <form className="flex gap-2">
            <label htmlFor="batch-filter" className="sr-only">
              Batch
            </label>
            <select
              id="batch-filter"
              name="batch"
              defaultValue={params.batch ?? ""}
              className="bg-sunken rounded-lg border border-[var(--line)] px-3 text-xs"
            >
              <option value="">All batches</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  Batch {b.number}
                </option>
              ))}
            </select>
            <Button type="submit" size="sm" variant="secondary">
              Filter
            </Button>
          </form>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-dim border-b border-[var(--line)] text-xs">
              <tr>
                {[
                  "Student",
                  "Batch",
                  "Attempt",
                  "Status",
                  "Score",
                  "Started (UTC)",
                  "Details",
                ].map((t) => (
                  <th className="px-3 py-3" key={t}>
                    {t}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {attempts.map((a) => (
                <tr
                  key={a.id}
                  className="border-b border-[var(--line)] last:border-0"
                >
                  <td className="px-3 py-4">
                    <p className="font-medium">
                      {a.user.profile?.fullName ?? "Student"}
                    </p>
                    <p className="text-dim mt-1 text-xs">{a.user.email}</p>
                  </td>
                  <td className="px-3 py-4">{a.user.batch?.number ?? "—"}</td>
                  <td className="px-3 py-4">{a.number}</td>
                  <td
                    className={`px-3 py-4 text-xs font-semibold ${a.passed ? "text-[var(--verified)]" : "text-[var(--caution)]"}`}
                  >
                    {a.status === "IN_PROGRESS"
                      ? "In progress"
                      : a.passed
                        ? "PASS"
                        : "FAIL"}
                  </td>
                  <td className="px-3 py-4 font-mono">
                    {a.score === null ? "—" : `${a.score}%`}
                  </td>
                  <td className="text-dim px-3 py-4 text-xs whitespace-nowrap">
                    {a.startedAt.toLocaleString("en-GB", { timeZone: "UTC" })}
                  </td>
                  <td className="px-3 py-4">
                    <Link
                      className="text-ember text-xs underline underline-offset-4"
                      href={`/admin/exam/${a.id}`}
                    >
                      Review
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!attempts.length && (
            <p className="text-dim p-8 text-center text-sm">
              No exam attempts yet. Every enrolled student can begin from Exam.
            </p>
          )}
        </div>
        <div className="mt-4 flex items-center justify-between text-xs">
          <span className="text-dim">
            {total} attempts · Page {Math.floor(page)}
          </span>
          <div className="flex gap-3">
            {page > 1 && (
              <Link
                href={`/admin/exam?page=${Math.floor(page) - 1}&batch=${encodeURIComponent(params.batch ?? "")}`}
              >
                Previous
              </Link>
            )}
            {page * 25 < total && (
              <Link
                href={`/admin/exam?page=${Math.floor(page) + 1}&batch=${encodeURIComponent(params.batch ?? "")}`}
              >
                Next
              </Link>
            )}
          </div>
        </div>
      </Card>
      <h2 className="text-xl font-semibold">Private answer key</h2>
      <p className="text-dim mt-2 mb-5 text-sm leading-6">
        Version AI AMC 2026 v1 · 150 minutes · 100 points · Pass at 90%. MCQ: 40
        × 1. Code repair: 2 × 10. Coding: 30. Sequence: 2 × 5. Coding uses
        hidden behavioral cases and checks input immutability; sequence scoring
        is per correct position. No negative marking.
      </p>
      <div className="space-y-3">
        {questions.map((q, i) => (
          <AdminQuestion key={q.id} question={q} number={i + 1} />
        ))}
      </div>
    </>
  );
}
