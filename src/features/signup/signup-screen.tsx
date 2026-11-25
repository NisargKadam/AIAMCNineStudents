"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import {
  ArrowRight,
  Check,
  Circle,
  Eye,
  EyeOff,
  LoaderCircle,
  MailCheck,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { ALUMNI_BATCHES } from "@/lib/access";
import { batchLabel, cn, firstName } from "@/lib/utils";
import { passwordRules } from "@/lib/validation";
import { EXAM_MINUTES, PASS_SCORE } from "@/features/exam/types";
import { signupAction } from "./actions";
import { CertificatePlate } from "./certificate-plate";

const facts = [
  { value: `${EXAM_MINUTES} min`, label: "One timed exam" },
  { value: `${PASS_SCORE}%`, label: "To pass" },
  { value: "Unlimited", label: "Attempts" },
];

export function SignupScreen() {
  const [state, action, pending] = useActionState(signupAction, null);
  // Controlled, so nothing typed is lost when the server answers with an error.
  const [batch, setBatch] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  // The request the person chose to move past, to try a different email.
  const [dismissed, setDismissed] = useState<string | null>(null);

  const requested =
    state && "pending" in state && state.pending.email !== dismissed
      ? state.pending
      : null;
  const failure = state && "error" in state ? state : null;

  return (
    <>
      <section className="relative z-10 hidden flex-col justify-between overflow-hidden p-10 lg:flex xl:p-14">
        <Brand href="/login" />

        <div className="max-w-lg py-8">
          <p className="text-dim mb-4 flex items-center gap-2.5 text-xs">
            <span className="bg-ember h-3.5 w-[3px] rounded-full" />
            For students of Batches 1 to 10
          </p>
          <h1 className="font-display text-ink text-[40px] leading-[1.06] font-semibold tracking-[-.035em] text-balance xl:text-[48px]">
            You did the work. Come back for the certificate.
          </h1>
          <p className="text-dim mt-5 max-w-md text-sm leading-7">
            Create your account, pass the certification exam, and earn a
            verified credential you can share on LinkedIn.
          </p>

          <CertificatePlate name={name} className="mt-10 max-w-[25rem]" />

          <dl className="mt-12 grid max-w-md grid-cols-3 gap-3">
            {facts.map((fact) => (
              <div
                key={fact.label}
                className="rounded-xl border border-[var(--line)] bg-[color-mix(in_oklab,var(--panel)_60%,transparent)] px-3.5 py-3"
              >
                <dd className="font-display text-ink num text-lg font-semibold">
                  {fact.value}
                </dd>
                <dt className="text-dim mt-0.5 text-[11px]">{fact.label}</dt>
              </div>
            ))}
          </dl>
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

          {requested ? (
            <div className="rise" role="status">
              <span className="grid size-14 place-items-center rounded-2xl border border-[color-mix(in_oklab,var(--verified)_35%,transparent)] bg-[color-mix(in_oklab,var(--verified)_12%,transparent)] text-[var(--verified)]">
                <MailCheck size={26} />
              </span>
              <h2 className="font-display text-ink mt-6 text-3xl font-semibold">
                Request sent
              </h2>
              <p className="text-dim mt-3 text-sm leading-6">
                Thanks, {firstName(requested.fullName)}.{" "}
                <span className="text-ink font-medium break-all">
                  {requested.email}
                </span>{" "}
                is not on our alumni list yet, so your instructor will review
                it.
              </p>
              <ol className="mt-6 space-y-3">
                {[
                  "Your instructor approves your request.",
                  "You sign in with this email and the password you just chose.",
                  "You add a photo, then take the certification exam.",
                ].map((step, index) => (
                  <li key={step} className="flex gap-3">
                    <span className="num text-faint grid size-6 shrink-0 place-items-center rounded-full border border-[var(--line-strong)] text-[11px] font-semibold">
                      {index + 1}
                    </span>
                    <span className="text-dim text-sm leading-6">{step}</span>
                  </li>
                ))}
              </ol>
              <Button asChild size="lg" className="mt-8 w-full">
                <Link href="/login">
                  Go to sign in
                  <ArrowRight size={17} />
                </Link>
              </Button>
              <button
                type="button"
                onClick={() => {
                  setDismissed(requested.email);
                  setEmail("");
                }}
                className="text-ember mt-5 block w-full text-center text-xs font-semibold hover:underline"
              >
                Joined the masterclass with a different email? Try that one
              </button>
            </div>
          ) : (
            <>
              <h2 className="font-display text-ink text-3xl font-semibold">
                Sign up for your certificate
              </h2>
              <p className="text-dim mt-2.5 mb-8 text-sm leading-6">
                For students of Batches 1 to 10. It takes about a minute.
              </p>

              <form action={action} className="space-y-5">
                <Field label="Which batch were you in?" htmlFor="alumniBatch">
                  <Select
                    id="alumniBatch"
                    name="alumniBatch"
                    required
                    value={batch}
                    onChange={(event) => setBatch(event.target.value)}
                    className={cn(!batch && "text-faint")}
                  >
                    <option value="" disabled>
                      Choose your batch
                    </option>
                    {ALUMNI_BATCHES.map((number) => (
                      <option key={number} value={number}>
                        {batchLabel(number)}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field
                  label="Full name"
                  htmlFor="fullName"
                  hint="As you would like it on your certificate."
                >
                  <Input
                    id="fullName"
                    name="fullName"
                    autoComplete="name"
                    required
                    minLength={2}
                    maxLength={100}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Priya Sharma"
                  />
                </Field>

                <Field
                  label="Email"
                  htmlFor="email"
                  hint="Use the email you joined the masterclass with and you are in straight away."
                >
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                  />
                </Field>

                <Field label="Choose a password" htmlFor="password">
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={show ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      minLength={12}
                      maxLength={200}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="pr-11"
                      aria-describedby="password-rules"
                    />
                    <button
                      type="button"
                      onClick={() => setShow(!show)}
                      className="text-faint hover:text-ink absolute top-1/2 right-3 -translate-y-1/2 rounded p-1 transition-colors"
                      aria-label={show ? "Hide password" : "Show password"}
                    >
                      {show ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                  <ul
                    id="password-rules"
                    className="flex flex-wrap gap-x-4 gap-y-1 pt-0.5"
                  >
                    {passwordRules.map((rule) => {
                      const met = rule.test(password);
                      return (
                        <li
                          key={rule.key}
                          className={cn(
                            "flex items-center gap-1.5 text-[11px] transition-colors duration-200",
                            met ? "text-[var(--verified)]" : "text-faint",
                          )}
                        >
                          {met ? <Check size={12} /> : <Circle size={12} />}
                          {rule.label}
                          <span className="sr-only">
                            {met ? " (met)" : " (not met yet)"}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </Field>

                {failure && (
                  <div
                    role="alert"
                    className="rounded-xl border border-[color-mix(in_oklab,var(--alert)_35%,transparent)] bg-[color-mix(in_oklab,var(--alert)_12%,transparent)] px-3.5 py-3 text-xs leading-5 text-[var(--alert)]"
                  >
                    <p>{failure.error}</p>
                    {failure.code === "exists" && (
                      <p className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 font-semibold">
                        <Link href="/login" className="underline">
                          Sign in
                        </Link>
                        <Link href="/forgot-password" className="underline">
                          Forgot your password?
                        </Link>
                      </p>
                    )}
                    {failure.code === "waiting" && (
                      <p className="mt-1.5 font-semibold">
                        <Link href="/login" className="underline">
                          Go to sign in
                        </Link>
                      </p>
                    )}
                  </div>
                )}

                <Button className="w-full" size="lg" disabled={pending}>
                  {pending ? (
                    <LoaderCircle className="animate-spin" size={17} />
                  ) : (
                    <ArrowRight size={17} />
                  )}
                  {pending ? "Creating your account" : "Create my account"}
                </Button>
              </form>

              <p className="text-dim mt-8 text-center text-xs">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="text-ember font-semibold hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </section>
    </>
  );
}
