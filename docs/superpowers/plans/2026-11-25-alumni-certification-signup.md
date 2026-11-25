# Alumni Certification Sign-up Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Batch 1–10 alumni sign themselves up for a certification-only account (instant for pre-approved emails, instructor-approved otherwise), force every student to add a photo and finish their profile, and let certified students share their certificate to LinkedIn and Instagram with the instructor's tag built in.

**Architecture:** An alumni account is an ordinary `STUDENT` user with `alumniBatch` set and no live batch. Access is enforced by three guards in `src/lib/auth/session.ts` (`requireSignedIn` → `requireUser` adds the profile gate → `requireFullAccess` also turns alumni away), called by every page and action, because the portal layout is not re-run on client navigation. Pending sign-ups and the pre-approved list live in their own tables so no half-users exist and no email address enters the public repository.

**Tech Stack:** Next.js 16.4 App Router (read `node_modules/next/dist/docs/` before writing Next code), React 19, Prisma 6 + PostgreSQL, zod 4, bcryptjs, framer-motion, Tailwind 4, `next/og` for share images, vitest (integration, real database), Playwright.

**Spec:** `docs/superpowers/specs/2026-11-25-alumni-certification-signup-design.md`

## Global Constraints

- The GitHub repository is public: no real email address may appear in any committed file, test, fixture, migration or doc. Tests use `@example.test`.
- Alumni batches are exactly 1–10. `alumniBatch` set ⇒ `batchId` null.
- Password rule for sign-up: at least 12 characters, with a letter and a number (same as `passwordChangeSchema`).
- Required profile fields: `avatarUrl`, `fullName`, `currentRole`, `country`. Administrators are exempt from the profile gate.
- Alumni may reach only `/dashboard` (alumni version), `/exam`, `/community`, `/profile`, `/welcome`, their certificate, and images. Everything else redirects to `/dashboard`; restricted actions do the same.
- A student with an `IN_PROGRESS` exam attempt is never redirected by the profile gate.
- Exam rules do not change. A certificate is issued only for a submitted attempt with `passed` and `score >= 90`.
- Seed code (`prisma/`, `scripts/`) must not import from `src/`.
- Follow the existing "Deck" design system (`src/app/globals.css`, `Card`, `Button`, `Field`, `Tilt`); honour `prefers-reduced-motion`.
- Sign-up rate limit: 10 submissions per hour per IP, every submission counted.
- Work on branch `feat/alumni-signup`; merging to `main` deploys to Railway.

## Review Focus

1. Emails that differ only by capitals or surrounding spaces, and pasted lists separated by spaces instead of commas, are one email — at sign-up, sign-in status, and in the pre-approved list. (Task 1: `parseEmails`; Task 4: sign-up with a mixed-case pre-approved email.)
2. Two sign-ups for the same email at once, or approving a request whose email gained an account meanwhile, end with one account and a clear message, never an exception. (Task 4 and Task 5 tests.)
3. A restricted **server action** called directly by an alumnus is refused, not only the page. (Task 2 tests call the actions.)
4. A photo that is huge, not an image, or cannot be decoded gives a plain message and leaves the previous photo in place; a student can never save a profile with no photo. (Task 6: schema tests + browser test with a large image.)
5. A declined requester who retries sign-up, or signs in, is told they were declined; pasting their email into the pre-approved list does not let them in. (Task 4 and Task 5 tests.)

---

## File map

Create:

