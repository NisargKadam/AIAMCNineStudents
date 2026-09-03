# AI AMC Student Platform

> AI AMC — Agentic AI Masterclass
> Learn to build agents before agents learn to replace you.

![AI AMC Student Platform banner](docs/portal-banner.svg)

The AI AMC Student Platform is a production-minded student community and learning platform. It gives cohort members one workspace for readiness checks, profiles, GitHub assignment submissions, instructor feedback, and peer learning. The Admin Console manages the same canonical data rather than maintaining a disconnected back office.

## Features

- Secure email/password authentication with bcrypt, opaque revocable sessions, HTTP-only cookies, login throttling, and inactive-account enforcement
- Self-service password changes that keep the current browser signed in and revoke every other session
- Database-driven, categorized prerequisite checklist with search, open-only filtering, progress persistence, and configuration-version reconfirmation
- Student profiles with photo upload, a public cohort directory with search, and AES-256-GCM encrypted OpenAI API keys
- Ten seeded, administrator-editable projects with GitHub validation, status filtering, and review lifecycle tracking
- Community feed with text, images, external/GitHub links, likes, comments, bookmarks, saved and authored views, inline editing, ownership controls, pagination, and moderation
- Cohort dashboard built around a three-track progress deck, the build sequence, and a derived attention list surfaced in the header
- Admin Console for analytics, student management, curriculum, reviews, moderation, and a paginated audit log
- Student records that mirror the whole student portal for an administrator: overview, readiness, assignments, community activity, and account history
- Administrators can create, edit, activate, deactivate, promote, demote, set passwords for, delete, and bulk-manage accounts, and export the filtered roster as CSV
- Command palette (`⌘K` / `Ctrl+K`) for keyboard navigation across every page
- Dark and light themes that persist per browser and apply before first paint
- Depth-based interface with a fixed navigation rail, 3D page transitions, pointer-driven parallax on the dashboard deck and directory, keyboard focus states, loading/error/empty states, and mobile drawer navigation
- PostgreSQL migrations, repeatable seed, CI, Docker, Cloudinary storage adapter, and Railway configuration

## Architecture

The application uses Next.js App Router server components for read-heavy screens and small client components for interactive workflows. Server Actions own mutations and always derive the acting user from the secure session; clients never provide an authoritative user ID. Route handlers are limited to health and authenticated image upload.

PostgreSQL is the source of truth. Prisma models users, revocable sessions, profiles, checklist configuration and completion, assignments/submissions, community activity, and audit records. Unique database constraints protect email, student/assignment submissions, likes, bookmarks, and category/order keys.

## Technology stack

- Next.js 16 App Router, React 19, strict TypeScript
- Tailwind CSS 4 design tokens, Radix primitives, Framer Motion, Lucide React, Sonner
- Space Grotesk, IBM Plex Sans, and JetBrains Mono through `next/font`
- React Hook Form-compatible actions and Zod 4 server validation
- Prisma 6 and PostgreSQL 16/17
- bcryptjs password hashing; Node AES-256-GCM field encryption
- Cloudinary in production, local filesystem adapter in development
- Vitest, ESLint, Prettier, GitHub Actions

## Local development

