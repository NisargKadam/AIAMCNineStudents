import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  token: null as string | null,
  /** What arrives as X-Forwarded-For, which a caller can write themselves. */
  ip: "test-ip",
  /** What the host reports as the real client address, when it does. */
  realIp: null as string | null,
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
  headers: async () =>
    new Headers({
      "x-forwarded-for": state.ip,
      ...(state.realIp ? { "x-real-ip": state.realIp } : {}),
    }),
}));

import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { hashSessionToken, verifyPassword } from "@/lib/auth/crypto";
import { loadSignals } from "@/lib/signals";
import {
  addPreapprovedEmailsAction,
  approveSignupAction,
  declineSignupAction,
  deleteSignupRequestAction,
  removePreapprovedEmailAction,
} from "@/features/admin/signup-actions";
import { signupAction } from "@/features/signup/actions";
import { loginAction } from "@/features/auth/actions";
import {
  bulkStudentAction,
  deleteStudentAction,
} from "@/features/admin/actions";
import { MAX_WAITING_REQUESTS } from "@/features/signup/service";

const suite = `alumni-signup-${Date.now()}`;
const password = "correct-horse-battery-1";
const address = (name: string) => `${suite}-${name}@example.test`;
let ipCounter = 0;

/** Every test submits from its own address so the limiter never interferes. */
function freshIp() {
  ipCounter += 1;
  state.ip = `${suite}-ip-${ipCounter}`;
  state.realIp = null;
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

describe("the limits on public forms", () => {
  it("counts sign-ups by the address the host reports, not one the caller writes", async () => {
    freshIp();
    state.realIp = `${suite}-real-1`;
    for (let attempt = 0; attempt < 10; attempt += 1) {
      state.ip = `${suite}-forged-${attempt}`;
      expect(await signup("member")).toMatchObject({ code: "exists" });
    }
    state.ip = `${suite}-forged-again`;
    expect(await signup("member")).toMatchObject({
      error: expect.stringContaining("Too many"),
    });
  });

  it("uses the nearest proxy's entry when the host reports no address", async () => {
    freshIp();
    for (let attempt = 0; attempt < 10; attempt += 1) {
      state.ip = `${suite}-forged-b${attempt}, ${suite}-proxy-seen`;
      expect(await signup("member")).toMatchObject({ code: "exists" });
    }
    state.ip = `${suite}-forged-b-again, ${suite}-proxy-seen`;
    expect(await signup("member")).toMatchObject({
      error: expect.stringContaining("Too many"),
    });
  });

  it("throttles sign-in guesses the same way", async () => {
    freshIp();
    state.realIp = `${suite}-real-2`;
    const guess = () =>
      loginAction(
        null,
        form({ email: address("member"), password: "wrong-guess-123" }),
      );
    for (let attempt = 0; attempt < 8; attempt += 1) {
      state.ip = `${suite}-forged-c${attempt}`;
      expect(await guess()).toEqual({ error: "Invalid email or password." });
    }
    state.ip = `${suite}-forged-c-again`;
    expect(await guess()).toEqual({
      error: expect.stringContaining("Too many sign-in attempts"),
    });
  });

  it("stops taking new requests once the waiting list is full, without closing the door on pre-approved emails", async () => {
    await db.preapprovedEmail.create({
      data: { email: address("late-listed") },
    });
    await db.signupRequest.createMany({
      data: Array.from({ length: MAX_WAITING_REQUESTS }, (_, index) => ({
        email: address(`queue-${index}`),
        fullName: "Queued Person",
        alumniBatch: 1,
        passwordHash: "unused-test-fixture",
      })),
    });
    try {
      freshIp();
      expect(await signup("one-too-many")).toMatchObject({
        error: expect.stringContaining("paused"),
      });
      expect(await requestFor("one-too-many")).toBeNull();
      freshIp();
      await expect(signup("late-listed")).rejects.toThrow("REDIRECT:/welcome");
    } finally {
      await db.signupRequest.deleteMany({
        where: { email: { startsWith: `${suite}-queue-` } },
      });
    }
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

describe("the instructor's sign-up requests", () => {
  const tokens = new Map<string, string>();
  let adminId = "";

  async function signedIn(name: string, role: "ADMIN" | "STUDENT") {
    const user = await db.user.create({
      data: {
        email: address(name),
        passwordHash: "unused-test-fixture",
        role,
        profile: { create: { fullName: `${suite} ${name}` } },
      },
    });
    const token = randomBytes(32).toString("base64url");
    await db.session.create({
      data: {
        userId: user.id,
        tokenHash: hashSessionToken(token),
        expiresAt: new Date(Date.now() + 3_600_000),
      },
    });
    tokens.set(name, token);
    return user.id;
  }

  async function request(name: string, status: "PENDING" | "DECLINED") {
    const created = await db.signupRequest.create({
      data: {
        email: address(name),
        fullName: `${suite} ${name}`,
        alumniBatch: 4,
        passwordHash: await bcrypt.hash(password, 4),
        status,
        decidedAt: status === "DECLINED" ? new Date() : null,
      },
    });
    return created.id;
  }

  beforeAll(async () => {
    adminId = await signedIn("instructor", "ADMIN");
    await signedIn("bystander", "STUDENT");
    state.token = tokens.get("instructor")!;
  });

  it("approving creates the account with the password the person chose", async () => {
    const id = await request("approve-me", "PENDING");
    expect(await approveSignupAction(id)).toHaveProperty("success");

    const user = await userFor("approve-me");
    expect(user).toMatchObject({
      role: "STUDENT",
      alumniBatch: 4,
      batchId: null,
    });
    expect(user!.profile?.fullName).toBe(`${suite} approve-me`);
    expect(await verifyPassword(password, user!.passwordHash)).toBe(true);
    expect(await requestFor("approve-me")).toBeNull();
    expect(
      await db.auditLog.count({
        where: {
          actorId: adminId,
          action: "signup_approved",
          entityId: user!.id,
        },
      }),
    ).toBe(1);
  });

  it("approving a request whose email gained an account keeps that account", async () => {
    const id = await request("taken", "PENDING");
    const account = await db.user.create({
      data: {
        email: address("taken"),
        passwordHash: "original-hash",
        profile: { create: { fullName: "Already Here" } },
      },
    });
    expect(await approveSignupAction(id)).toHaveProperty("error");
    expect(
      await db.user.findUnique({ where: { id: account.id } }),
    ).toMatchObject({ passwordHash: "original-hash", alumniBatch: null });
    expect(await requestFor("taken")).toBeNull();
  });

  it("answers plainly when the request is already gone", async () => {
    expect(await approveSignupAction("no-such-request")).toHaveProperty(
      "error",
    );
  });

  it("declining keeps the request, and it can still be approved later", async () => {
    const id = await request("second-thoughts", "PENDING");
    expect(await declineSignupAction(id)).toHaveProperty("success");
    const declined = await requestFor("second-thoughts");
    expect(declined?.status).toBe("DECLINED");
    expect(declined?.decidedAt).toBeInstanceOf(Date);
    expect(await userFor("second-thoughts")).toBeNull();

    expect(await approveSignupAction(id)).toHaveProperty("success");
    expect(await userFor("second-thoughts")).toMatchObject({ alumniBatch: 4 });
  });

  it("deleting removes a request without creating anything", async () => {
    const id = await request("delete-me", "DECLINED");
    expect(await deleteSignupRequestAction(id)).toHaveProperty("success");
    expect(await requestFor("delete-me")).toBeNull();
    expect(await userFor("delete-me")).toBeNull();
  });

  it("adds a pasted list once each, whatever its shape", async () => {
    await request("paste-waiting", "PENDING");
    await request("paste-declined", "DECLINED");
    const pasted = [
      address("paste-a").toUpperCase(),
      `, ${address("paste-b")} ${address("paste-a")}`,
      `\n<${address("paste-waiting")}>; not-an-email`,
      address("paste-declined"),
      address("listed"),
    ].join(" ");

    const result = await addPreapprovedEmailsAction(pasted);
    expect(result).toHaveProperty("success");
    expect(result).toMatchObject({ invalid: ["not-an-email"] });
    for (const name of [
      "paste-a",
      "paste-b",
      "paste-waiting",
      "paste-declined",
    ])
      expect(
        await db.preapprovedEmail.count({ where: { email: address(name) } }),
      ).toBe(1);
    expect(
      await db.preapprovedEmail.count({ where: { email: address("listed") } }),
    ).toBe(1);
  });

  it("approves a waiting request when its email is pre-approved", async () => {
    expect(await userFor("paste-waiting")).toMatchObject({ alumniBatch: 4 });
    expect(await requestFor("paste-waiting")).toBeNull();
  });

  it("leaves a declined request declined when its email is pre-approved, and says so", async () => {
    expect((await requestFor("paste-declined"))?.status).toBe("DECLINED");
    expect(await userFor("paste-declined")).toBeNull();
    const again = await addPreapprovedEmailsAction(address("paste-declined"));
    expect(JSON.stringify(again)).toContain(address("paste-declined"));
    expect(JSON.stringify(again)).toContain("Declined");
  });

  it("refuses a paste with no emails in it", async () => {
    expect(await addPreapprovedEmailsAction("  hello there ")).toHaveProperty(
      "error",
    );
  });

  it("removes an email from the pre-approved list", async () => {
    expect(
      await removePreapprovedEmailAction(address("paste-b")),
    ).toHaveProperty("success");
    expect(
      await db.preapprovedEmail.count({ where: { email: address("paste-b") } }),
    ).toBe(0);
  });

  it("puts waiting requests in the instructor's bell menu", async () => {
    await request("in-the-bell", "PENDING");
    const signals = await loadSignals({
      id: adminId,
      role: "ADMIN",
      alumniBatch: null,
    });
    expect(signals.some((signal) => signal.href === "/admin/signups")).toBe(
      true,
    );
  });

  it("is closed to anyone who is not an administrator", async () => {
    const id = await request("not-yours", "PENDING");
    state.token = tokens.get("bystander")!;
    await expect(approveSignupAction(id)).rejects.toThrow(
      "REDIRECT:/unauthorized",
    );
    await expect(declineSignupAction(id)).rejects.toThrow(
      "REDIRECT:/unauthorized",
    );
    await expect(deleteSignupRequestAction(id)).rejects.toThrow(
      "REDIRECT:/unauthorized",
    );
    await expect(addPreapprovedEmailsAction(address("sneaky"))).rejects.toThrow(
      "REDIRECT:/unauthorized",
    );
    await expect(
      removePreapprovedEmailAction(address("listed")),
    ).rejects.toThrow("REDIRECT:/unauthorized");
    state.token = null;
    await expect(approveSignupAction(id)).rejects.toThrow("REDIRECT:/login");
    expect((await requestFor("not-yours"))?.status).toBe("PENDING");
    expect(
      await db.preapprovedEmail.count({ where: { email: address("sneaky") } }),
    ).toBe(0);
  });
});

describe("the instructor's controls hold under pressure", () => {
  let token = "";

  beforeAll(async () => {
    const admin = await db.user.create({
      data: {
        email: address("second-instructor"),
        passwordHash: "unused-test-fixture",
        role: "ADMIN",
        profile: { create: { fullName: "Second Instructor" } },
      },
    });
    token = randomBytes(32).toString("base64url");
    await db.session.create({
      data: {
        userId: admin.id,
        tokenHash: hashSessionToken(token),
        expiresAt: new Date(Date.now() + 3_600_000),
      },
    });
  });

  it("answers both clicks when a request is approved twice at once", async () => {
    state.token = token;
    const request = await db.signupRequest.create({
      data: {
        email: address("double-click"),
        fullName: "Double Click",
        alumniBatch: 2,
        passwordHash: "unused-test-fixture",
      },
    });
    const results = await Promise.all([
      approveSignupAction(request.id),
      approveSignupAction(request.id),
    ]);
    expect(results.filter((result) => "success" in result)).toHaveLength(1);
    expect(results.filter((result) => "error" in result)).toHaveLength(1);
    expect(
      await db.user.count({ where: { email: address("double-click") } }),
    ).toBe(1);
  });

  it("takes a deleted account's email off the pre-approved list, so it cannot walk straight back in", async () => {
    state.token = token;
    for (const name of ["impostor", "impostor-bulk"]) {
      await db.preapprovedEmail.create({ data: { email: address(name) } });
      await db.user.create({
        data: {
          email: address(name),
          passwordHash: "unused-test-fixture",
          alumniBatch: 5,
          profile: { create: { fullName: `${suite} ${name}` } },
        },
      });
    }
    const single = await userFor("impostor");
    const bulk = await userFor("impostor-bulk");

    const result = await deleteStudentAction(single!.id);
    expect(result.success).toContain("pre-approved");
    await bulkStudentAction([bulk!.id], "delete");
    expect(
      await db.preapprovedEmail.count({
        where: {
          email: { in: [address("impostor"), address("impostor-bulk")] },
        },
      }),
    ).toBe(0);

    state.token = null;
    freshIp();
    expect(await signup("impostor")).toHaveProperty("pending");
    expect(await userFor("impostor")).toBeNull();
  });
});