- `prisma/migrations/<timestamp>_add_alumni_signup/migration.sql`
- `src/lib/access.ts` — `ALUMNI_BATCHES`, `isAlumni`, `alumniLabel`, `memberBadge`
- `src/lib/profile-gaps.ts` — `ProfileGap`, `profileGaps`, `gapLabels`
- `src/lib/countries.ts` — `countries: string[]`
- `src/features/signup/emails.ts` — `parseEmails`
- `src/features/signup/service.ts` — `createAlumniUser`, `approveRequest`, `signupAllowed`
- `src/features/signup/actions.ts` — `signupAction`
- `src/features/signup/signup-screen.tsx`, `certificate-plate.tsx`
- `src/app/signup/page.tsx`
- `src/features/admin/signup-actions.ts`, `signup-manager.tsx`
- `src/app/(portal)/admin/signups/page.tsx`
- `src/features/profile/avatar-image.ts` — `prepareAvatar`
- `src/features/profile/photo-picker.tsx`, `member-card.tsx`, `welcome-form.tsx`
- `src/app/welcome/page.tsx`
- `src/features/dashboard/alumni-home.tsx`
- `src/features/exam/instructor.ts` — `INSTRUCTOR`, `linkedinPost`, `instagramCaption`, `linkedinComposeUrl`
- `src/features/exam/public-certificate.ts` — `findPublicCertificate`
- `src/features/exam/share-image.tsx` — `certificateShareImage`
- `src/features/exam/share-certificate.tsx`
- `src/app/certificates/[id]/opengraph-image.tsx`
- `src/app/api/exam/certificate/[id]/image/route.ts`
- `tests/access.test.ts`, `tests/alumni-signup.test.ts`, `tests/alumni-access.test.ts`, `tests/browser/alumni.spec.ts`

Modify: `prisma/schema.prisma`, `src/lib/auth/session.ts`, `src/lib/batches.ts`, `src/lib/validation.ts`, `src/lib/signals.ts`, `src/lib/utils.ts`, `src/components/nav-config.ts`, `src/components/app-shell.tsx`, `src/components/command-palette.tsx`, `src/features/auth/actions.ts`, `src/features/auth/login-form.tsx`, `src/app/login/page.tsx`, `src/features/profile/actions.ts`, `src/features/profile/profile-form.tsx`, `src/app/(portal)/profile/page.tsx`, `src/app/api/uploads/route.ts`, `src/app/(portal)/layout.tsx`, every page under `src/app/(portal)/` named in Task 2, `src/features/assignments/actions.ts`, `src/features/prerequisites/actions.ts`, `src/features/exam/actions.ts`, `src/features/exam/certificate-card.tsx`, `src/app/certificates/[id]/page.tsx`, `src/features/community/community-feed.tsx`, `src/features/admin/actions.ts`, `src/features/admin/student-manager.tsx`, the admin pages named in Task 8, `tests/batches.test.ts`, `tests/browser/exam.spec.ts`, `README.md`.

---

### Task 1: Data model and pure helpers

**Files:** `prisma/schema.prisma`, new migration, `src/lib/access.ts`, `src/lib/profile-gaps.ts`, `src/features/signup/emails.ts`, `src/lib/utils.ts`, `tests/access.test.ts`

**Interfaces — Produces:**

```prisma
model User { alumniBatch Int?  /* + @@index([alumniBatch]) */ }
model PreapprovedEmail { email String @id; createdAt DateTime @default(now()) }
enum SignupRequestStatus { PENDING DECLINED }
model SignupRequest {
  id String @id @default(cuid()); email String @unique; fullName String
  alumniBatch Int; passwordHash String; status SignupRequestStatus @default(PENDING)
  createdAt DateTime @default(now()); decidedAt DateTime?
  @@index([status, createdAt])
}
```

```ts
// src/lib/access.ts
export const ALUMNI_BATCHES: readonly number[]; // 1..10
export function isAlumni(user: {
  role: Role;
  alumniBatch: number | null;
}): boolean;
export function alumniLabel(batch: number): string; // "Batch 7 alumni"
/** "Batch 7 alumni", "Batch 11", or null for administrators and unassigned students. */
export function memberBadge(user: {
  role: Role;
  alumniBatch: number | null;
  batch?: { number: number } | null;
}): string | null;

// src/lib/profile-gaps.ts
export type ProfileGap = "photo" | "fullName" | "currentRole" | "country";
export function profileGaps(
  profile:
    | {
        avatarUrl?: string | null;
        fullName?: string | null;
        currentRole?: string | null;
        country?: string | null;
      }
    | null
    | undefined,
): ProfileGap[];

// src/features/signup/emails.ts
export function parseEmails(text: string): {
  emails: string[];
  invalid: string[];
};
```

