# Certification exam

Students open **Exam** (`/exam`). The assessment has 40 MCQs, two Python code
repairs, one Python coding problem, and two sequence questions: 45 questions,
100 points, 150 uninterrupted minutes. Every attempt shuffles questions, MCQ
choices, and sequence cards. Scores of 90–100 pass. Failed students may retry;
passing closes further attempts and unlocks certificate issuance.

## Private assessment configuration

This repository is public. Real course questions, answer keys, reference
implementations, and hidden tests must **never** be committed here, including in
tests, deployment scripts, documentation, screenshots, or a seed. The real bank
is supplied through the server-only `EXAM_BANK_BASE64` runtime variable. Both
plain JSON and gzip-compressed JSON are accepted before base64 encoding. Use
gzip for Railway's variable size limit. Base64
is an encoding; protect the variable as a secret. Docker excludes environment
files and `.private/`, and Git ignores both.

The original bank is also stored locally in `.private/exam-bank.v1.json` in the
author's workspace. Back it up privately. Railway retains the runtime variable
across deployments. It contains a JSON object with `version` and `questions`;
the runtime validates the 40/2/1/2 composition, grading contracts, and 100-point
total. The version is `aiamc-2026-v1`. Preserve this exact definition while
attempts and certificates depend on it. Do not replace it in place with another
exam; future assessments need explicit versioning and archived definitions.

To provide the configuration to a new environment, encode the private JSON and
pass it directly to the platform's secret storage. Do not print, commit, or send
it to browser code. No additional third-party grading service or API key is
required. `APP_URL` must be the canonical HTTPS portal URL for certificate links.

`npm run exam:validate` checks the real private configuration locally: reference
solutions against hidden cases and public examples, scoring boundaries, and
student DTO privacy. It reports aggregate results without printing questions or
answers. This command needs the real runtime variable (the local `.env` is
loaded automatically).

Automated Vitest tests always use `tests/exam-fixture.ts`, a clearly fictional
bank with different IDs and examples. The Playwright-managed server also uses
that fixture; when reusing an existing local server it tests that server's bank
using only its public question interface. Neither test suite contains course
answers. Run `npm test`, `npm run test:e2e`, lint, typecheck, and build as usual.

## Timing, storage, and scoring

The database stores each attempt's start, immutable deadline, shuffled layout,
answers, final result, and section totals. A per-student transaction lock and a
partial unique index prevent duplicate active attempts. Saves derive ownership
from the authenticated session and merge changes atomically. Browser time is
only a display; the server decides whether a save arrived before the deadline.

The client autosaves approximately every second while connected, keeps unsaved
drafts in session storage when available, and synchronizes time periodically
and on reconnect/focus. A refresh or sign-out never resets the deadline. After
expiry, new answers are ignored and the last server-saved answers are graded.
An abandoned attempt finalizes on the next student interaction or when an admin
opens exam results. This is lazy finalization, not a background cron job. No
extra time is granted while finalization waits.

MCQs earn one point each. Each repair has five hidden cases worth two points
each; the coding problem has ten worth three each. Sequence tasks earn one
point per correctly placed step. There is no negative marking. Python is the
supported built-in-only subset provided by Skulpt inside a QuickJS WASM guest,
with memory/time limits and no filesystem, imports, network, or host functions.
Every case checks both output and input immutability. This is not full CPython
or a LangChain runtime. The UI makes those constraints explicit.

## Instructor access

**Admin console → Exam console** (`/admin/exam`) shows batch-filtered attempts,
pass/fail scores, active sessions, and issued certificates. Expand a question
in the private answer key to see its solution, explanation, curriculum
reference, and hidden cases. **Review** shows a student's saved answers in their
actual question order. Both pages enforce administrator authorization.

Students receive only public question fields and aggregate section scores;
correct answers, explanations, hidden cases, and reference implementations
are never serialized to them, even after submission. This is an independent
assessment without live proctoring; unlimited failed retries are intentional.

## Certificates

A passed student chooses and confirms a name. Issuance is idempotent: one fixed
name and one UUID credential per student. The server independently verifies a
submitted passing score before issuing it. Unsupported name glyphs receive a
request for a Latin transliteration. PDF downloads require the owner or an
administrator.

The landscape PDF says **AI Agentic MasterClass Certified — AI & LLM Expert
Engineer**, certified by **Nisarg Kadam**, with a stylized digital signature,
issue date, assessment score, credential ID, and verification URL. The signature
is a visual issuer mark, not a PKI PDF signature. Noto Sans and Great Vibes are
bundled with their Open Font Licenses.

The public `/certificates/[id]` page shows the chosen name, achievement, issue
date, and credential ID. It exposes no email, account ID, answers, or detailed
score, and carries `noindex` metadata. Students see this disclosure before
issuing. Inactive/deleted accounts no longer verify. LinkedIn links let the
student add the credential to their profile or open the share composer; they
complete the posting themselves.
