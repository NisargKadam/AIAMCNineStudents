import { redirect } from "next/navigation";
import { BookOpenCheck, ClipboardCheck, MessageSquare } from "lucide-react";
import { Brand } from "@/components/brand";
import { LoginForm } from "@/features/auth/login-form";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata = { title: "Sign in" };

const deck = [
  {
    icon: BookOpenCheck,
    title: "Readiness",
    line: "Environment, accounts, and foundations verified before week one.",
    meter: 100,
    tone: "var(--verified)",
  },
  {
    icon: ClipboardCheck,
    title: "Assignments",
    line: "Ten builds, submitted from GitHub and reviewed by your instructor.",
    meter: 60,
    tone: "var(--ember)",
  },
  {
    icon: MessageSquare,
    title: "Community",
    line: "The cohort's working notes, wins, and unstuck moments.",
    meter: 34,
    tone: "var(--halo)",
  },
];

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/dashboard");

  return (
    <main className="relative min-h-svh overflow-hidden lg:grid lg:grid-cols-[1.05fr_.95fr]">
      <div className="aurora" aria-hidden>
        <span />
        <span />
        <span />
      </div>
      <div className="field pointer-events-none absolute inset-0" aria-hidden />

      {/* The deck itself is the hero: three panels of the portal, in space. */}
      <section className="relative z-10 hidden flex-col justify-between overflow-hidden p-10 lg:flex xl:p-14">
        <Brand href="/login" />

        <div className="max-w-lg py-8">
          <h1 className="font-display text-ink text-[40px] leading-[1.06] font-semibold tracking-[-.035em] text-balance xl:text-[50px]">
            Learn to build agents before agents learn to replace you.
          </h1>
          <p className="text-dim mt-5 max-w-md text-sm leading-7">
            AI AMC Nine is the workspace for the Agentic AI Masterclass cohort —
            readiness, builds, reviews, and the people doing it alongside you.
          </p>

          <div className="stage mt-9">
            <div className="preserve-3d [transform:perspective(1500px)_rotateY(-11deg)_rotateX(5deg)]">
              {deck.map(({ icon: Icon, title, line, meter, tone }, index) => (
                <div
                  key={title}
                  className="panel-raised lit rise relative rounded-2xl p-4"
                  style={{
                    marginTop: index === 0 ? 0 : -6,
                    marginLeft: index * 18,
                    transform: `translateZ(${index * 22}px)`,
                    animationDelay: `${240 + index * 120}ms`,
                    width: "min(100%, 22rem)",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="grid size-8 shrink-0 place-items-center rounded-lg"
                      style={{
                        background: `color-mix(in oklab, ${tone} 15%, transparent)`,
                        color: tone,
                      }}
                    >
                      <Icon size={15} />
                    </span>
                    <p className="text-ink text-sm font-semibold">{title}</p>
                  </div>
                  <p className="text-dim mt-2 text-[11px] leading-5">{line}</p>
                  <div className="mt-3 h-1 overflow-hidden rounded-full bg-[var(--sunken)]">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${meter}%`, background: tone }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="text-faint text-xs">
          Built by Nisarg Kadam and Rahul Dusane
        </p>
      </section>

      <section className="relative z-10 flex min-h-svh items-center justify-center px-5 py-12 sm:px-8">
        <div className="w-full max-w-[26rem]">
          <div className="mb-10 lg:hidden">
            <Brand href="/login" />
          </div>

          <h2 className="font-display text-ink text-3xl font-semibold">
            Sign in
          </h2>
          <p className="text-dim mt-2.5 mb-8 text-sm leading-6">
            Use the email registered with your cohort. Ask an administrator if
            you need access.
          </p>

          <LoginForm />

          <p className="text-faint mt-10 text-center text-[11px] leading-5">
            Sessions are protected with HTTP-only cookies and can be revoked by
            an administrator at any time.
          </p>
        </div>
      </section>
    </main>
  );
}
