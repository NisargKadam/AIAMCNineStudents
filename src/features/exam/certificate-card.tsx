"use client";

import { useState, useTransition } from "react";
import {
  Award,
  Download,
  ExternalLink,
  Share2,
  Copy,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Confirm } from "@/components/ui/dialog";
import { issueCertificateAction } from "./actions";
import { CERTIFICATION_TITLE, type CertificateView } from "./types";

export function CertificateCard({
  initial,
  defaultName,
  baseUrl,
}: {
  initial: CertificateView | null;
  defaultName: string;
  baseUrl: string;
}) {
  const [certificate, setCertificate] = useState(initial);
  const [name, setName] = useState(defaultName);
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  const url = certificate ? `${baseUrl}/certificates/${certificate.id}` : "";
  function issue() {
    start(async () => {
      try {
        const result = await issueCertificateAction(name);
        if (result.error) toast.error(result.error);
        else if (result.certificate) {
          setCertificate(result.certificate);
          setConfirm(false);
          toast.success("Your credential is ready.");
        }
      } catch {
        toast.error("Could not issue your certificate. Please try again.");
      }
    });
  }
  const linkedIn = new URLSearchParams({
    startTask: "CERTIFICATION_NAME",
    name: CERTIFICATION_TITLE,
    organizationName: "AI AMC · Nisarg Kadam",
    ...(certificate
      ? {
          issueYear: String(new Date(certificate.issuedAt).getUTCFullYear()),
          issueMonth: String(new Date(certificate.issuedAt).getUTCMonth() + 1),
          certId: certificate.id,
          certUrl: url,
        }
      : {}),
  });
  return (
    <Card className="mt-6 p-5 sm:p-8">
      <div className="mb-6 flex items-start gap-4">
        <div className="rounded-2xl bg-[var(--raised)] p-3 text-[var(--caution)]">
          <Award size={25} />
        </div>
        <div>
          <p className="text-xs font-semibold tracking-widest text-[var(--caution)] uppercase">
            Achievement unlocked
          </p>
          <h2 className="mt-2 text-xl font-semibold">
            Your next chapter starts here.
          </h2>
          <p className="text-dim mt-2 text-sm">
            AI Agentic MasterClass Certified · AI &amp; LLM Expert Engineer
          </p>
        </div>
      </div>
      {!certificate ? (
        <div className="max-w-xl">
          <label
            htmlFor="certificate-name"
            className="mb-2 block text-sm font-medium"
          >
            Name on your certificate
          </label>
          <Input
            id="certificate-name"
            value={name}
            maxLength={100}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
          <p className="text-dim mt-2 text-xs leading-5">
            Check the spelling carefully. This name becomes part of your public,
            verifiable credential when you issue it.
          </p>
          <Button
            className="mt-4"
            onClick={() => setConfirm(true)}
            disabled={name.trim().length < 2 || pending}
          >
            <Award size={16} />
            Issue my certificate
          </Button>
        </div>
      ) : (
        <>
          <div className="certificate-preview relative overflow-hidden rounded-xl border border-[#b79756] bg-[#faf7f0] px-5 py-9 text-center text-[#10212e] sm:px-10">
            <div className="pointer-events-none absolute inset-2 rounded-lg border border-[#b79756]/40" />
            <p className="text-[10px] font-bold tracking-[.24em] text-[#927039]">
              AI AMC / AGENTIC AI MASTERCLASS
            </p>
            <p className="mt-5 font-serif text-3xl sm:text-4xl">
              Certificate of Completion
            </p>
            <p className="mt-5 text-[9px] tracking-widest text-[#62696d]">
              PRESENTED TO
            </p>
            <p className="certificate-name mx-auto mt-3 max-w-2xl text-2xl break-words sm:text-4xl">
              {certificate.name}
            </p>
            <div className="mx-auto my-5 h-px w-2/3 bg-[#b79756]/50" />
            <p className="text-xs">AI Agentic MasterClass Certified</p>
            <p className="mt-2 font-serif text-xl sm:text-2xl">
              AI &amp; LLM Expert Engineer
            </p>
            <p className="certificate-signature mt-6 text-4xl">Nisarg Kadam</p>
            <p className="mt-1 text-[9px] tracking-widest text-[#927039]">
              CERTIFIED BY NISARG KADAM
            </p>
            <p className="mt-4 text-[10px] text-[#62696d]">
              Issued{" "}
              {new Date(certificate.issuedAt).toLocaleDateString("en-GB", {
                timeZone: "UTC",
              })}{" "}
              · Verifiable credential
            </p>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild>
              <a href={`/api/exam/certificate/${certificate.id}`}>
                <Download size={16} />
                Download PDF
              </a>
            </Button>
            <Button asChild variant="secondary">
              <a
                href={`https://www.linkedin.com/profile/add?${linkedIn}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Share2 size={16} />
                Add to LinkedIn
              </a>
            </Button>
            <Button asChild variant="secondary">
              <a
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink size={16} />
                Share achievement
              </a>
            </Button>
            <Button
              variant="ghost"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(url);
                  toast.success("Verification link copied.");
                } catch {
                  toast.error("Open the verification page to copy its URL.");
                }
              }}
            >
              <Copy size={15} />
              Copy link
            </Button>
          </div>
          <p className="text-dim mt-4 flex items-center gap-2 text-xs">
            <Check size={13} />
            {certificate.id}
          </p>
        </>
      )}
      <Confirm
        open={confirm}
        onOpenChange={setConfirm}
        title="Issue your certificate?"
        description={
          <>
            Your public credential will use{" "}
            <strong className="text-ink">{name.trim()}</strong>. The name is
            fixed after issuance.
          </>
        }
        confirmLabel="Issue certificate"
        onConfirm={issue}
        pending={pending}
        tone="default"
      />
    </Card>
  );
}
