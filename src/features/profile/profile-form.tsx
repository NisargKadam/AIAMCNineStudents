"use client";
import { useActionState, useEffect, useState } from "react";
import {
  CheckCircle2,
  ExternalLink,
  Code2,
  KeyRound,
  LoaderCircle,
  Save,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { updateProfileAction } from "./actions";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
const fieldClass = "space-y-2";
const labelClass = "block text-xs font-semibold text-white";
export function ProfileForm({
  email,
  profile,
  maskedKey,
}: {
  email: string;
  profile: {
    fullName: string;
    githubUsername: string;
    linkedinUrl: string;
    currentRole: string;
    country: string;
    timezone: string;
    bio: string;
    avatarUrl: string;
  };
  maskedKey: string | null;
}) {
  const [state, action, pending] = useActionState(updateProfileAction, null);
  const [github, setGithub] = useState(profile.githubUsername);
  const [removeKey, setRemoveKey] = useState(false);
  useEffect(() => {
    if (state?.success) toast.success(state.success);
    if (state?.error) toast.error(state.error);
  }, [state]);
  return (
    <form action={action}>
      <input type="hidden" name="removeApiKey" value={String(removeKey)} />
      <div className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
        <div className="space-y-5">
          <Card className="p-5 sm:p-6">
            <h2 className="text-base font-semibold text-white">
              Personal information
            </h2>
            <p className="text-muted mt-1 text-xs">
              The basics your cohort and instructors use to know you.
            </p>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div className={fieldClass}>
                <label className={labelClass} htmlFor="fullName">
                  Full Name
                </label>
                <Input
                  id="fullName"
                  name="fullName"
                  defaultValue={profile.fullName}
                  required
                />
              </div>
              <div className={fieldClass}>
                <label className={labelClass} htmlFor="email">
                  Email
                </label>
                <Input id="email" value={email} disabled />
                <p className="text-muted text-[10px]">
                  Contact an administrator to change your sign-in email.
                </p>
              </div>
              <div className={fieldClass}>
                <label className={labelClass} htmlFor="githubUsername">
                  GitHub Username
                </label>
                <div className="relative">
                  <Code2
                    size={17}
                    className="text-muted absolute top-3.5 left-3.5"
                  />
                  <Input
                    id="githubUsername"
                    name="githubUsername"
                    value={github}
                    onChange={(e) => setGithub(e.target.value)}
                    className="pl-10"
                    placeholder="octocat"
                  />
                </div>
                {github && (
                  <a
                    href={`https://github.com/${github}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-[#ff987e] hover:underline"
                  >
                    github.com/{github}
                    <ExternalLink size={11} />
                  </a>
                )}
              </div>
              <div className={fieldClass}>
                <label className={labelClass} htmlFor="currentRole">
                  Current Role
                </label>
                <Input
                  id="currentRole"
                  name="currentRole"
                  defaultValue={profile.currentRole}
                  placeholder="e.g. Software Engineer"
                />
              </div>
              <div className={fieldClass}>
                <label className={labelClass} htmlFor="linkedinUrl">
                  LinkedIn URL
                </label>
                <Input
                  id="linkedinUrl"
                  name="linkedinUrl"
                  type="url"
                  defaultValue={profile.linkedinUrl}
                  placeholder="https://linkedin.com/in/..."
                />
              </div>
              <div className={fieldClass}>
                <label className={labelClass} htmlFor="avatarUrl">
                  Profile Photo URL
                </label>
                <Input
                  id="avatarUrl"
                  name="avatarUrl"
                  type="url"
                  defaultValue={profile.avatarUrl}
                  placeholder="https://..."
                />
              </div>
              <div className={fieldClass}>
                <label className={labelClass} htmlFor="country">
                  Country
                </label>
                <Input
                  id="country"
                  name="country"
                  defaultValue={profile.country}
                  placeholder="Singapore"
                />
              </div>
              <div className={fieldClass}>
                <label className={labelClass} htmlFor="timezone">
                  Timezone
                </label>
                <Input
                  id="timezone"
                  name="timezone"
                  defaultValue={profile.timezone}
                  placeholder="Asia/Singapore"
                />
              </div>
              <div className={`${fieldClass} sm:col-span-2`}>
                <label className={labelClass} htmlFor="bio">
                  Short Bio{" "}
                  <span className="text-muted font-normal">(optional)</span>
                </label>
                <Textarea
                  id="bio"
                  name="bio"
                  defaultValue={profile.bio}
                  maxLength={500}
                  placeholder="What are you learning, building, or curious about?"
                />
              </div>
            </div>
          </Card>
        </div>
        <div className="space-y-5">
          <Card className="p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-300">
                <KeyRound size={19} />
              </span>
              <div>
                <h2 className="text-base font-semibold text-white">
                  OpenAI API Key
                </h2>
                <p className="text-muted mt-1 text-xs leading-5">
                  Encrypted with AES-256-GCM. Your saved key can never be
                  revealed here.
                </p>
              </div>
            </div>
            {maskedKey && !removeKey ? (
              <div className="mt-5 rounded-xl border border-emerald-500/15 bg-emerald-500/[.06] p-4">
                <div className="flex items-center gap-2 text-xs text-emerald-300">
                  <CheckCircle2 size={15} />
                  API key securely stored
                </div>
                <code className="text-muted mt-3 block text-xs break-all">
                  {maskedKey}
                </code>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  className="mt-4"
                  onClick={() => setRemoveKey(true)}
                >
                  <Trash2 size={14} />
                  Remove API Key
                </Button>
              </div>
            ) : (
              <div className="mt-5 space-y-2">
                <label className={labelClass} htmlFor="openAiApiKey">
                  {removeKey
                    ? "Key will be removed on save"
                    : "Add or update API Key"}
                </label>
                {!removeKey && (
                  <Input
                    id="openAiApiKey"
                    name="openAiApiKey"
                    type="password"
                    autoComplete="off"
                    placeholder="sk-..."
                  />
                )}
                {removeKey && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setRemoveKey(false)}
                  >
                    Undo removal
                  </Button>
                )}
                <p className="text-muted text-[10px] leading-4">
                  The full value is never returned to your browser after saving.
                </p>
              </div>
            )}
          </Card>
          <Card className="to-surface bg-gradient-to-br from-[#211916] p-6">
            <p className="text-accent text-xs font-bold tracking-[.16em] uppercase">
              Profile tip
            </p>
            <p className="text-muted mt-3 text-sm leading-6">
              A complete profile makes it easier for your cohort to discover
              your work and collaborate.
            </p>
          </Card>
        </div>
      </div>
      <div className="mt-5 flex justify-end">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? (
            <LoaderCircle size={17} className="animate-spin" />
          ) : (
            <Save size={17} />
          )}
          Save profile
        </Button>
      </div>
    </form>
  );
}
