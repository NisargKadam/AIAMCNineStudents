"use client";
import { useActionState, useState } from "react";
import { Eye, EyeOff, LoaderCircle, LockKeyhole, Mail } from "lucide-react";
import { loginAction } from "@/features/auth/actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, null);
  const [show, setShow] = useState(false);
  return (
    <form action={action} className="space-y-5">
      <div>
        <label
          htmlFor="email"
          className="mb-2 block text-xs font-semibold text-white"
        >
          Email
        </label>
        <div className="relative">
          <Mail className="text-muted absolute top-3.5 left-3.5" size={17} />
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            className="pl-10"
          />
        </div>
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label
            htmlFor="password"
            className="text-xs font-semibold text-white"
          >
            Password
          </label>
        </div>
        <div className="relative">
          <LockKeyhole
            className="text-muted absolute top-3.5 left-3.5"
            size={17}
          />
          <Input
            id="password"
            name="password"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            required
            className="px-10"
            placeholder="Enter your password"
          />
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="text-muted absolute top-3 right-3 hover:text-white"
            aria-label={show ? "Hide password" : "Show password"}
          >
            {show ? <EyeOff size={19} /> : <Eye size={19} />}
          </button>
        </div>
      </div>
      <label className="text-muted flex cursor-pointer items-center gap-2 text-xs">
        <input
          type="checkbox"
          name="remember"
          className="size-4 accent-[#d6401a]"
        />
        Remember me for 30 days
      </label>
      {state?.error && (
        <p
          role="alert"
          className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-xs text-red-300"
        >
          {state.error}
        </p>
      )}
      <Button className="w-full" size="lg" disabled={pending}>
        {pending && <LoaderCircle className="animate-spin" size={17} />}Sign in
      </Button>
    </form>
  );
}
