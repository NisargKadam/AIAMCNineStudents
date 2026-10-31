import { test, expect, type BrowserContext } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { randomBytes, createHash } from "node:crypto";
import { mkdir } from "node:fs/promises";

const db = new PrismaClient();
const suite = `exam-ui-${Date.now()}`;
let studentId = "",
  adminId = "",
  mobileId = "";
async function authenticate(context: BrowserContext, userId: string) {
  const token = randomBytes(32).toString("base64url");
  await db.session.create({
    data: {
      userId,
      tokenHash: createHash("sha256").update(token).digest("hex"),
      expiresAt: new Date(Date.now() + 3600000),
    },
  });
  await context.addCookies([
    { name: "aiamc_session", value: token, url: "http://localhost:3001" },
  ]);
}
test.beforeAll(async () => {
  const batch = await db.batch.findFirstOrThrow({ orderBy: { number: "asc" } });
  for (const role of ["STUDENT", "ADMIN"] as const) {
    const user = await db.user.create({
      data: {
        email: `${suite}-${role}@example.test`,
        role,
        passwordHash: "unused",
        batchId: role === "STUDENT" ? batch.id : null,
        profile: { create: { fullName: "Jordan AI Engineer" } },
      },
    });
    if (role === "STUDENT") studentId = user.id;
    else adminId = user.id;
  }
  mobileId = (
    await db.user.create({
      data: {
        email: `${suite}-mobile@example.test`,
        passwordHash: "unused",
        batchId: batch.id,
        profile: { create: { fullName: "Mobile Exam Student" } },
      },
    })
  ).id;
});
test.afterAll(async () => {
  await db.user.deleteMany({ where: { email: { startsWith: suite } } });
  await db.$disconnect();
});