- [ ] **Step 1: Failing tests in `tests/access.test.ts`**
  - `isAlumni`: STUDENT + `alumniBatch: 7` → true; STUDENT + null → false; ADMIN + 7 → false.
  - `memberBadge`: alumni 7 → `"Batch 7 alumni"`; student in batch 11 → `"Batch 11"`; admin → null.
  - `profileGaps(null)` → all four; whitespace-only `currentRole` counts as a gap; a full profile → `[]`.
  - `parseEmails("A@Example.test, b@example.test c@example.test\n<A@example.test>; nope, x@y")` → `emails: ["a@example.test","b@example.test","c@example.test"]`, `invalid: ["nope","x@y"]`.
  - `ALUMNI_BATCHES` equals `[1,2,3,4,5,6,7,8,9,10]`.
- [ ] **Step 2:** `npx vitest run tests/access.test.ts` → fails (modules missing).
- [ ] **Step 3:** Edit the schema; `npx prisma migrate dev --name add_alumni_signup`; implement the three modules. `parseEmails` splits on commas, semicolons, whitespace and angle brackets, lower-cases, de-duplicates keeping first-seen order, and validates with `z.email()`.
- [ ] **Step 4:** Tests pass; `npm run typecheck`.
- [ ] **Step 5:** Commit `feat: add alumni data model and access helpers` (include the spec and this plan).

### Task 2: Guards — profile gate and alumni boundary

**Files:** `src/lib/auth/session.ts`, `src/app/(portal)/layout.tsx`, pages `sessions`, `materials`, `prerequisites`, `assignments`, `students`, `about`, `exam`; `src/features/assignments/actions.ts`, `src/features/prerequisites/actions.ts`, `src/features/exam/actions.ts`, `src/app/api/uploads/route.ts`, `src/features/profile/actions.ts`, `tests/batches.test.ts`, `tests/alumni-access.test.ts`

**Interfaces — Consumes:** `isAlumni`, `profileGaps`. **Produces:**

```ts
/** Signed in, nothing more. For the layout, /welcome, profile save, uploads, a running exam. */
export async function requireSignedIn(): Promise<CurrentUser>;
/** Signed in and, unless an administrator, profile complete — otherwise redirect("/welcome"). */
export async function requireUser(): Promise<CurrentUser>;
/** requireUser, and alumni are sent to "/dashboard". */
export async function requireFullAccess(): Promise<CurrentUser>;
export async function requireAdmin(): Promise<CurrentUser>; // built on requireSignedIn
```

- [ ] **Step 1: Failing tests in `tests/alumni-access.test.ts`.** Harness: real guards; mock `next/headers` `cookies()` to return a session token created in the database for the acting user, mock `next/navigation` `redirect` to throw `Error("REDIRECT:" + path)`, mock `next/cache`. Fixtures (all `@example.test`): admin, full student in a suite-owned batch with a complete profile, full student with an incomplete profile, alumnus (batch 7) complete, alumnus (batch 3) complete.
  - As the alumnus: rendering `SessionsPage`, `MaterialsPage`, `PrerequisitesPage`, `AssignmentsPage`, `StudentsPage`, `AboutPage` rejects with `REDIRECT:/dashboard`.
  - As the alumnus: `submitAssignmentAction`, the two student actions in `prerequisites/actions.ts` reject with `REDIRECT:/dashboard` and write nothing.
  - As the alumnus: `ExamPage`, `CommunityPage`, `ProfilePage` render; `startExamAction` returns an active attempt.
  - As the incomplete student: `requireUser()` rejects with `REDIRECT:/welcome`; `requireSignedIn()` resolves; admin with an empty profile passes `requireUser()`.
  - Exam exemption: incomplete student with an `IN_PROGRESS` attempt renders `ExamPage` and `saveExamAction` succeeds; with no attempt `ExamPage` rejects with `REDIRECT:/welcome`.
  - `GET /api/files/[id]` for a `SESSION_MATERIAL` as the alumnus → 404.
