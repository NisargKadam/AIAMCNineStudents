# Alumni certification sign-up — design

Date: 2026-11-25
Status: approved 2026-11-25, with the sharing section added at approval

## Intent

Students from the batches that ran before this portal existed (Batches 1–10)
should be able to come back, take the certification exam, and earn the same
verified certificate current students get. They need a way in that does not
involve the instructor creating 80+ accounts by hand, and once in they should
see only what is meant for them.

While doing this, every student — returning and current — is asked for a
profile photo and a complete profile, so the community stops being a wall of
initials.

## Goals

1. A public **Sign up** page: batch (dropdown, Batch 1–10), full name, email,
   a password they choose.
2. Emails on the instructor's pre-approved list get in immediately. Any other
   email creates a request the instructor approves or declines.
3. An admin screen to approve requests and manage the pre-approved list.
4. Alumni accounts can open only: Exam, Community (read, post, comment, like,
   save), and their own profile. Nothing else, on the server as well as in
   the menu.
5. Everyone except administrators must add a photo and finish their profile
   before using the portal.
6. The new screens feel as finished as the rest of the portal, with a small
   number of 3D touches that mean something.
7. Once certified, a student can share the certificate to LinkedIn and
   Instagram, and every share carries the instructor's tag.

## Non-goals

- Sending email (verification, "you're approved" notices, password reset by
  email). The portal has no mail system today and this does not add one.
- A dedicated "upgrade to full student" button. An alumnus becomes a full
  student only when the instructor explicitly enrols them in a live batch
  (see "Existing admin screens").
- Changing how the exam works. It already allows unlimited attempts until the
  student passes; after a pass it locks and the certificate unlocks. That
  stays.
- Redesigning existing screens. The portal already has a consistent look
  ("Deck": layered panels, pointer tilt, perspective transitions); new work
  follows it.

## Anti-goals

- The email list must never appear in this repository. **The GitHub repo is
  public**, so committing 80+ personal email addresses would publish them.
- An alumni account must never reach sessions, recordings, materials,
  assignments, the readiness checklist, or the student directory — by menu,
  by typing a URL, or by calling an action directly.
- A current student in the middle of a timed exam must never be interrupted by
  the new "complete your profile" step.
- Current students' batch communities must not change.

## Constraints found in the code

- Next.js 16.4 App Router, Prisma + PostgreSQL, own cookie sessions
  (`src/lib/auth/session.ts`), server actions, zod validation, vitest
  integration tests against a real database, Playwright for browser tests.
  Read `node_modules/next/dist/docs/` before writing Next code (AGENTS.md).
- Pushing to `main` deploys to Railway, which runs `prisma migrate deploy`
  and the seed on start. Seed code cannot import from `src/`.
- Only Batch 9 and Batch 11 exist as `Batch` rows. A `Batch` owns a live
  session schedule, and every admin screen lists batches as tabs.
- Every portal page and action calls `requireUser()` itself. The shared
  layout is not re-run on client navigation, so access rules have to be
  enforced per page and per action, not in the layout.
- Uploaded images are stored in PostgreSQL (`StoredFile`), 5 MB limit, served
  from `/api/files/[id]`.
- The community is already per batch through one function, `visiblePeople()`
  in `src/lib/batches.ts`.

## Approaches

**How an alumni account is represented**

1. *Real `Batch` rows for 1–10 plus an access flag.* Batch badges and filters
   work for free, but nine empty batches appear in every admin batch picker
   (students, sessions, materials, exam), the startup seed would add session
   slots to each of them, and Batch 9 would mix current students with alumni
   in the same directory and feed unless every query is patched.
2. *A plain number on the user: `alumniBatch` (1–10), with no live batch.*
   **Chosen.** For alumni the batch is a label, not a schedule. The `Batch`
   table keeps meaning "an intake this portal runs". One rule covers access:
   `alumniBatch` is set ⇒ certification-only.
3. *A new `ALUMNI` role.* Rejected: about twenty places check
   `role === "STUDENT"` (exam, certificates, community, admin lists), and all
   of them would need to learn the new role.

