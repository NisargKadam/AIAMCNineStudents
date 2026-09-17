import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { ForgotPasswordForm } from "@/features/auth/forgot-password-form";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata = { title: "Forgot password" };

export default async function ForgotPasswordPage() {
  if (await getCurrentUser()) redirect("/dashboard");

  return (
    <main className="relative grid min-h-svh place-items-center overflow-hidden px-5 py-12">
      <div className="aurora" aria-hidden>
        <span />
        <span />
        <span />
      </div>
      <div className="field pointer-events-none absolute inset-0" aria-hidden />
      <section className="panel-raised lit relative z-10 w-full max-w-[28rem] rounded-3xl p-6 sm:p-8">
        <Brand href="/login" />
        <h1 className="font-display text-ink mt-8 text-3xl font-semibold">
          Forgot your password?
        </h1>
        <p className="text-dim mt-3 mb-7 text-sm leading-6">
          Enter the email registered with your cohort. Your administrator will
          see the request and can set a new password without removing your
          profile, progress, or submissions.
        </p>
        <ForgotPasswordForm />
      </section>
    </main>
  );
}
