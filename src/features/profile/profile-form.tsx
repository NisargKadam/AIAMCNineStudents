"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import {
  CircleCheckBig,
  Copy,
  Eye,
  EyeOff,
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
        <Field label="Confirm new password" htmlFor="confirmPassword">
          <Input
            id="confirmPassword"
            name="confirmPassword"
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
  apiKey: storedApiKey,
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
  apiKey: string;
}) {
  const [state, action, pending] = useActionState(updateProfileAction, null);
  const [name, setName] = useState(profile.fullName);
  const [github, setGithub] = useState(profile.githubUsername);
  const [avatar, setAvatar] = useState(profile.avatarUrl);
  const [uploading, setUploading] = useState(false);
  const [apiKey, setApiKey] = useState(storedApiKey);
  const [showApiKey, setShowApiKey] = useState(false);
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

  async function copyApiKey() {
    if (!apiKey) return;
    try {
      await navigator.clipboard.writeText(apiKey);
      toast.success("API key copied.");
    } catch {
      toast.error("Could not copy the API key. Select it and copy manually.");
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
                View, copy, or replace your key anytime. It stays encrypted in
                the database and is only shown on your signed-in profile.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-ink text-xs font-semibold">
                {storedApiKey ? "Saved key" : "Add a key"}
              </p>
              {storedApiKey && !removeKey && (
                <Badge tone="verified">
                  <CircleCheckBig size={12} />
                  Stored
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              <div className="relative min-w-0 flex-1">
                <Input
                  id="openAiApiKey"
                  name="openAiApiKey"
                  form="profile-form"
                  type={showApiKey ? "text" : "password"}
                  autoComplete="off"
                  value={apiKey}
                  onChange={(event) => {
                    setApiKey(event.target.value);
                    setRemoveKey(false);
                  }}
                  className="pr-11 font-mono text-xs"
                  placeholder="sk-..."
                  aria-label="OpenAI API key"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey((shown) => !shown)}
                  className="text-faint hover:text-ink absolute top-1/2 right-3 -translate-y-1/2 rounded p-1 transition-colors"
                  aria-label={showApiKey ? "Hide API key" : "Show API key"}
                >
                  {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                disabled={!apiKey}
                onClick={copyApiKey}
                title="Copy API key"
                aria-label="Copy API key"
              >
                <Copy size={16} />
              </Button>
            </div>
            <p className="text-faint text-[11px] leading-5">
              Edit this value, then click Save profile. Copy uses the current
              value shown here.
            </p>
            {storedApiKey && (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    setApiKey("");
                    setRemoveKey(true);
                  }}
                >
                  <Trash2 size={14} />
                  Remove key
                </Button>
                {removeKey && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setApiKey(storedApiKey);
                      setRemoveKey(false);
                    }}
                  >
                    Undo remove
                  </Button>
                )}
              </div>
            )}
          </div>
        </Card>

        <PasswordCard />
      </div>
    </div>
  );
}