- [ ] **Step 2:** Run → fail.
- [ ] **Step 3:** Implement the guards. Swap `requireUser` → `requireFullAccess` in the six pages and three actions; add it to `about/page.tsx`. Layout, `/api/uploads`, both profile actions → `requireSignedIn`. Exam page: `requireSignedIn`, load state, then if no active attempt and not admin and gaps exist → `redirect("/welcome")`. `saveExamAction` and `runExampleAction` → `requireSignedIn`; `startExamAction` and `issueCertificateAction` keep `requireUser`.
- [ ] **Step 4:** Update `tests/batches.test.ts` mock to export `requireSignedIn` and `requireFullAccess` and point both at the same acting user as `requireUser`.
- [ ] **Step 5:** `npm test` green; commit `feat: gate the portal on a complete profile and fence alumni`.

### Task 3: Alumni community

**Files:** `src/lib/batches.ts`, `src/app/(portal)/community/page.tsx`, `src/features/community/community-feed.tsx`, `src/features/community/actions.ts` (type only), `src/app/(portal)/admin/community/page.tsx` if it shows batches, `tests/alumni-access.test.ts`

**Interfaces — Produces:** `visiblePeople(viewer: { id: string; role: Role; batchId: string | null; alumniBatch: number | null })`. Feed author shape changes from `batch: number | null` to `badge: string | null`.

- [ ] **Step 1: Failing tests.** Posts by: alumnus-7, alumnus-3, full student, admin. Alumnus-7 rendering `CommunityPage` sees alumnus-7, alumnus-3 and admin posts, not the full student's; the full student sees their own and the admin's, neither alumnus; admin sees all four. `toggleLikeAction` as alumnus-7 on the full student's post returns `{ liked: false }`; on alumnus-3's post likes it. Alumni authors carry `badge: "Batch 3 alumni"` for an alumni viewer.
- [ ] **Step 2:** Run → fail.
- [ ] **Step 3:** In `visiblePeople`, an alumni viewer gets `OR: [{ role: "ADMIN" }, { id }, { role: "STUDENT", alumniBatch: { not: null } }]`; the full-student branch additionally requires `alumniBatch: null`. Page: alumni see badges and the alumni description; admins see `memberBadge` for every student.
- [ ] **Step 4:** Tests pass; commit `feat: give alumni one shared community`.

### Task 4: Public sign-up and sign-in status

**Files:** `src/lib/validation.ts`, `src/features/signup/service.ts`, `src/features/signup/actions.ts`, `src/features/signup/signup-screen.tsx`, `src/features/signup/certificate-plate.tsx`, `src/app/signup/page.tsx`, `src/features/auth/actions.ts`, `src/features/auth/login-form.tsx`, `src/app/login/page.tsx`, `tests/alumni-signup.test.ts`

**Interfaces — Produces:**

```ts
// validation.ts
export const newPassword: z.ZodType<string>; // 12+, letter and number; reused by passwordChangeSchema
export const signupSchema; // { alumniBatch: int 1..10 (coerced), fullName 2..100, email lower-cased, password: newPassword }

// signup/service.ts (server-only)
export async function createAlumniUser(
  tx: Prisma.TransactionClient,
  input: {
    email: string;
    fullName: string;
    alumniBatch: number;
    passwordHash: string;
  },
): Promise<{ id: string }>;
/** Creates the user from a request and deletes the request. Returns "exists" when the email already has an account (the request is deleted). */
export async function approveRequest(
  tx: Prisma.TransactionClient,
  requestId: string,
): Promise<{ userId: string; email: string } | "exists" | "missing">;

// signup/actions.ts
export type SignupState =
  | null
  | { error: string; code?: "exists" | "waiting" | "declined" }
  | { pending: { email: string; fullName: string } };
export async function signupAction(
  _: SignupState,
  formData: FormData,
): Promise<SignupState>; // redirects to /welcome on instant approval
```