**Where the pre-approved emails live**

1. *In the code or a migration.* Rejected: the repo is public.
2. *An environment variable on Railway.* Works, but every change is a
   redeploy and the instructor cannot see who has joined.
3. *A database table managed from the admin screen.* **Chosen.** The
   instructor pastes the list once, can add or remove people later, and sees
   who has signed up. Nothing personal goes into git.

**Where pending sign-ups live**

1. *Inactive `User` rows.* Rejected: half-created users would leak into
   student counts, lists and exports.
2. *A separate `SignupRequest` table; the user is created on approval.*
   **Chosen.**

## Design

### Data

One migration.

- `User.alumniBatch Int?` — the batch a returning student says they studied
  in (1–10). Set only by sign-up/approval. Alumni always have `batchId` null.
- `PreapprovedEmail { email (id, lower-cased), createdAt }`.
- `SignupRequest { id, email (unique, lower-cased), fullName, alumniBatch,
  passwordHash, status PENDING | DECLINED, createdAt, decidedAt }`.
  Approving creates the user and deletes the request (the audit log keeps the
  history). Declining keeps the row so the person gets a clear answer and
  cannot re-submit; the instructor can still approve or delete it later.

Helper `isAlumni(user)`: `role === "STUDENT" && alumniBatch !== null`.

### Sign up (`/signup`, public)

```
┌──────────────────────────────┬──────────────────────────────────┐
│  [brand]                     │  Come back for your certificate  │
│                              │                                  │
│   ╔════════════════════╗     │  Which batch were you in?        │
│   ║  CERTIFICATE       ║     │  [ Batch 7              ▾ ]      │
│   ║  Priya Sharma      ║ ←   │  Full name                       │
│   ║  AI & LLM Expert   ║ 3D  │  [ Priya Sharma           ]      │
│   ╚════════════════════╝     │  Email                           │
│   tilts with the pointer;    │  [ you@example.com        ]      │
│   prints the name as typed   │  Password                  [👁]  │
│                              │  ✓ 12+ characters ✓ letter ○ no. │
│                              │  [   Create my account   →  ]    │
│                              │  Already have an account? Sign in│
└──────────────────────────────┴──────────────────────────────────┘
```

- Same two-column layout as the sign-in page; the form is the whole screen on
  a phone.
- The left side is a certificate plate that tilts with the pointer and shows
  the name being typed. It is the thing they came for, so the depth carries
  meaning.
- Password rule matches the portal's existing rule: at least 12 characters
  with a letter and a number. A live checklist shows which parts are met; a
  show/hide button replaces a second "confirm" field.
- On submit:
  - **Email already has an account** → "You already have an account" with
    Sign in and Forgot password links. The existing account is untouched.
  - **Email is pre-approved** → account created (`alumniBatch` set), signed
    in, sent straight to the profile step.
  - **Email is not pre-approved** → a request is saved and the card turns
    into a "Request sent" confirmation: the instructor will review it, and
    once approved they sign in with the password they just chose.
  - **A request already exists** → says it is still waiting (or was declined).
- Sign-in page gets a "Former student? Sign up for your certificate" link.
  Signing in with the email and password of a waiting or declined request
  says so plainly instead of "invalid email or password".
- Protection: server-side validation, batch must be 1–10, emails compared
  lower-cased, and a limit of 10 sign-up submissions per hour per IP address,
  counting every submission (stored the same way as the sign-in limiter).

### Approving (`/admin/signups`, administrators)

New "Sign-up requests" item in the admin menu, with three tabs:

- **Waiting** — name, email, batch, how long ago; Approve / Decline.
- **Pre-approved emails** — a box that accepts a pasted list in any shape
  (commas, spaces, new lines, mixed capitals, duplicates) and adds the clean
  result; the list below shows each email as "Joined" or "Not yet", with
  search and remove. Adding an email that already has a waiting request
  approves that request. An email that was declined earlier stays declined:
  the paste result names it and points to the Declined tab, because the
  declined request carries a password chosen by whoever submitted it.