```bash
git clone https://github.com/NisargKadam/AIAMCNineStudents.git
cd AIAMCNineStudents
npm install
cp .env.example .env
docker compose up -d db
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Docker is only needed for the convenient database service; the Next.js development server runs directly with npm.

If Docker is unavailable, install PostgreSQL 16+ locally, create a database/user, and replace `DATABASE_URL` with that connection string before running the same Prisma commands.

## Environment variables

Copy `.env.example`; never commit `.env`.

| Variable                         | Purpose                                                         |
| -------------------------------- | --------------------------------------------------------------- |
| `DATABASE_URL`                   | PostgreSQL connection string                                    |
| `AUTH_SECRET`                    | Authentication secret generated with `openssl rand -base64 32`  |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Initial administrator seeded from the environment               |
| `DEFAULT_STUDENT_PASSWORD`       | Initial password assigned to admin-created students             |
| `FIELD_ENCRYPTION_KEY`           | Exactly 32 random bytes in base64 for AES-256-GCM               |
| `NEXT_PUBLIC_APP_NAME`           | Public product name                                             |
| `APP_URL`                        | Canonical application URL                                       |
| `CLOUDINARY_*`                   | Optional locally; required for durable production image uploads |
| `SEED_DEMO_DATA`                 | Creates a demo student only when exactly `true`                 |

Generate secrets:

```bash
openssl rand -base64 32 # AUTH_SECRET
openssl rand -base64 32 # FIELD_ENCRYPTION_KEY
```

## Database and Prisma commands

```bash
npm run db:generate          # generate the Prisma client
npm run db:migrate           # create/apply a development migration
npm run db:migrate:deploy    # apply checked-in migrations in production
npm run db:seed              # repeatable admin/curriculum seed
```

## Curriculum and roster

The curriculum lives in `prisma/curriculum.ts`: five readiness categories with
twenty checks, and the ten projects (Prompt Skill, LangChain, LangGraph, RAG,
Advanced RAG, Guardrails, MCP, MultiAgent, Memory Management, Deployment).

`npm run db:seed` creates that curriculum on a fresh database and never
overwrites anything an administrator has since edited in the console. When the
curriculum itself changes, apply it authoritatively instead — this renames what
stays, removes checks that are no longer part of it, hides extra projects, and
bumps the checklist version so students reconfirm:

```bash
npm run db:sync-curriculum
railway run npm run db:sync-curriculum      # against the deployed database
```

Create accounts in bulk from a CSV with `name` and `email` columns. Rows without
an email are reported and skipped, and an email that already has an account is
left alone, so the import is safe to re-run:

```bash
npm run db:import-students -- ./roster.csv
railway run npm run db:import-students -- ./roster.csv
```

Roster files hold personal data and are git-ignored. Everyone created signs in
with `DEFAULT_STUDENT_PASSWORD`.

Production deployment uses `prisma migrate deploy`, never `db push`. The first migration lives in `prisma/migrations`.

## Admin setup and student authentication

Set `ADMIN_EMAIL` and a unique 12+ character `ADMIN_PASSWORD`, then run `npm run db:seed`. Public registration does not exist. An administrator creates a student with full name and email from **Admin Console → Students**. The account receives the bcrypt-hashed `DEFAULT_STUDENT_PASSWORD`; the UI never exposes hashes or saved secrets.

Administrators can edit details, set an explicit password, reset to the cohort default, activate/deactivate accounts, promote/demote roles, delete accounts, and apply the same operations to a multi-row selection. The final active administrator cannot be demoted, deactivated, or deleted, and administrators cannot deactivate, demote, or delete themselves. Deleting an account removes its profile, checklist progress, submissions, posts, and comments, and the deletion itself is written to the audit log first so the record survives.

Students change their own password from **My Profile**. The change verifies the current password, keeps the browser they used, and revokes every other session.

## Project structure

```text
src/
  app/                 routes, layouts, errors, health/upload handlers
  components/          design system, shell, command palette, motion primitives
  features/            auth, dashboard, profile, prerequisites, assignments, community, students, admin
  lib/                 database, sessions, encryption, storage, validation, policies, signals
prisma/
  migrations/          production schema history
  schema.prisma        canonical relational model
  curriculum.ts        the readiness checklist and the ten projects
  seed.ts              repeatable curriculum/admin seed
scripts/               curriculum sync and roster import
tests/                 validation, security, and PostgreSQL integration tests
docs/                  deployment operations
```

## Testing and quality

PostgreSQL must be available for integration tests. `vitest.config.mts` reads `.env`, so the same commands work locally and in CI.

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

GitHub Actions provisions PostgreSQL 17 and runs install, client generation, migrations, lint, type checking, all tests, and the production build on pushes and pull requests.

## Security

- Passwords use bcrypt cost 12 in production flows.
- Sessions use random opaque tokens; only SHA-256 token hashes are stored.
- Cookies are HTTP-only, `SameSite=Lax`, path-scoped, and `Secure` in production.
- Next.js Server Actions provide same-origin mutation transport; every action repeats authorization and Zod validation on the server.
- OpenAI API keys are AES-256-GCM encrypted at rest, returned only as a last-four mask, and never logged or audited.
- Ownership rules prevent cross-student profile, submission, post, and comment mutations.
- Community content is rendered as text without arbitrary HTML; external links use `noopener noreferrer`.
- Login attempts are rate limited per forwarded IP/email key.
- Environment files, uploads, build output, and dependency directories are ignored by Git.
- `npm audit --omit=dev` reports zero known vulnerabilities at the time of the latest verification.

## Docker

`docker compose up -d db` starts PostgreSQL for local work. The multi-stage `Dockerfile` builds and runs the complete application, applies production migrations at container startup, respects Railway's `PORT`, and performs health checks through `/api/health`.

## Railway deployment

Follow [docs/RAILWAY_DEPLOYMENT.md](docs/RAILWAY_DEPLOYMENT.md) for PostgreSQL provisioning, environment variables, migrations, seed, health verification, and optional Cloudinary configuration.

## GitHub workflow

Create a focused branch, pull the latest `main`, implement and test, then commit and open a pull request. CI must pass before merge. Never add `.env`, database dumps, `node_modules`, `.next`, or uploaded community assets.

## Creators

**Creator & Co-Founder:** Nisarg Kadam
**Co-Founder:** Rahul Dusane

AI AMC — Agentic AI Masterclass
