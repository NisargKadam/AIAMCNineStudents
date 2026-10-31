import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { activeDTO, loadExam } from "@/features/exam/service";
import { ExamBoard } from "@/features/exam/exam-board";
import { appUrl } from "@/features/exam/certificate";

export const metadata = { title: "Certification exam" };
export default async function ExamPage() {
  const user = await requireUser();
  if (user.role === "ADMIN")
    return (
      <>
        <PageHeader
          eyebrow="Masterclass certification"
          title="Exam"
          description="Review the assessment, answer key, hidden coding tests, and student results from your exam console."
        />
        <Button asChild>
          <Link href="/admin/exam">Open exam console</Link>
        </Button>
      </>
    );
  const state = await loadExam(user.id);
  return (
    <>
      <PageHeader
        eyebrow="Masterclass certification"
        title={
          state.active ? "Your certification exam" : "The engineering benchmark"
        }
        description={
          state.active
            ? "Stay focused. Your answers save as you work; your timer continues until submission or expiry."
            : "An assessed milestone in your journey from learning AI to engineering it."
        }
      />
      <ExamBoard
        active={state.active ? activeDTO(state.active) : null}
        results={state.results}
        certificate={state.certificate}
        defaultName={user.profile?.fullName ?? ""}
        baseUrl={appUrl()}
      />
    </>
  );
}