- [ ] **Step 1: Failing tests** (mock `next/headers` for `headers()`/`cookies()`, `next/navigation` redirect as in Task 2).
  - Pre-approved, submitted as `"  Mixed.Case@Example.TEST "` → rejects `REDIRECT:/welcome`; user exists with lower-cased email, `alumniBatch: 7`, `batchId: null`, `role: STUDENT`, profile `fullName`; a `Session` row exists; audit row `alumni_signed_up`.
  - Not pre-approved → returns `{ pending }`, a `PENDING` request exists, no user, no session.
  - Email of an existing user → `code: "exists"`, user unchanged (password hash identical).
  - Existing `PENDING` request → `code: "waiting"`; existing `DECLINED` request, even when the email is pre-approved → `code: "declined"`, no user.
  - `alumniBatch` 0, 11, `"x"` → error, nothing written; password `"short1"` → error.
  - Eleventh submission from one IP inside an hour → rate-limit error, nothing written.
  - Two concurrent pre-approved sign-ups for one email → exactly one user; the other returns `code: "exists"`.
  - `loginAction` with a waiting request's email and password → error containing "waiting for approval"; declined → "not approved"; wrong password → "Invalid email or password."
- [ ] **Step 2:** Run → fail.
- [ ] **Step 3:** Implement schema, service and action. Order inside the action: validate → rate limit (`LoginAttempt`, identifier `signup:<ip>`) → existing user → existing request → hash (bcrypt cost 12) → pre-approved? create user + audit + `createSession` + `redirect("/welcome")` : create request + audit `signup_requested`. Unique-violation (`P2002`) maps to `code: "exists"`.
- [ ] **Step 4:** Tests pass.
- [ ] **Step 5:** Build the screen: `/signup` redirects signed-in users to `/dashboard`; same shell as `/login`. `SignupScreen` owns the name state, shows `CertificatePlate` (Tilt, prints the typed name, "Your name" placeholder) beside the form: batch `Select` "Which batch were you in?", full name, email, password with show/hide and a live three-item rule checklist. `code: "exists"` renders Sign in / Forgot password links; `pending` swaps the form for a "Request sent" panel. Add the cross-links on `/login` and `/signup`.
- [ ] **Step 6:** Commit `feat: add alumni sign-up page`.

### Task 5: Sign-up requests admin screen

**Files:** `src/features/admin/signup-actions.ts`, `src/features/admin/signup-manager.tsx`, `src/app/(portal)/admin/signups/page.tsx`, `src/components/nav-config.ts`, `src/lib/signals.ts`, `src/app/(portal)/admin/page.tsx`, `tests/alumni-signup.test.ts`

**Interfaces — Consumes:** `approveRequest`, `parseEmails`. **Produces:**

```ts
type Result = { success: string } | { error: string };
export async function approveSignupAction(id: string): Promise<Result>;
export async function declineSignupAction(id: string): Promise<Result>;
export async function deleteSignupRequestAction(id: string): Promise<Result>;
export async function addPreapprovedEmailsAction(
  text: string,
): Promise<Result & { invalid?: string[] }>;
export async function removePreapprovedEmailAction(
  email: string,
): Promise<Result>;
```

