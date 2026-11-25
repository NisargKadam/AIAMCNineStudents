import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  token: null as string | null,
  ip: "test-ip",
}));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => (state.token ? { value: state.token } : undefined),
    set: vi.fn(),
    delete: vi.fn(),
  }),
  headers: async () => new Headers({ "x-forwarded-for": state.ip }),
}));

import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/crypto";
import { signupAction } from "@/features/signup/actions";
import { loginAction } from "@/features/auth/actions";

const suite = `alumni-signup-${Date.now()}`;
const password = "correct-horse-battery-1";
const address = (name: string) => `${suite}-${name}@example.test`;
let ipCounter = 0;

/** Every test submits from its own address so the limiter never interferes. */
function freshIp() {
  ipCounter += 1;
  state.ip = `${suite}-ip-${ipCounter}`;
}

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

function signup(name: string, overrides: Record<string, string> = {}) {
  return signupAction(
    null,
    form({
      alumniBatch: "7",
      fullName: `${suite} ${name}`,
      email: address(name),
      password,
      ...overrides,
    }),
  );
}

const userFor = (name: string) =>
  db.user.findUnique({
    where: { email: address(name) },
    include: { profile: true, sessions: true },
  });
const requestFor = (name: string) =>
  db.signupRequest.findUnique({ where: { email: address(name) } });

beforeAll(async () => {
  await db.preapprovedEmail.createMany({
    data: ["listed", "mixed", "racer", "declined-listed"].map((name) => ({
      email: address(name),
    })),
  });
});

afterAll(async () => {
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

describe("signing up with a pre-approved email", () => {
  it("creates a certification-only account, signs it in, and opens the welcome step", async () => {
    freshIp();
    await expect(signup("listed")).rejects.toThrow("REDIRECT:/welcome");

    const user = await userFor("listed");
    expect(user).toMatchObject({
      role: "STUDENT",
      alumniBatch: 7,
      batchId: null,
      isActive: true,
    });
    expect(user!.profile?.fullName).toBe(`${suite} listed`);
    expect(await verifyPassword(password, user!.passwordHash)).toBe(true);
    expect(user!.sessions).toHaveLength(1);
    expect(await requestFor("listed")).toBeNull();
    expect(
      await db.auditLog.count({
        where: { actorId: user!.id, action: "alumni_signed_up" },
      }),
    ).toBe(1);
  });

  it("matches the email whatever capitals and spaces it is typed with", async () => {
    freshIp();
    await expect(
      signup("mixed", { email: `  ${address("mixed").toUpperCase()} ` }),
    ).rejects.toThrow("REDIRECT:/welcome");
    expect(await userFor("mixed")).toMatchObject({ alumniBatch: 7 });
  });

  it("creates one account when the same person submits twice at once", async () => {
    freshIp();
    const results = await Promise.allSettled([
      signup("racer"),
      signup("racer"),
    ]);
    const redirected = results.filter(
      (result) =>
        result.status === "rejected" &&
        String(result.reason).includes("REDIRECT:/welcome"),
    );
    const refused = results.filter(
      (result) =>
        result.status === "fulfilled" &&
        (result.value as { code?: string }).code === "exists",
    );
    expect(redirected).toHaveLength(1);
    expect(refused).toHaveLength(1);
    expect(await db.user.count({ where: { email: address("racer") } })).toBe(1);
  });
});

describe("signing up with an email that is not pre-approved", () => {
  it("saves a request for the instructor and creates no account", async () => {
    freshIp();
    const result = await signup("stranger", { alumniBatch: "3" });
    expect(result).toEqual({
      pending: { email: address("stranger"), fullName: `${suite} stranger` },
    });
    expect(await userFor("stranger")).toBeNull();
    const request = await requestFor("stranger");
    expect(request).toMatchObject({ status: "PENDING", alumniBatch: 3 });
    expect(await verifyPassword(password, request!.passwordHash)).toBe(true);
  });

  it("says the request is still waiting when submitted again", async () => {
    freshIp();
    const result = await signup("stranger");
    expect(result).toMatchObject({ code: "waiting" });
    expect(
      await db.signupRequest.count({ where: { email: address("stranger") } }),
    ).toBe(1);
  });

  it("tells a declined person so, even after their email is pre-approved", async () => {
    await db.signupRequest.create({
      data: {
        email: address("declined-listed"),
        fullName: "Declined Person",
        alumniBatch: 2,
        passwordHash: "unused-test-fixture",
        status: "DECLINED",
        decidedAt: new Date(),
      },
    });
    freshIp();
    const result = await signup("declined-listed");
    expect(result).toMatchObject({ code: "declined" });
    expect(await userFor("declined-listed")).toBeNull();
  });
});

describe("sign-up refuses", () => {
  it("an email that already has an account, leaving it untouched", async () => {
    const existing = await db.user.create({
      data: {
        email: address("member"),
        passwordHash: "original-hash",
        profile: { create: { fullName: "Existing Member" } },
      },
    });
    freshIp();
    const result = await signup("member");
    expect(result).toMatchObject({ code: "exists" });
    expect(
      await db.user.findUnique({ where: { id: existing.id } }),
    ).toMatchObject({ passwordHash: "original-hash", alumniBatch: null });
    expect(await requestFor("member")).toBeNull();
  });

  it.each([["0"], ["11"], ["x"], [""]])(
    "batch %j, which is not one of 1 to 10",
    async (alumniBatch) => {
      freshIp();
      const result = await signup("badbatch", { alumniBatch });
      expect(result).toHaveProperty("error");
      expect(await userFor("badbatch")).toBeNull();
      expect(await requestFor("badbatch")).toBeNull();
    },
  );

  it.each([["short1"], ["onlylettersnodigits"], ["123456789012"]])(
    "the weak password %j",
    async (weak) => {
      freshIp();
      const result = await signup("weak", { password: weak });
      expect(result).toHaveProperty("error");
      expect(await requestFor("weak")).toBeNull();
    },
  );

  it("an eleventh submission from one address within the hour", async () => {
    freshIp();
    for (let attempt = 0; attempt < 10; attempt += 1)
      expect(await signup("member")).toMatchObject({ code: "exists" });
    const eleventh = await signup("flood");
    expect(eleventh).toMatchObject({
      error: expect.stringContaining("Too many"),
    });
    expect(await requestFor("flood")).toBeNull();
  });
});

describe("signing in while a request is undecided", () => {
  const signIn = (name: string, pass: string) =>
    loginAction(null, form({ email: address(name), password: pass }));

  beforeAll(async () => {
    await db.signupRequest.create({
      data: {
        email: address("waiting"),
        fullName: "Waiting Person",
        alumniBatch: 5,
        passwordHash: await bcrypt.hash(password, 4),
      },
    });
  });

  it("says the sign-up is waiting for approval", async () => {
    freshIp();
    expect(await signIn("waiting", password)).toEqual({
      error: expect.stringContaining("waiting for approval"),
    });
  });

  it("does not reveal a request to someone who does not know its password", async () => {
    freshIp();
    expect(await signIn("waiting", "not-the-password-1")).toEqual({
      error: "Invalid email or password.",
    });
  });

  it("says the sign-up was not approved once it has been declined", async () => {
    await db.signupRequest.update({
      where: { email: address("waiting") },
      data: { status: "DECLINED", decidedAt: new Date() },
    });
    freshIp();
    expect(await signIn("waiting", password)).toEqual({
      error: expect.stringContaining("not approved"),
    });
  });
});
