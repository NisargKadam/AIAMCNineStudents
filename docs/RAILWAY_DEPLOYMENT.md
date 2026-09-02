# Railway deployment

This repository is prepared for Railway with PostgreSQL, a multi-stage Dockerfile, health checks, Prisma migrations, and environment-only configuration.

## 1. Create the project

Create a new Railway project and choose **Deploy from GitHub repo**. Select `NisargKadam/AIAMCNineStudents` after granting Railway access.

## 2. Add PostgreSQL

Choose **New → Database → PostgreSQL**. Railway exposes `DATABASE_URL`; reference that variable from the web service rather than copying a value into source control.

## 3. Configure the web service

The checked-in `railway.toml` selects the `Dockerfile`. The container starts with `npm run railway:start`, which runs `prisma migrate deploy` before `next start`. The health check is `/api/health`.

Set these variables on the web service:

```text
DATABASE_URL=${{Postgres.DATABASE_URL}}
AUTH_SECRET=<random base64 value>
FIELD_ENCRYPTION_KEY=<random base64 32-byte value>
ADMIN_EMAIL=<initial admin email>
ADMIN_PASSWORD=<strong unique initial admin password>
DEFAULT_STUDENT_PASSWORD=<cohort initial password>
NEXT_PUBLIC_APP_NAME=AI AMC Nine
APP_URL=https://<your-railway-domain>
SEED_DEMO_DATA=false
```

Generate the two cryptographic secrets locally:

```bash
openssl rand -base64 32
openssl rand -base64 32
```

`FIELD_ENCRYPTION_KEY` must decode to exactly 32 bytes. Preserve it in a secure password manager: changing it makes existing encrypted API keys unreadable.

## 4. Deploy and migrate

Deploy the service. Startup applies checked-in migrations using `prisma migrate deploy`; production never uses `prisma db push`. Confirm the Railway deploy log reports that migrations are current.

## 5. Seed the initial administrator

Open the web service shell once and run:

```bash
npm run db:seed
```

The repeatable seed upserts the configured admin, all prerequisite data, and ten assignments. Demo students are created only when `SEED_DEMO_DATA=true`; leave it false in production.

## 6. Verify

Open `/api/health` and expect `{"status":"ok"}`. Sign in with `ADMIN_EMAIL` and `ADMIN_PASSWORD`, open Admin Console, create a student, and verify the student can sign in using their registered email and `DEFAULT_STUDENT_PASSWORD`.

## 7. Optional Cloudinary uploads

Community images require durable object storage in production. Create a Cloudinary account and set:

```text
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

Without all three variables, production image upload requests fail safely; text and link posts continue to work. Local development falls back to `public/uploads`.

## Operational notes

- Back up PostgreSQL before destructive schema changes.
- Rotate `AUTH_SECRET` only when intentionally invalidating sessions.
- Do not rotate `FIELD_ENCRYPTION_KEY` without first re-encrypting saved fields.
- Reset an admin password by updating `ADMIN_PASSWORD` and re-running the seed.
- Railway supplies `PORT`; Next.js reads it automatically.