- [ ] **Step 1: Failing tests.** Approve creates the user with the request's hash (the chosen password verifies), deletes the request, audits `signup_approved`. Approve when a user with that email now exists → error, request deleted, user untouched. Decline → `DECLINED` + `decidedAt`; approving a declined request works. `addPreapprovedEmailsAction` with a messy list adds each once, reports already-present and invalid entries, approves a waiting request for a listed email, leaves a declined one declined and names it in the message. Non-admin calling any action is redirected. Admin `loadSignals` includes a signal linking to `/admin/signups` while a request is waiting.
- [ ] **Step 2:** Run → fail.
- [ ] **Step 3:** Implement actions (each `requireAdmin`, transaction, audit, `revalidatePath` for `/admin/signups`, `/admin`, `/admin/students`).
- [ ] **Step 4:** Page reads `?tab=waiting|approved|declined`; `SignupManager` renders the three tabs from the spec ("Waiting", "Pre-approved emails" with paste box, search and Joined / Not yet, "Declined"). Nav item `{ href: "/admin/signups", label: "Sign-up requests" }`; overview callout when requests are waiting.
- [ ] **Step 5:** Tests pass; commit `feat: add sign-up approvals for administrators`.

### Task 6: Welcome step, photo upload, profile rules

**Files:** `src/lib/countries.ts`, `src/lib/validation.ts`, `src/features/profile/avatar-image.ts`, `photo-picker.tsx`, `member-card.tsx`, `welcome-form.tsx`, `src/features/profile/actions.ts`, `src/features/profile/profile-form.tsx`, `src/app/(portal)/profile/page.tsx`, `src/app/welcome/page.tsx`, `tests/access.test.ts`, `tests/alumni-access.test.ts`

**Interfaces — Produces:**

```ts
export const studentProfileSchema; // profileSchema with avatarUrl, fullName, currentRole, country required
export const welcomeSchema; // studentProfileSchema without the API-key fields
export async function completeProfileAction(
  _: unknown,
  formData: FormData,
): Promise<{ error: string } | never>; // redirect("/dashboard")
export async function prepareAvatar(file: File): Promise<File>; // 512×512 centre-cropped JPEG; throws Error with a readable message
export function PhotoPicker(props: {
  name: string;
  email: string;
  value: string;
  onChange(url: string): void;
  allowRemove?: boolean;
}): JSX.Element;
export function MemberCard(props: {
  name: string;
  role: string;
  country: string;
  avatarUrl: string;
  badge: string | null;
}): JSX.Element;
```

- [ ] **Step 1: Failing tests.** `welcomeSchema` rejects a missing photo with "Add a profile photo", missing role, missing country; accepts `/api/files/abc123`. `completeProfileAction` as the incomplete student saves and rejects `REDIRECT:/dashboard`, after which `requireUser()` resolves. `updateProfileAction` as a student with `avatarUrl: ""` returns an error and keeps the old photo; as an admin it still saves.
- [ ] **Step 2:** Run → fail.
- [ ] **Step 3:** Implement schemas, action, `prepareAvatar` (`createImageBitmap` → canvas → `toBlob("image/jpeg", 0.88)`), `PhotoPicker` (click or drop, `accept="image/*"`, uploads to `/api/uploads`, keeps the old value on failure), `MemberCard` (Tilt).
- [ ] **Step 4:** `/welcome`: `requireSignedIn`; admins and complete profiles → `/dashboard`. One screen per the spec sketch: live `MemberCard` with a four-item checklist on the left; photo, name, role, country (`datalist` of `countries`), hidden auto-detected timezone, collapsible optional LinkedIn / GitHub / bio; primary button "Enter the portal"; a sign-out link.
- [ ] **Step 5:** Profile screen: use `PhotoPicker` (no Remove for students), country `datalist`, timezone detected when empty, hide the OpenAI key card for alumni.
- [ ] **Step 6:** Tests pass; commit `feat: require a photo and a complete profile`.

### Task 7: Shell and alumni home