- **Declined** — Approve anyway / Delete.

The instructor finds out about new requests through the existing bell menu
("2 sign-up requests waiting") and a notice on the admin overview. Every
approve, decline, list change and sign-up is written to the audit log.

### What alumni can open

| Area | Alumni |
| --- | --- |
| Home (`/dashboard`) | An alumni version: certification status, latest community posts, their card |
| Exam, certificate | Yes, unchanged rules |
| Community | Yes — the alumni community (below) |
| My profile | Yes |
| Sessions, Materials, Prerequisites, Assignments, Students, About | No — hidden from the menu and the ⌘K palette; the URL sends them home; the matching actions refuse |
| Session materials download | No (already tied to a live batch) |

Enforcement is a second guard next to `requireUser()`, used by every
full-student page and action. The menu and palette are filtered from the same
flag.

The alumni home shows one tilting certification card whose content follows
their state (not started → start; in progress → resume; not passed → best
score and try again; passed → claim certificate; certified → view/download),
the four latest community posts, and their profile card.

### Alumni community

One shared feed for all alumni, whichever batch they pick, plus the
instructors — the choice made in conversation. Concretely, in
`visiblePeople()`: an alumnus sees posts and comments by alumni and
administrators. A current student still sees only their own live batch and
administrators, so current batch feeds do not change and do not show alumni.
Administrators see everything. Each author shows a "Batch 7 alumni" chip so
people can recognise their own batch.

### Photo and profile for everyone

"Complete" means four things: **photo, full name, current role, country**.
LinkedIn, GitHub, timezone and bio stay optional. Administrators are exempt.

- `requireUser()` sends any signed-in non-admin with an incomplete profile to
  `/welcome`. A new unguarded variant is used by the welcome screen, the
  profile save, photo upload, the portal layout, and the exam page and its
  save/run actions.
- A student with an exam in progress is not redirected: the exam page and the
  save/run actions skip the check while an attempt is running. Once that
  attempt is submitted the check applies again, so in that one case they
  finish their profile before seeing the score.
- After this, the profile screen no longer lets a student remove their photo
  or blank a required field (they can replace them).

`/welcome` is one focused screen, not a multi-step wizard — four required
things do not justify page-by-page clicking:

```
┌───────────────────────────────┬─────────────────────────────────┐
│   ╭───────────────────────╮   │ One minute and you're in        │
│   │  (photo)  Priya Sharma│   │ ┌─────────────────────────────┐ │
│   │  ML Engineer · India  │ 3D│ │  Drop a photo here or browse │ │
│   │  [Batch 7 alumni]     │   │ └─────────────────────────────┘ │
│   ╰───────────────────────╯   │ Full name   [ Priya Sharma    ] │
│   live card, tilts, fills in  │ Current role[ ML Engineer     ] │
│   as they type                │ Country     [ India        ▾  ] │
│   ● photo ● name ○ role ○ …   │ + LinkedIn, GitHub, bio (opt.)  │
│                               │ [      Enter the portal  →    ] │
└───────────────────────────────┴─────────────────────────────────┘
```

- Whatever is already known is pre-filled, so most current students only add
  a photo and one or two fields.
- Photos can be dropped or picked. The browser crops them square and shrinks
  them to 512 px before upload, so a 9 MB phone photo works, uploads are
  instant, and the database stores ~60 KB instead of megabytes.
- Timezone is detected from the browser when empty. Country offers
  suggestions while typing but accepts free text.
- The same photo control and the same suggestions replace the ones on the
  existing profile screen.

### Existing admin screens

Alumni are students without a live batch, so the places that treat "no batch"
as a problem are taught the difference:

- Manage students: an **Alumni** tab; alumni show an "Alumni · Batch 7" badge
  instead of the "No batch" warning and are not counted under "No batch".
- Enrolling an alumnus in a live batch one at a time — **Add student** with
  their email, or **Edit student** and pick a batch — makes them a full
  student of that batch: `alumniBatch` is cleared, and their exam attempts
  and certificate stay. Add student replaces their password, as it already
  does for any returning student. The result message says they now have full
  access. The bulk "Move to batch" skips alumni and says how many it skipped,
  so selecting everyone cannot upgrade people by accident.
