"use client";
import { Award } from "lucide-react";
import { Tilt } from "@/components/motion/tilt";
import { cn } from "@/lib/utils";

/**
 * The certificate someone is signing up to earn, as a physical plate: it
 * leans into the pointer, the seal rides above the paper, and the name is
 * printed as it is typed.
 */
export function CertificatePlate({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const shown = name.trim();
  return (
    <div className={cn("stage floaty", className)} aria-hidden>
      <div className="preserve-3d [transform:perspective(1500px)_rotateY(-12deg)_rotateX(6deg)]">
        <Tilt className="group rounded-2xl" strength={9} lift={18}>
          <span className="absolute inset-3 [transform:translate3d(18px,26px,-70px)] rounded-2xl bg-black/50 blur-2xl" />
          <div className="relative rounded-2xl border border-[#b79756] bg-[#faf7f0] px-6 py-8 text-center text-[#10212e] shadow-[0_30px_60px_-30px_rgba(0,0,0,.8)]">
            <div className="pointer-events-none absolute inset-2 rounded-xl border border-[#b79756]/40" />
            <p className="text-[9px] font-bold tracking-[.24em] text-[#927039]">
              AI AMC / AGENTIC AI MASTERCLASS
            </p>
            <p className="mt-4 font-serif text-2xl">
              Certificate of Completion
            </p>
            <p className="mt-4 text-[8px] tracking-widest text-[#62696d]">
              PRESENTED TO
            </p>
            <p
              className={cn(
                "certificate-name mx-auto mt-2 truncate text-[26px] leading-9 transition-colors duration-300",
                !shown && "text-[#10212e]/25",
              )}
            >
              {shown || "Your name"}
            </p>
            <div className="mx-auto my-4 h-px w-2/3 bg-[#b79756]/50" />
            <p className="text-[11px]">AI Agentic MasterClass Certified</p>
            <p className="mt-1 font-serif text-lg">
              AI &amp; LLM Expert Engineer
            </p>
            <p className="certificate-signature mt-4 text-3xl">Nisarg Kadam</p>
            <p className="mt-1 text-[8px] tracking-widest text-[#927039]">
              CERTIFIED BY NISARG KADAM
            </p>
          </div>
          <span className="absolute -right-4 -bottom-5 grid size-[4.5rem] [transform:translateZ(46px)] place-items-center rounded-full border border-[#e6cf9a] bg-[radial-gradient(circle_at_30%_25%,#f1dca6,#b79756_55%,#8a6a2f)] text-[#3d2c0c] shadow-[0_18px_30px_-12px_rgba(0,0,0,.7)]">
            <Award size={30} strokeWidth={1.6} />
          </span>
        </Tilt>
      </div>
    </div>
  );
}