**Files:** `src/components/nav-config.ts`, `src/components/app-shell.tsx`, `src/components/command-palette.tsx`, `src/app/(portal)/layout.tsx`, `src/lib/signals.ts`, `src/features/dashboard/alumni-home.tsx`, `src/app/(portal)/dashboard/page.tsx`, `tests/access.test.ts`, `tests/alumni-access.test.ts`

**Interfaces — Produces:** `navFor(viewer: { role: "ADMIN" | "STUDENT"; alumni: boolean }): NavSection[]`; `ShellUser` gains `alumni: boolean`; `loadSignals(user: { id; role; alumniBatch })`.

- [ ] **Step 1: Failing tests.** `navFor({ role: "STUDENT", alumni: true })` hrefs are exactly `/dashboard`, `/exam`, `/profile`, `/community`; a full student gets no admin items; an admin gets everything. `loadSignals` for an alumnus never links to `/prerequisites` or `/assignments`. `DashboardPage` as the alumnus renders without querying assignments (contains "certification", no "build sequence").
- [ ] **Step 2:** Run → fail.
- [ ] **Step 3:** Implement `navFor` (items carry `alumni?: true`), use it in the shell and palette, show `memberBadge` in the rail. Alumni signals: exam in progress, certificate ready to claim, new replies.
- [ ] **Step 4:** `AlumniHome`: tilting certification card following exam state (not started / in progress / not passed with best score / passed, claim certificate / certified), four latest community posts, `MemberCard` with "Edit profile".
- [ ] **Step 5:** Tests pass; commit `feat: add the alumni home and menu`.

### Task 8: Existing admin screens understand alumni

**Files:** `src/features/admin/actions.ts`, `src/features/admin/student-manager.tsx`, `src/app/(portal)/admin/students/page.tsx`, `src/app/(portal)/admin/students/[id]/page.tsx`, `src/app/(portal)/admin/batches/page.tsx`, `src/app/(portal)/admin/page.tsx`, `src/app/(portal)/admin/exam/page.tsx`, `src/app/(portal)/students/page.tsx`, `tests/alumni-access.test.ts`

- [ ] **Step 1: Failing tests.**
  - `createStudentAction` with an alumnus's email → that user has `alumniBatch: null`, `batchId` = enrolling batch, exam attempts kept; message mentions full access.
  - `updateStudentAction` with a `batchId` for an alumnus → same conversion; without `batchId` → stays alumni.
  - `moveStudentsToBatchAction([alumnus, fullStudent], batch)` moves only the full student; message says 1 alumni account was skipped; only alumni selected → error.
  - `changeStudentRoleAction(alumnusPromotedToAdmin, STUDENT)` → `batchId` stays null, `alumniBatch` kept.
  - `AdminStudentsPage` with `?batch=alumni` lists only alumni; `?batch=none` excludes them. `AdminBatchesPage` unassigned count ignores alumni. `StudentsPage` (directory) as admin excludes alumni.
- [ ] **Step 2:** Run → fail.
- [ ] **Step 3:** Implement; audit conversions as `alumni_upgraded`. Student rows show an "Alumni · Batch N" badge; edit dialog's batch select offers "Alumni — certification only" as the unchanged choice.
- [ ] **Step 4:** Overview counts current students and shows alumni separately; exam console batch column shows `memberBadge` and its filter gains "Alumni"; student record shows the badge.
- [ ] **Step 5:** Tests pass; commit `feat: label alumni across the admin console`.

### Task 9: Share a certificate with the instructor's tag

**Files:** `src/features/exam/instructor.ts`, `public-certificate.ts`, `share-image.tsx`, `share-certificate.tsx`, `certificate-card.tsx`, `src/app/certificates/[id]/page.tsx`, `src/app/certificates/[id]/opengraph-image.tsx`, `src/app/api/exam/certificate/[id]/image/route.ts`, `tests/access.test.ts`

**Interfaces — Produces:**

