"use client";
import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  ClipboardCheck,
  UserRound,
} from "lucide-react";
import { Tilt } from "@/components/motion/tilt";
import { CountUp } from "@/components/motion/count-up";
import { Dial } from "@/components/ui/progress";

type Track = {
  key: string;
  icon: typeof BookOpenCheck;
  label: string;
  done: number;
  total: number;
  unit: string;
  href: string;
  tone: string;
};

/**
 * The one bold surface in the portal: the three tracks a student is judged on,
 * stacked as physical plates so their relative state is readable in a glance
 * and the depth carries meaning rather than decoration.
 */
export function ProgressDeck({
  overall,
  prereqDone,
  prereqTotal,
  assignmentsDone,
  assignmentsTotal,
  profilePercent,
  headline,
  subline,
  cta,
}: {
  overall: number;
  prereqDone: number;
  prereqTotal: number;
  assignmentsDone: number;
  assignmentsTotal: number;
  profilePercent: number;
  headline: string;
  subline: string;
  cta: { label: string; href: string } | null;
}) {
  const tracks: Track[] = [
    {
      key: "prereq",
      icon: BookOpenCheck,
      label: "Readiness",
      done: prereqDone,
      total: prereqTotal,
      unit: "checks",
      href: "/prerequisites",
      tone: "var(--verified)",
    },
    {
      key: "assign",
      icon: ClipboardCheck,
      label: "Assignments",
      done: assignmentsDone,
      total: assignmentsTotal,
      unit: "approved",
      href: "/assignments",
      tone: "var(--ember)",
    },
    {
      key: "profile",
      icon: UserRound,
      label: "Profile",
      done: profilePercent,
      total: 100,
      unit: "complete",
      href: "/profile",
      tone: "var(--halo)",
    },
  ];

  return (
    <section className="stage grid gap-4 xl:grid-cols-[minmax(0,.85fr)_minmax(0,1.15fr)]">
      <Tilt className="group" strength={5} lift={14}>
        <div className="panel lit relative flex h-full flex-col justify-between overflow-hidden rounded-2xl p-6 sm:p-7">
          <div className="flex items-center gap-6">
            <Dial value={overall} caption="overall" />
            <div className="min-w-0">
              <h2 className="font-display text-ink text-lg font-semibold">
                {headline}
              </h2>
              <p className="text-dim mt-2 text-sm leading-6 text-pretty">
                {subline}
              </p>
            </div>
          </div>
          {cta && (
            <Link
              href={cta.href}
              className="text-ink hover:text-ember mt-7 inline-flex w-fit items-center gap-2 rounded-xl border border-[var(--line-strong)] px-4 py-2.5 text-sm font-semibold transition-colors hover:border-[var(--ember)]"
            >
              {cta.label}
              <ArrowRight size={15} />
            </Link>
          )}
        </div>
      </Tilt>

      <div className="preserve-3d grid gap-4 sm:grid-cols-3">
        {tracks.map((track, index) => {
          const percent = track.total
            ? Math.round((track.done / track.total) * 100)
            : 0;
          const Icon = track.icon;
          return (
            <Tilt key={track.key} className="group" strength={8} lift={16}>
              <Link
                href={track.href}
                className="panel lit relative flex h-full flex-col justify-between overflow-hidden rounded-2xl p-5 transition-colors hover:border-[var(--line-strong)]"
                style={{ animationDelay: `${index * 70}ms` }}
              >
                <span
                  aria-hidden
                  className="absolute inset-x-0 bottom-0 h-px"
                  style={{ background: track.tone, opacity: 0.5 }}
                />
                <div className="flex items-center justify-between">
                  <span
                    className="grid size-9 place-items-center rounded-xl"
                    style={{
                      background: `color-mix(in oklab, ${track.tone} 14%, transparent)`,
                      color: track.tone,
                    }}
                  >
                    <Icon size={17} />
                  </span>
                  <span
                    className="num text-xs font-semibold"
                    style={{ color: track.tone }}
                  >
                    <CountUp value={percent} suffix="%" />
                  </span>
                </div>
                <div className="mt-8">
                  <p className="num font-display text-ink text-2xl font-semibold">
                    {track.key === "profile"
                      ? `${track.done}%`
                      : `${track.done}/${track.total}`}
                  </p>
                  <p className="text-dim mt-1 text-xs">
                    {track.label} {track.unit}
                  </p>
                </div>
                <div className="mt-4 h-1 overflow-hidden rounded-full bg-[var(--sunken)]">
                  <div
                    className="h-full rounded-full transition-[width] duration-700"
                    style={{
                      width: `${percent}%`,
                      background: track.tone,
                      boxShadow: `0 0 12px -2px ${track.tone}`,
                    }}
                  />
                </div>
              </Link>
            </Tilt>
          );
        })}
      </div>
    </section>
  );
}