- An administrator demoted to student who was an alumnus goes back to being
  an alumnus instead of joining the enrolling batch.
- Batches: the "students are not in any batch" warning ignores alumni.
- Overview: student figures count current students; alumni are shown as a
  separate number, next to the sign-up notice.
- Exam console: batch column and filter understand alumni.
- Student record and community moderation: show the alumni badge.

### Sharing a certificate (added at approval)

The certificate is still earned only by passing the exam (90% or more); no
other path issues one. Once it is issued, the certificate card gets a
**Share** area for LinkedIn and Instagram.

Neither platform lets a website create a real @-mention or publish on the
person's behalf, so "the tag is mandatory" is built as: the tag is part of
everything the portal hands over.

- **A share image** of the certificate, generated on the server as a PNG in
  two shapes: wide (link previews) and square (feeds). The instructor's name
  and handle are printed on the image itself, so it cannot be posted without
  them. The wide one is the public certificate page's preview image, so any
  link to a certificate shows it.
- **LinkedIn** — opens LinkedIn's post composer with the text already
  written: the achievement, the instructor's name and LinkedIn profile, the
  verification link (LinkedIn turns it into a preview card showing the
  certificate), and hashtags. The same text is copied to the clipboard in
  case LinkedIn drops it. A one-line hint tells them to type `@` before the
  instructor's name and pick him, which is the only way LinkedIn makes a
  clickable tag. "Add to LinkedIn profile" stays as it is.
- **Instagram** — on a phone, the system share sheet opens with the square
  image attached, ready to send to Instagram; on a computer the image is
  downloaded. In both cases the caption — which contains the instructor's
  `@handle`, and Instagram turns a pasted `@handle` into a real tag — is
  copied in the same tap. The caption is shown read-only.
- The instructor's LinkedIn URL and Instagram handle live in one small
  settings file. If the Instagram handle is empty, the Instagram button is
  not shown, so nothing can be shared there without the tag.

## Decisions made on the instructor's behalf

These were not specified; each is a call that can be reversed.

1. The email list is stored in the database and pasted in by the instructor,
   because the repo is public. A cleaned, de-duplicated copy of the list from
   the request is saved to `.private/alumni-emails.txt` (git-ignored) to paste
   after the first deploy.
2. A pre-approved email gets in with no proof that the person owns that
   mailbox, because there is no email system. Someone who knows a classmate's
   email could sign up as them. The instructor sees every sign-up in the
   pre-approved list and audit log and can deactivate an account.
3. Required profile fields are photo, name, current role and country.
4. Administrators are not forced through the profile step.
5. Alumni cannot see the student directory or the About page (the request
   said two things only: exam and community, plus their own profile).
6. Current students do not see alumni posts, and alumni do not see current
   students' posts; instructors' posts reach both.
7. Declined requests are kept (and can be approved later) rather than deleted.
8. Enrolling an alumnus in a live batch one at a time upgrades them to a full
   student; bulk moves never do.
9. A declined request stays declined even if that email is later pasted into
   the pre-approved list; the instructor approves it from the Declined tab.
10. Sign-up tells a person when their email already has an account. That
   reveals an account exists, which the sign-in page avoids; here the clearer
   message was judged worth it for a small invited group.

## Left to the builder

- File and component layout, names of the two guard functions, exact copy.
- Whether the certificate plate reuses the existing certificate component or
  is a lighter stand-in.
- Tests: guard coverage for every restricted page and action as an alumnus;
  `visiblePeople()` for alumni, current students and administrators; sign-up
  outcomes (pre-approved, pending, duplicate, declined, rate limit);
  approve/decline/paste parsing; profile gate including the in-progress exam
  exemption; one browser test of sign-up → profile → exam and of approval.
- Work happens on a branch. Nothing is pushed or merged — and so nothing
  reaches the live site — until the instructor says so.
