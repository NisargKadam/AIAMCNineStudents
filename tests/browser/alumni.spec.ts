import { test, expect, type BrowserContext } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { randomBytes, createHash } from "node:crypto";
import { deflateSync } from "node:zlib";

const db = new PrismaClient();
const suite = `alumni-ui-${Date.now()}`;
const address = (name: string) => `${suite}-${name}@example.test`;
const password = "correct-horse-battery-1";
let adminId = "";

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

/** A solid-colour PNG of any size, built without an image library. */
function png(width: number, height: number) {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (bytes: Buffer) => {
    let c = 0xffffffff;
    for (const byte of bytes) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const sum = Buffer.alloc(4);
    sum.writeUInt32BE(crc(body));
    return Buffer.concat([length, body, sum]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 2, 0, 0, 0], 8); // 8-bit RGB
  const row = Buffer.alloc(1 + width * 3, 0x7a);
  row[0] = 0; // no filter
  const pixels = Buffer.concat(Array.from({ length: height }, () => row));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(pixels)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** Each test signs up from its own address, so the limiter never interferes. */
async function fromOwnAddress(context: BrowserContext, name: string) {
  await context.setExtraHTTPHeaders({ "x-forwarded-for": `${suite}-${name}` });
}

async function fillSignup(
  page: import("@playwright/test").Page,
  name: string,
  batch: string,
) {
  await page.goto("/signup");
  await page.getByLabel("Which batch were you in?").selectOption(batch);
  await page.getByLabel("Full name").fill("Priya Sharma");
  await page.getByLabel("Email").fill(address(name));
  await page.getByLabel("Choose a password").fill(password);
  await page.getByRole("button", { name: "Create my account" }).click();
}

const fitsWidth = (page: import("@playwright/test").Page) =>
  page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth,
  );

test.beforeAll(async () => {
  await db.preapprovedEmail.createMany({
    data: [{ email: address("listed") }, { email: address("phone") }],
  });
  adminId = (
    await db.user.create({
      data: {
        email: address("admin"),
        role: "ADMIN",
        passwordHash: "unused",
        profile: { create: { fullName: "Suite Instructor" } },
      },
    })
  ).id;
});

test.afterAll(async () => {
  await db.user.deleteMany({ where: { email: { startsWith: suite } } });
  await db.signupRequest.deleteMany({
    where: { email: { startsWith: suite } },
  });
  await db.preapprovedEmail.deleteMany({
    where: { email: { startsWith: suite } },
  });
  await db.loginAttempt.deleteMany({
    where: { identifier: { contains: suite } },
  });
  await db.$disconnect();
});

test("a pre-approved alumnus signs up, finishes their profile, and gets only the alumni portal", async ({
  page,
  context,
}) => {
  await fromOwnAddress(context, "listed");
  await fillSignup(page, "listed", "7");
  await expect(page).toHaveURL(/\/welcome$/);
  await expect(
    page.getByRole("heading", { name: /One minute and you are in, Priya/ }),
  ).toBeVisible();

  // The portal stays shut until the profile is complete.
  await page.goto("/exam");
  await expect(page).toHaveURL(/\/welcome$/);
  await page.getByRole("button", { name: "Enter the portal" }).click();
  await expect(page.getByText("Add a photo to continue.")).toBeVisible();

  // A large photo is cropped and shrunk in the browser before it is stored.
  await page.getByLabel("Profile photo").setInputFiles({
    name: "holiday.png",
    mimeType: "image/png",
    buffer: png(3000, 2000),
  });
  await expect(page.getByText("Looking good")).toBeVisible();
  await page.getByLabel("Current role").fill("ML Engineer");
  await page.getByLabel("Country").fill("India");
  await page.getByRole("button", { name: "Enter the portal" }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(
    page.getByRole("heading", { name: "Welcome back, Priya" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Your certification exam is waiting" }),
  ).toBeVisible();

  const user = await db.user.findUniqueOrThrow({
    where: { email: address("listed") },
    include: { profile: true },
  });
  expect(user).toMatchObject({ alumniBatch: 7, batchId: null });
  expect(user.profile).toMatchObject({
    currentRole: "ML Engineer",
    country: "India",
  });
  expect(user.profile!.timezone).toBeTruthy();
  const photo = await db.storedFile.findUniqueOrThrow({
    where: { id: user.profile!.avatarUrl!.replace("/api/files/", "") },
    select: { contentType: true, size: true },
  });
  expect(photo.contentType).toBe("image/jpeg");
  expect(photo.size).toBeLessThan(200_000);

  // The menu holds only what an alumnus may open.
  const menu = page.locator("aside nav").getByRole("link");
  await expect(menu).toHaveText([
    "Dashboard",
    "Exam",
    "My profile",
    "Community",
  ]);
  for (const path of [
    "/sessions",
    "/materials",
    "/assignments",
    "/prerequisites",
    "/students",
    "/about",
  ]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/dashboard$/);
  }
  await page.goto("/admin/signups");
  await expect(page).toHaveURL(/\/unauthorized$/);

  // They can open the exam and post in the alumni community.
  await page.goto("/exam");
  await expect(
    page.getByRole("button", { name: "Begin exam", exact: true }),
  ).toBeVisible();
  await page.goto("/community");
  const note = `${suite} hello from Batch 7`;
  await page.getByPlaceholder("What are you building today?").fill(note);
  await page.getByRole("button", { name: "Post", exact: true }).click();
  await expect(page.getByText(note)).toBeVisible();
  await expect(page.getByText("Batch 7 alumni").first()).toBeVisible();
});

test("an unknown email waits for the instructor, who approves it", async ({
  page,
  context,
  browser,
}) => {
  await fromOwnAddress(context, "stranger");
  await fillSignup(page, "stranger", "3");
  await expect(
    page.getByRole("heading", { name: "Request sent" }),
  ).toBeVisible();
  await expect(page.getByText(address("stranger"))).toBeVisible();

  const signIn = async () => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(address("stranger"));
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
  };
  await signIn();
  await expect(page.getByText(/waiting for approval/)).toBeVisible();

  const adminContext = await browser.newContext();
  await authenticate(adminContext, adminId);
  const admin = await adminContext.newPage();
  await admin.goto("http://localhost:3001/admin/signups");
  const row = admin
    .getByRole("listitem")
    .filter({ hasText: address("stranger") });
  await expect(row).toContainText("Batch 3 alumni");
  await row.getByRole("button", { name: "Approve" }).click();
  await expect(row).toHaveCount(0);
  await adminContext.close();

  await signIn();
  await expect(page).toHaveURL(/\/welcome$/);
});

test("sign-up and the welcome step fit a phone", async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await fromOwnAddress(context, "phone");
  await page.goto("/signup");
  await expect(
    page.getByRole("heading", { name: "Sign up for your certificate" }),
  ).toBeVisible();
  expect(await fitsWidth(page)).toBe(true);
  await fillSignup(page, "phone", "10");
  await expect(page).toHaveURL(/\/welcome$/);
  expect(await fitsWidth(page)).toBe(true);
});