test("student exam, autosave, Python, failure, retry, expiry, certificate, and admin boundaries", async ({
  page,
  context,
  browser,
}) => {
  await authenticate(context, studentId);
  await page.goto("/exam");
  await expect(
    page.getByRole("heading", { name: "Prove what you can build." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Begin exam", exact: true }).click();
  await page.getByRole("button", { name: "Start my 150 minutes" }).click();
  await expect(page.getByRole("timer")).toContainText("02:29:");
  expect(
    await page.getByRole("button", { name: /Question \d+,/ }).count(),
  ).toBe(45);
  const mcq = page
    .getByRole("button", { name: /Question \d+, Multiple choice/ })
    .first();
  const mcqLabel = await mcq.getAttribute("aria-label");
  await mcq.click();
  await page.getByRole("radio").first().check();
  await expect(
    page.getByText("Unsaved changes", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("All answers saved", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: new RegExp(`^${mcqLabel!.split(",")[0]},`) })
    .click();
  await expect(page.getByRole("radio").first()).toBeChecked();
  await page
    .getByRole("button", { name: /Question \d+, Code repair/ })
    .first()
    .click();
  const editor = page.getByLabel("Your Python 3 solution");
  const functionName = (await editor.inputValue()).match(
    /def ([A-Za-z_][A-Za-z0-9_]*)\(/,
  )![1];
  const example = await page.locator("pre").innerText();
  const expected = JSON.parse(example.match(/Expected: (.+)/)![1]);
  // Echo only the already-public example; this is deliberately not a hidden
  // reference solution and does not disclose a real assessment answer.
  const literal = JSON.stringify(expected)
    .replace(/\bnull\b/g, "None")
    .replace(/\btrue\b/g, "True")
    .replace(/\bfalse\b/g, "False");
  await editor.fill(`def ${functionName}(*args):\n    return ${literal}`);
  await page.getByRole("button", { name: "Run example", exact: true }).click();
  await expect(
    page.getByText("Public example passed.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByText("All answers saved", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "/tmp/aiamc-exam-python.png",
    fullPage: true,
    animations: "disabled",
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  const content = await page.content();
  expect(content).not.toContain("PRIVATE ANSWER / REFERENCE SOLUTION");
  expect(content).not.toContain("Hidden grading cases");
  await page.getByRole("button", { name: "Submit exam", exact: true }).click();
  await page.getByRole("button", { name: "Submit & see my score" }).click();
  await expect(
    page.getByText("FAIL · Keep building", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await page.getByRole("button", { name: "Start my 150 minutes" }).click();
  await expect(page.getByRole("timer")).toBeVisible();
  const retry = await db.examAttempt.findFirstOrThrow({
    where: { userId: studentId, status: "IN_PROGRESS" },
  });
  expect(retry.number).toBe(2);
  await db.examAttempt.update({
    where: { id: retry.id },
    data: { deadline: new Date(Date.now() - 1000) },
  });
  await page.reload();
  await expect(
    page.getByText("FAIL · Keep building", { exact: true }),
  ).toBeVisible();
  // Seed an earned result for presentation and issuance checks. Engine and
  // workflow tests independently prove that only >=90 is a passing result.
  await db.examAttempt.update({
    where: { id: retry.id },
    data: {
      score: 95,
      passed: true,
      breakdown: [
        { kind: "mcq", earned: 38, possible: 40 },
        { kind: "fix", earned: 20, possible: 20 },
        { kind: "coding", earned: 27, possible: 30 },
        { kind: "sequence", earned: 10, possible: 10 },
      ],
    },
  });
  await page.reload();
  await page.getByLabel("Name on your certificate").fill("Jordan AI Engineer");
  await page.getByRole("button", { name: "Issue my certificate" }).click();
  await page
    .getByRole("button", { name: "Issue certificate", exact: true })
    .click();
  await expect(page.getByRole("link", { name: "Download PDF" })).toBeVisible();
  await page.screenshot({
    path: "/tmp/aiamc-exam-certificate.png",
    fullPage: true,
    animations: "disabled",
  });
  const certificate = await db.examCertificate.findUniqueOrThrow({
    where: { userId: studentId },
  });
  const linkedin = new URL(
    (await page
      .getByRole("link", { name: "Add to LinkedIn" })
      .getAttribute("href")) ?? "",
  );
  expect(linkedin.searchParams.get("certId")).toBe(certificate.id);
  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download PDF" }).click();
  await mkdir("/tmp/aiamc-exam-qa", { recursive: true });
  await (await download).saveAs("/tmp/aiamc-exam-qa/certificate.pdf");
  const anonymous = await browser.newContext();
  const verify = await anonymous.newPage();
  await verify.goto(
    `/certificates/${certificate.id}`.replace(/^/, "http://localhost:3001"),
  );
  await expect(
    verify.getByRole("heading", { name: "Jordan AI Engineer" }),
  ).toBeVisible();
  await expect(
    verify.getByText("Verified credential", { exact: true }),
  ).toBeVisible();
  expect(
    (
      await anonymous.request.get(
        `/api/exam/certificate/${certificate.id}`.replace(
          /^/,
          "http://localhost:3001",
        ),
      )
    ).status(),
  ).toBe(401);
  await anonymous.close();
  await page.goto("/admin/exam");
  await expect(page).toHaveURL(/unauthorized/);
  const adminContext = await browser.newContext();
  await authenticate(adminContext, adminId);
  const admin = await adminContext.newPage();
  await admin.goto("http://localhost:3001/admin/exam");
  await expect(
    admin.getByRole("heading", { name: "Private answer key" }),
  ).toBeVisible();
  await admin.locator("details.group > summary").first().click();
  await expect(
    admin
      .getByText("PRIVATE ANSWER / REFERENCE SOLUTION", { exact: true })
      .first(),
  ).toBeVisible();
  await adminContext.close();
});

test("exam introduction fits a narrow mobile viewport", async ({
  page,
  context,
}) => {
  await authenticate(context, mobileId);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/exam");
  await expect(
    page.getByRole("button", { name: "Begin exam", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Begin exam", exact: true }).click();
  await page.getByRole("button", { name: "Start my 150 minutes" }).click();
  await expect(page.getByRole("timer")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.evaluate(() => window.scrollBy(0, 450));
  const timer = await page.getByRole("timer").boundingBox();
  expect(timer!.y).toBeGreaterThanOrEqual(80);
});
