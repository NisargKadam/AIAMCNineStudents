import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Award, BadgeCheck, ExternalLink } from "lucide-react";
import { db } from "@/lib/db";
import { verificationUrl } from "@/features/exam/certificate";
import { CERTIFICATION_TITLE } from "@/features/exam/types";

async function findCertificate(id: string) {
  return db.examCertificate.findFirst({
    where: {
      id,
      user: { isActive: true },
      attempt: { status: "SUBMITTED", passed: true, score: { gte: 90 } },
    },
    select: { id: true, name: true, issuedAt: true },
  });
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const c = await findCertificate(id);
  if (!c)
    return {
      title: "Credential not found",
      robots: { index: false, follow: false },
    };
  return {
    title: `${c.name} · AI AMC Certified`,
    description: `${c.name} earned the AI Agentic MasterClass certification as an AI & LLM Expert Engineer. Certified by Nisarg Kadam.`,
    robots: { index: false, follow: false },
    openGraph: {
      title: `${c.name} is AI AMC Certified`,
      description: CERTIFICATION_TITLE,
      url: verificationUrl(c.id),
      type: "website",
    },
  };
}
export default async function CertificatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const c = await findCertificate(id);
  if (!c) notFound();
  return (
    <main
      id="main-content"
      className="relative mx-auto flex min-h-screen max-w-4xl flex-col justify-center px-5 py-14"
    >
      <div className="mb-7 flex items-center justify-between">
        <Link href="/" className="font-display text-xl font-semibold">
          AI<span className="text-ember"> AMC</span>
        </Link>
        <p className="flex items-center gap-2 text-xs text-[var(--verified)]">
          <BadgeCheck size={17} />
          Verified credential
        </p>
      </div>
      <article className="panel overflow-hidden rounded-3xl">
        <div className="border-b border-[var(--line)] bg-[var(--raised)] px-6 py-8 sm:px-12">
          <Award size={32} className="mb-6 text-[var(--caution)]" />
          <p className="text-dim text-xs font-semibold tracking-widest uppercase">
            Certificate of Completion
          </p>
          <h1 className="certificate-name mt-5 text-3xl font-semibold break-words sm:text-5xl">
            {c.name}
          </h1>
          <p className="mt-5 text-lg font-semibold">
            AI Agentic MasterClass Certified
          </p>
          <p className="text-ember mt-2 text-xl">
            AI &amp; LLM Expert Engineer
          </p>
          <p className="text-dim mt-5 max-w-2xl text-sm leading-7">
            Completed the AI Agentic MasterClass and passed its 150-minute
            certification assessment with a score of at least 90%, demonstrating
            excellence across LLMs, prompting, agent workflows, RAG, evaluation,
            guardrails, MCP, A2A, operations, and deployment.
          </p>
        </div>
        <div className="px-6 py-8 sm:px-12">
          <p className="certificate-signature text-4xl">Nisarg Kadam</p>
          <p className="text-dim mt-2 text-xs">
            Certified by Nisarg Kadam · AI AMC
          </p>
          <dl className="mt-7 grid gap-5 border-t border-[var(--line)] pt-6 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-dim text-xs">Issue date</dt>
              <dd className="mt-2">
                {c.issuedAt.toLocaleDateString("en-GB", {
                  timeZone: "UTC",
                  dateStyle: "long",
                })}
              </dd>
            </div>
            <div>
              <dt className="text-dim text-xs">Credential ID</dt>
              <dd className="mt-2 font-mono text-xs break-all">{c.id}</dd>
            </div>
          </dl>
        </div>
      </article>
      <p className="text-dim mt-6 text-center text-xs leading-6">
        This page verifies a credential issued by the AI AMC learning platform.
      </p>
      <Link
        href="/exam"
        className="text-ember mt-3 flex items-center justify-center gap-2 text-sm"
      >
        Visit the masterclass portal
        <ExternalLink size={14} />
      </Link>
    </main>
  );
}
