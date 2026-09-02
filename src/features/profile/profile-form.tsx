"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import {
  CircleCheckBig,
  ExternalLink,
  Code2,
  ImagePlus,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  Save,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { changeOwnPasswordAction, updateProfileAction } from "./actions";
import { Field, Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/avatar";

function PasswordCard() {
  const [state, action, pending] = useActionState(
    changeOwnPasswordAction,
    null,
  );
  useEffect(() => {
    if (state?.success) toast.success(state.success);
    if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="text-dim grid size-10 shrink-0 place-items-center rounded-xl border border-[var(--line)] bg-[var(--sunken)]">
          <LockKeyhole size={18} />
        </span>
        <div>
          <h2 className="font-display text-ink text-base font-semibold">
            Password
          </h2>
          <p className="text-dim mt-1 text-xs leading-5">
            Changing it signs you out everywhere else.
          </p>
        </div>
      </div>
      <form action={action} className="mt-5 space-y-4">
        <Field label="Current password" htmlFor="currentPassword">
          <Input
            id="currentPassword"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
          />
        </Field>
        <Field
          label="New password"
          htmlFor="newPassword"
          hint="At least 12 characters, with a letter and a number."
        >
          <Input
            id="newPassword"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            minLength={12}
            required
          />
        </Field>
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending && <LoaderCircle size={15} className="animate-spin" />}
          Change password
        </Button>
      </form>
    </Card>
  );
}

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
  const [name, setName] = useState(profile.fullName);
  const [github, setGithub] = useState(profile.githubUsername);
  const [avatar, setAvatar] = useState(profile.avatarUrl);
  const [uploading, setUploading] = useState(false);
  const [removeKey, setRemoveKey] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state?.success) toast.success(state.success);
    if (state?.error) toast.error(state.error);
  }, [state]);

  async function upload(file: File) {
    setUploading(true);
    const data = new FormData();
    data.set("file", file);
    try {
      const response = await fetch("/api/uploads", {
        method: "POST",
        body: data,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Upload failed.");
      setAvatar(result.url);
      toast.success("Photo ready. Save your profile to keep it.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "That image could not be used.",
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
      <form id="profile-form" action={action} className="space-y-4">
        <input type="hidden" name="removeApiKey" value={String(removeKey)} />
        <input type="hidden" name="avatarUrl" value={avatar} />

        <Card className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-5">
            <Avatar name={name || email} url={avatar} size="xl" />
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-ink text-base font-semibold">
                {name || "Your name"}
              </h2>
              <p className="text-faint mt-1 text-xs">{email}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void upload(file);
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                >
                  {uploading ? (
                    <LoaderCircle size={14} className="animate-spin" />
                  ) : (
                    <ImagePlus size={14} />
                  )}
                  {avatar ? "Replace photo" : "Upload photo"}
                </Button>
                {avatar && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setAvatar("")}
                  >
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <h2 className="font-display text-ink text-base font-semibold">
            About you
          </h2>
          <p className="text-dim mt-1 text-xs">
            This is what the cohort directory shows.
          </p>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <Field label="Full name" htmlFor="fullName">
              <Input
                id="fullName"
                name="fullName"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </Field>
            <Field
              label="Email"
              htmlFor="email"
              hint="An administrator changes your sign-in email."
            >
              <Input id="email" value={email} disabled />
            </Field>
            <Field
              label="GitHub username"
              htmlFor="githubUsername"
              hint={
                github ? (
                  <a
                    href={`https://github.com/${github}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-ember inline-flex items-center gap-1 hover:underline"
                  >
                    github.com/{github}
                    <ExternalLink size={10} />
                  </a>
                ) : undefined
              }
            >
              <div className="relative">
                <Code2
                  size={15}
                  className="text-faint absolute top-1/2 left-3.5 -translate-y-1/2"
                />
                <Input
                  id="githubUsername"
                  name="githubUsername"
                  value={github}
                  onChange={(event) => setGithub(event.target.value)}
                  className="pl-10"
                  placeholder="octocat"
                />
              </div>
            </Field>
            <Field label="Current role" htmlFor="currentRole">
              <Input
                id="currentRole"
                name="currentRole"
                defaultValue={profile.currentRole}
                placeholder="Software engineer"
              />
            </Field>
            <Field label="LinkedIn" htmlFor="linkedinUrl">
              <Input
                id="linkedinUrl"
                name="linkedinUrl"
                type="url"
                defaultValue={profile.linkedinUrl}
                placeholder="https://linkedin.com/in/you"
              />
            </Field>
            <Field label="Country" htmlFor="country">
              <Input
                id="country"
                name="country"
                defaultValue={profile.country}
                placeholder="Singapore"
              />
            </Field>
            <Field label="Timezone" htmlFor="timezone">
              <Input
                id="timezone"
                name="timezone"
                defaultValue={profile.timezone}
                placeholder="Asia/Singapore"
              />
            </Field>
            <Field
              label="Short bio"
              htmlFor="bio"
              className="sm:col-span-2"
              hint="Up to 500 characters."
            >
              <Textarea
                id="bio"
                name="bio"
                defaultValue={profile.bio}
                maxLength={500}
                placeholder="What are you building, and what would you like help with?"
              />
            </Field>
          </div>
        </Card>

        <div className="flex justify-end">
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

      <div className="space-y-4">
        <Card className="p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-[color-mix(in_oklab,var(--verified)_30%,transparent)] bg-[color-mix(in_oklab,var(--verified)_10%,transparent)] text-[var(--verified)]">
              <KeyRound size={18} />
            </span>
            <div>
              <h2 className="font-display text-ink text-base font-semibold">
                OpenAI API key
              </h2>
              <p className="text-dim mt-1 text-xs leading-5">
                Encrypted at rest with AES-256-GCM. It is never shown again
                after you save it.
              </p>
            </div>
          </div>

          {maskedKey && !removeKey ? (
            <div className="mt-5 rounded-xl border border-[color-mix(in_oklab,var(--verified)_25%,transparent)] bg-[color-mix(in_oklab,var(--verified)_8%,transparent)] p-4">
              <Badge tone="verified">
                <CircleCheckBig size={12} />
                Stored
              </Badge>
              <code className="text-dim mt-3 block font-mono text-xs break-all">
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
                Remove key
              </Button>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {removeKey ? (
                <>
                  <p className="text-dim text-xs leading-5">
                    The key will be deleted when you save your profile.
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setRemoveKey(false)}
                  >
                    Keep the key
                  </Button>
                </>
              ) : (
                <Field
                  label="Add a key"
                  htmlFor="openAiApiKey"
                  hint="Saved with the profile form on the left."
                >
                  <Input
                    id="openAiApiKey"
                    name="openAiApiKey"
                    form="profile-form"
                    type="password"
                    autoComplete="off"
                    placeholder="sk-..."
                  />
                </Field>
              )}
            </div>
          )}
        </Card>

        <PasswordCard />
      </div>
    </div>
  );
}
