import Link from "next/link";
import { ArrowRight, PenLine } from "lucide-react";
import type { CurrentUser } from "@/lib/auth/session";
import { memberBadge } from "@/lib/access";
import { batchLabel, firstName } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CertificatePlate } from "@/features/exam/certificate-plate";
import { loadExam } from "@/features/exam/service";
import { EXAM_MINUTES, PASS_SCORE } from "@/features/exam/types";
import { MemberCard } from "@/features/profile/member-card";
import { RecentPosts } from "./recent-posts";

type Tone = "ember" | "verified" | "caution" | "halo";

const steps = [
  {
    title: "Take the exam",
    text: `One sitting of ${EXAM_MINUTES} minutes. Your answers save as you work.`,
  },
  {
    title: `Score ${PASS_SCORE}% or more`,
    text: "Not there yet? Attempts are unlimited, so review and go again.",
  },
  {
    title: "Claim and share your certificate",
    text: "A verified credential you can download and post on LinkedIn and Instagram.",
  },
];

/**
 * Home for a certification-only account. An alumnus is here for one thing,
 * so the page is built around where they stand with the exam, with the
 * alumni community and their own card beside it.
 */
export async function AlumniHome({ user }: { user: CurrentUser }) {
  const exam = await loadExam(user.id);
  const name = user.profile?.fullName ?? user.email;
  const best = exam.results.reduce(
    (highest, result) => Math.max(highest, result.score),
    0,
  );
  const passed = exam.results.find((result) => result.passed);

  const stage: {
    tone: Tone;
    label: string;
    headline: string;
    detail: string;
    cta: string;
  } = exam.certificate
    ? {
        tone: "verified",
        label: "Certified",
        headline: "You are AI AMC certified",
        detail:
          "Your credential is issued and publicly verifiable. Download it, add it to your LinkedIn profile, and share it.",
        cta: "View and share your certificate",
      }
    : passed
      ? {
          tone: "verified",
          label: "Passed",
          headline: `You passed with ${passed.score}%`,
          detail:
            "One step left: put your name on the certificate to make it official.",
          cta: "Claim your certificate",
        }
      : exam.active
        ? {
            tone: "ember",
            label: "In progress",
            headline: "Your exam is in progress",
            detail:
              "The timer keeps running while you are away. Pick up where you left off.",
            cta: "Resume the exam",
          }
        : exam.results.length
          ? {
              tone: "caution",
              label: "Not passed yet",
              headline: `Your best score so far is ${best}%`,
              detail: `You need ${PASS_SCORE}% to pass, and attempts are unlimited. Look at where the marks went, then go again.`,
              cta: "Try again",
            }
          : {
              tone: "ember",
              label: "Ready when you are",
              headline: "Your certification exam is waiting",
              detail: `${EXAM_MINUTES} minutes, ${PASS_SCORE}% to pass, as many attempts as you need. Start when you have a quiet stretch.`,
              cta: "Go to the exam",
            };

  const facts = [
    { label: "Time allowed", value: `${EXAM_MINUTES} min` },
    { label: "Pass mark", value: `${PASS_SCORE}%` },
    { label: "Attempts so far", value: String(exam.results.length) },
    ...(exam.results.length
      ? [{ label: "Best score", value: `${best}%` }]
      : []),
  ];

  return (
    <>
      <header className="mb-7">
        <p className="text-dim flex items-center gap-2.5 text-xs">
          <span className="live-dot size-1.5 rounded-full bg-[var(--verified)]" />
          Signed in as an alumnus
          {user.alumniBatch !== null && ` of ${batchLabel(user.alumniBatch)}`}
        </p>
        <h1 className="font-display text-ink mt-3 text-[30px] leading-tight font-semibold sm:text-[34px]">
          Welcome back, {firstName(name)}
        </h1>
      </header>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,.7fr)]">
        <Card className="relative p-6 sm:p-8">
          <span
            aria-hidden
            className="absolute -top-28 -left-20 size-72 rounded-full opacity-25 blur-3xl"
            style={{
              background:
                stage.tone === "verified" ? "var(--verified)" : "var(--ember)",
            }}
          />
          <div className="relative flex flex-col gap-10 lg:flex-row lg:items-center">
            <div className="min-w-0 flex-1">
              <Badge tone={stage.tone}>{stage.label}</Badge>
              <h2 className="font-display text-ink mt-4 text-2xl font-semibold text-balance sm:text-[28px] sm:leading-9">
                {stage.headline}
              </h2>
              <p className="text-dim mt-3 max-w-md text-sm leading-6 text-pretty">
                {stage.detail}
              </p>
              <Button asChild size="lg" className="mt-7">
                <Link href="/exam">
                  {stage.cta}
                  <ArrowRight size={17} />
                </Link>
              </Button>
              <dl className="mt-8 flex flex-wrap gap-x-8 gap-y-4 border-t border-[var(--line)] pt-5">
                {facts.map((fact) => (
                  <div key={fact.label}>
                    <dt className="text-faint text-[11px]">{fact.label}</dt>
                    <dd className="num font-display text-ink mt-1 text-lg font-semibold">
                      {fact.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
            <CertificatePlate
              name={exam.certificate?.name ?? name}
              className="mx-auto w-[18.5rem] shrink-0 pr-4 pb-6 lg:mx-0"
            />
          </div>
        </Card>

        <div className="flex flex-col gap-3">
          <MemberCard
            name={name}
            role={user.profile?.currentRole ?? ""}
            country={user.profile?.country ?? ""}
            avatarUrl={user.profile?.avatarUrl ?? ""}
            badge={memberBadge(user)}
          />
          <Link
            href="/profile"
            className="text-dim hover:text-ink flex items-center justify-center gap-2 rounded-xl border border-[var(--line)] py-2.5 text-xs font-medium transition-colors hover:border-[var(--line-strong)]"
          >
            <PenLine size={13} />
            Edit your profile
          </Link>
        </div>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[1.25fr_.75fr]">
        <RecentPosts
          user={user}
          title="What the alumni are sharing"
          empty="Nothing shared yet. Say hello and tell the others what you are building."
        />
        <Card className="p-5 sm:p-6">
          <h2 className="font-display text-ink text-sm font-semibold">
            How certification works
          </h2>
          <ol className="mt-5 space-y-5">
            {steps.map((step, index) => (
              <li key={step.title} className="flex gap-3.5">
                <span className="num text-ember grid size-7 shrink-0 place-items-center rounded-full border border-[color-mix(in_oklab,var(--ember)_35%,transparent)] bg-[var(--ember-soft)] text-xs font-semibold">
                  {index + 1}
                </span>
                <div>
                  <p className="text-ink text-sm font-semibold">{step.title}</p>
                  <p className="text-dim mt-1 text-xs leading-5">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </section>
    </>
  );
}
