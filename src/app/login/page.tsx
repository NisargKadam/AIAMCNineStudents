import { redirect } from "next/navigation";
import { ShieldCheck, Sparkles } from "lucide-react";
import { Brand } from "@/components/brand";
import { LoginForm } from "@/features/auth/login-form";
import { getCurrentUser } from "@/lib/auth/session";
export const metadata = { title: "Sign in" };
export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <main className="fine-grid relative grid min-h-screen overflow-hidden lg:grid-cols-[1.15fr_.85fr]">
      <div className="bg-accent/10 pointer-events-none absolute top-[15%] left-[12%] size-[420px] rounded-full blur-[120px]" />
      <section className="relative hidden flex-col justify-between p-12 lg:flex xl:p-16">
        <Brand />
        <div className="max-w-xl">
          <div className="border-accent/20 bg-accent/10 mb-7 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium text-[#ff9a81]">
            <Sparkles size={14} />
            Cohort learning, engineered together
          </div>
          <h1 className="text-6xl leading-[1.02] font-semibold tracking-[-.055em] text-balance text-white">
            Build agents.
            <br />
            <span className="text-muted">Build momentum.</span>
          </h1>
          <p className="text-muted mt-7 max-w-md text-base leading-7">
            One focused workspace for your prerequisites, profile, assignments,
            and the AI AMC Nine community.
          </p>
        </div>
        <blockquote className="border-accent text-muted border-l-2 pl-5 text-sm">
          “Learn to build agents before agents learn to replace you.”
        </blockquote>
      </section>
      <section className="relative flex min-h-screen items-center justify-center px-5 py-10">
        <div className="glass w-full max-w-md rounded-3xl p-6 shadow-[0_30px_100px_rgba(0,0,0,.45)] sm:p-9">
          <div className="mb-9 lg:hidden">
            <Brand />
          </div>
          <p className="text-accent text-xs font-bold tracking-[.2em] uppercase">
            Student Portal
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-.04em] text-white">
            Welcome back
          </h2>
          <p className="text-muted mt-2 mb-8 text-sm leading-6">
            Sign in to continue your Agentic AI Masterclass journey.
          </p>
          <LoginForm />
          <div className="text-muted mt-7 flex gap-3 rounded-xl bg-white/[.035] p-3 text-xs leading-5">
            <ShieldCheck
              size={18}
              className="mt-0.5 shrink-0 text-emerald-400"
            />
            <span>
              Use the email registered with your AI AMC cohort. Your session is
              securely protected.
            </span>
          </div>
          <p className="text-muted/70 mt-7 text-center text-[11px]">
            Created by Nisarg Kadam · Co-Founder Rahul Dusane
          </p>
        </div>
      </section>
    </main>
  );
}
