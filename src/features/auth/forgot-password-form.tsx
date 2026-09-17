"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowLeft, LoaderCircle, Send } from "lucide-react";
import { requestPasswordResetAction } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(
    requestPasswordResetAction,
    null,
  );

  return (
    <div>
      {state?.success ? (
        <div
          role="status"
          className="rounded-xl border border-[color-mix(in_oklab,var(--verified)_30%,transparent)] bg-[color-mix(in_oklab,var(--verified)_12%,transparent)] p-4 text-sm leading-6 text-[var(--verified)]"
        >
          {state.success}
        </div>
      ) : (
        <form action={action} className="space-y-5">
          <Field label="Registered email" htmlFor="reset-email">
            <Input
              id="reset-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              autoFocus
              placeholder="you@example.com"
            />
          </Field>
          {state?.error && (
            <p role="alert" className="text-sm text-[var(--alert)]">
              {state.error}
            </p>
          )}
          <Button className="w-full" size="lg" disabled={pending}>
            {pending ? (
              <LoaderCircle className="animate-spin" size={17} />
            ) : (
              <Send size={17} />
            )}
            {pending ? "Sending request" : "Request password reset"}
          </Button>
        </form>
      )}

      <Button asChild variant="ghost" className="mt-4 w-full">
        <Link href="/login">
          <ArrowLeft size={15} />
          Back to sign in
        </Link>
      </Button>
    </div>
  );
}
