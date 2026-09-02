"use client";
import { useActionState, useState } from "react";
import { ArrowRight, Eye, EyeOff, LoaderCircle } from "lucide-react";
import { loginAction } from "@/features/auth/actions";
import { Field, Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, null);
  const [show, setShow] = useState(false);

  return (
    <form action={action} className="space-y-5">
      <Field label="Email" htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
        />
      </Field>

      <Field label="Password" htmlFor="password">
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            required
            className="pr-11"
            placeholder="Your cohort password"
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
      </Field>

      <label className="text-dim flex w-fit cursor-pointer items-center gap-2.5 text-xs">
        <input
          type="checkbox"
          name="remember"
          className="accent-ember size-4 rounded"
        />
        Stay signed in for 30 days
      </label>

      {state?.error && (
        <p
          role="alert"
          className="rounded-xl border border-[color-mix(in_oklab,var(--alert)_35%,transparent)] bg-[color-mix(in_oklab,var(--alert)_12%,transparent)] px-3.5 py-3 text-xs leading-5 text-[var(--alert)]"
        >
          {state.error}
        </p>
      )}

      <Button className="w-full" size="lg" disabled={pending}>
        {pending ? (
          <LoaderCircle className="animate-spin" size={17} />
        ) : (
          <ArrowRight size={17} />
        )}
        {pending ? "Signing in" : "Sign in"}
      </Button>
    </form>
  );
}
