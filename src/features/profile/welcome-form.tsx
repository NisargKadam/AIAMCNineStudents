"use client";
import { useActionState, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Circle,
  LoaderCircle,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { logoutAction } from "@/features/auth/actions";
import { countries } from "@/lib/countries";
import { gapLabels, profileGaps, type ProfileGap } from "@/lib/profile-gaps";
import { cn, firstName } from "@/lib/utils";
import { completeProfileAction } from "./actions";
import { MemberCard } from "./member-card";
import { PhotoPicker } from "./photo-picker";
import { fillTimezone } from "./timezone";

const required: ProfileGap[] = ["photo", "fullName", "currentRole", "country"];

export function WelcomeForm({
  email,
  alumni,
  badge,
  profile,
}: {
  email: string;
  alumni: boolean;
  badge: string | null;
  profile: {
    fullName: string;
    currentRole: string;
    country: string;
    avatarUrl: string;
    timezone: string;
    linkedinUrl: string;
    githubUsername: string;
    bio: string;
  };
}) {
  const [state, action, pending] = useActionState(completeProfileAction, null);
  // Controlled, so the card on the left fills in live and nothing typed is
  // lost if the server sends the form back.
  const [avatar, setAvatar] = useState(profile.avatarUrl);
  const [name, setName] = useState(profile.fullName);
  const [role, setRole] = useState(profile.currentRole);
  const [country, setCountry] = useState(profile.country);
  const [linkedin, setLinkedin] = useState(profile.linkedinUrl);
  const [github, setGithub] = useState(profile.githubUsername);
  const [bio, setBio] = useState(profile.bio);
  const [photoMissing, setPhotoMissing] = useState(false);
  const timezone = useRef<HTMLInputElement>(null);

  const gaps = profileGaps({
    avatarUrl: avatar,
    fullName: name,
    currentRole: role,
    country,
  });
  const done = required.length - gaps.length;
  const greeting = firstName(profile.fullName || name || "there");

  const checklist = (
    <ul className="flex flex-wrap gap-x-5 gap-y-2">
      {required.map((item) => {
        const met = !gaps.includes(item);
        return (
          <li
            key={item}
            className={cn(
              "flex items-center gap-1.5 text-xs transition-colors duration-200",
              met ? "text-[var(--verified)]" : "text-faint",
            )}
          >
            {met ? <Check size={13} /> : <Circle size={13} />}
            {gapLabels[item]}
            <span className="sr-only">{met ? " (done)" : " (to do)"}</span>
          </li>
        );
      })}
    </ul>
  );

  return (
    <>
      <section className="relative z-10 hidden flex-col justify-between overflow-hidden p-10 lg:flex xl:p-14">
        <Brand href="/welcome" />

        <div className="max-w-lg py-8">
          <p className="text-dim mb-4 flex items-center gap-2.5 text-xs">
            <span className="bg-ember h-3.5 w-[3px] rounded-full" />
            Your member card
          </p>
          <h1 className="font-display text-ink text-[38px] leading-[1.08] font-semibold tracking-[-.035em] text-balance xl:text-[44px]">
            {alumni
              ? "Welcome back. Let the others see who returned."
              : "Put a face to your name."}
          </h1>
          <p className="text-dim mt-5 max-w-md text-sm leading-7">
            {alumni
              ? "This is how you appear in the alumni community. Finish it and the certification exam is yours to take."
              : "Everyone in the portal now has a photo and a short profile, so the community is people rather than initials."}
          </p>

          <MemberCard
            className="mt-10 max-w-[25rem]"
            name={name}
            role={role}
            country={country}
            avatarUrl={avatar}
            badge={badge}
          />
          <div className="mt-8">{checklist}</div>
        </div>

        <p className="text-faint text-xs">
          Built by Nisarg Kadam and Rahul Dusane
        </p>
      </section>

      <section className="relative z-10 flex min-h-svh items-center justify-center px-5 py-12 sm:px-8">
        <div className="w-full max-w-[28rem]">
          <div className="mb-10 lg:hidden">
            <Brand href="/welcome" />
          </div>

          <p className="text-dim num text-xs">
            Step {Math.min(done + 1, required.length)} of {required.length}
            {done === required.length && " — all set"}
          </p>
          <h2 className="font-display text-ink mt-2 text-3xl font-semibold">
            One minute and you are in, {greeting}
          </h2>
          <p className="text-dim mt-2.5 text-sm leading-6">
            Add a photo and three details. You can change any of it later from
            My profile.
          </p>
          <div
            className="mt-5 h-1 overflow-hidden rounded-full bg-[var(--sunken)] ring-1 ring-[var(--line)] ring-inset"
            role="progressbar"
            aria-label="Profile completion"
            aria-valuemin={0}
            aria-valuemax={required.length}
            aria-valuenow={done}
          >
            <div
              className="h-full rounded-full bg-[var(--verified)] transition-[width] duration-500"
              style={{ width: `${(done / required.length) * 100}%` }}
            />
          </div>
          <div className="mt-4 lg:hidden">{checklist}</div>

          <form
            action={action}
            className="mt-7 space-y-5"
            onSubmit={(event) => {
              fillTimezone(timezone.current);
              if (avatar) return;
              event.preventDefault();
              setPhotoMissing(true);
            }}
          >
            <input type="hidden" name="avatarUrl" value={avatar} />
            <input
              ref={timezone}
              type="hidden"
              name="timezone"
              defaultValue={profile.timezone}
            />

            <PhotoPicker
              name={name || email}
              value={avatar}
              invalid={photoMissing}
              onChange={(url) => {
                setAvatar(url);
                setPhotoMissing(false);
              }}
            />

            <Field label="Full name" htmlFor="fullName">
              <Input
                id="fullName"
                name="fullName"
                autoComplete="name"
                required
                minLength={2}
                maxLength={100}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Current role" htmlFor="currentRole">
                <Input
                  id="currentRole"
                  name="currentRole"
                  autoComplete="organization-title"
                  required
                  minLength={2}
                  maxLength={100}
                  value={role}
                  onChange={(event) => setRole(event.target.value)}
                  placeholder="AI Engineer"
                />
              </Field>
              <Field label="Country" htmlFor="country">
                <Input
                  id="country"
                  name="country"
                  list="country-suggestions"
                  autoComplete="country-name"
                  required
                  minLength={2}
                  maxLength={80}
                  value={country}
                  onChange={(event) => setCountry(event.target.value)}
                  placeholder="India"
                />
                <datalist id="country-suggestions">
                  {countries.map((item) => (
                    <option key={item} value={item} />
                  ))}
                </datalist>
              </Field>
            </div>

            <details className="group rounded-2xl border border-[var(--line)] bg-[color-mix(in_oklab,var(--panel)_55%,transparent)]">
              <summary className="text-dim hover:text-ink flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-xs font-semibold transition-colors [&::-webkit-details-marker]:hidden">
                Add LinkedIn, GitHub, or a short bio
                <span className="text-faint flex items-center gap-2 font-normal">
                  Optional
                  <ChevronDown
                    size={14}
                    className="transition-transform group-open:rotate-180"
                  />
                </span>
              </summary>
              <div className="space-y-5 border-t border-[var(--line)] p-4">
                <Field label="LinkedIn" htmlFor="linkedinUrl">
                  <Input
                    id="linkedinUrl"
                    name="linkedinUrl"
                    type="url"
                    value={linkedin}
                    onChange={(event) => setLinkedin(event.target.value)}
                    placeholder="https://linkedin.com/in/you"
                  />
                </Field>
                <Field label="GitHub username" htmlFor="githubUsername">
                  <Input
                    id="githubUsername"
                    name="githubUsername"
                    maxLength={39}
                    value={github}
                    onChange={(event) => setGithub(event.target.value)}
                    placeholder="octocat"
                  />
                </Field>
                <Field
                  label="Short bio"
                  htmlFor="bio"
                  hint="Up to 500 characters."
                >
                  <Textarea
                    id="bio"
                    name="bio"
                    maxLength={500}
                    value={bio}
                    onChange={(event) => setBio(event.target.value)}
                    placeholder="What are you building these days?"
                  />
                </Field>
              </div>
            </details>

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
              {pending ? "Saving" : "Enter the portal"}
            </Button>
          </form>

          <form action={logoutAction} className="mt-6 text-center">
            <p className="text-faint text-[11px]">
              Signed in as {email}.{" "}
              <button
                type="submit"
                className="text-dim hover:text-ink font-semibold underline underline-offset-2"
              >
                Sign out
              </button>
            </p>
          </form>
        </div>
      </section>
    </>
  );
}
