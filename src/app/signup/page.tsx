import { redirect } from "next/navigation";
import { SignupScreen } from "@/features/signup/signup-screen";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata = { title: "Sign up for your certificate" };

export default async function SignupPage() {
  if (await getCurrentUser()) redirect("/dashboard");

  return (
    <main className="relative min-h-svh overflow-hidden lg:grid lg:grid-cols-[1.05fr_.95fr]">
      <div className="aurora" aria-hidden>
        <span />
        <span />
        <span />
      </div>
      <div className="field pointer-events-none absolute inset-0" aria-hidden />
      <SignupScreen />
    </main>
  );
}