```ts
export const INSTRUCTOR: {
  name: string;
  linkedinUrl: string;
  instagramHandle: string;
}; // handle without "@"; "" hides Instagram
export function linkedinPost(url: string): string; // contains INSTRUCTOR.name, INSTRUCTOR.linkedinUrl and url
export function linkedinComposeUrl(url: string): string; // https://www.linkedin.com/feed/?shareActive=true&text=…
export function instagramCaption(url: string): string | null; // contains "@" + handle and url; null when no handle
export async function findPublicCertificate(
  id: string,
): Promise<{ id: string; name: string; issuedAt: Date } | null>;
export async function certificateShareImage(
  certificate: { id: string; name: string; issuedAt: Date },
  shape: "wide" | "square",
): Promise<ImageResponse>; // 1200×630, 1080×1080
```

- [ ] **Step 1: Failing tests.** `linkedinPost(url)` includes the instructor's name, LinkedIn URL and `url`; `linkedinComposeUrl` round-trips that text through `URLSearchParams`; `instagramCaption` includes `@handle` when set and is null when the handle is empty.
- [ ] **Step 2:** Run → fail; implement `instructor.ts`; pass.
- [ ] **Step 3:** `findPublicCertificate` holds the lookup now inlined in the certificate page (active user, submitted, passed, score ≥ 90); the page uses it. `certificateShareImage` renders the certificate (cream ground, gold rule, name in Noto Sans, signature in Great Vibes, fonts read from `public/fonts`) with a footer line carrying the instructor's name, `@handle` when set, and the LinkedIn path. `opengraph-image.tsx` returns the wide image; the route returns `?shape=square|wide`, `Content-Type: image/png`, attachment when `?download=1`, 404 for an unknown id.
- [ ] **Step 4:** `ShareCertificate` replaces the "Share achievement" button: **Share on LinkedIn** copies `linkedinPost` and opens `linkedinComposeUrl` in a new tab, with the hint to type `@` and pick the instructor; **Share on Instagram** (only when a handle is set) copies the caption synchronously, then shares the pre-fetched square image through `navigator.share` when `canShare({ files })`, otherwise downloads it; the caption is shown read-only. "Add to LinkedIn" (profile) and "Download PDF" stay.
- [ ] **Step 5:** `npm run typecheck`, tests pass; commit `feat: share certificates to LinkedIn and Instagram`.

### Task 10: Browser tests, verification, release

**Files:** `tests/browser/alumni.spec.ts`, `tests/browser/exam.spec.ts`, `README.md`

- [ ] **Step 1:** Give the fixtures in `exam.spec.ts` a complete profile so the gate does not redirect them; assert the share buttons and that `/certificates/<id>/opengraph-image` and `/api/exam/certificate/<id>/image?shape=square` answer `image/png`.
- [ ] **Step 2:** `alumni.spec.ts`:
  - Pre-approved sign-up → lands on `/welcome` → upload a photo (a generated 3000×2000 PNG), fill role and country → alumni home; the menu shows exactly Dashboard, Exam, My profile, Community; visiting `/sessions` ends on `/dashboard`.
  - Unknown email sign-up → "Request sent"; signing in says waiting; admin approves on `/admin/signups`; signing in now reaches `/welcome`.
  - Phone viewport (390×844): sign-up and welcome have no horizontal scroll.
- [ ] **Step 3:** `npm run lint && npm run typecheck && npm test && npm run build && npm run test:e2e` all green.
- [ ] **Step 4:** Run the app, look at `/signup`, `/welcome`, alumni home, `/admin/signups` and the share area in dark and light themes at desktop and phone widths; fix what looks wrong.
- [ ] **Step 5:** README: a short "Alumni sign-up" section (how approval works, where the pre-approved list is pasted, where the instructor's handles are set). Commit.
- [ ] **Step 6:** Whole-branch review by a fresh reviewer; fix findings.
- [ ] **Step 7:** Push the branch, open a pull request, wait for CI, merge to `main`, confirm the Railway deploy is healthy.
