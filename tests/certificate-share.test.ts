import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));

import { db } from "@/lib/db";
import { GET as shareImage } from "@/app/api/exam/certificate/[id]/image/route";
import { findPublicCertificate } from "@/features/exam/public-certificate";

const suite = `certificate-share-${Date.now()}`;
const PNG = [0x89, 0x50, 0x4e, 0x47];
let certified = "";
let revoked = "";

/** Someone who passed and holds a certificate, the way the exam leaves them. */
async function holder(name: string, isActive: boolean) {
  const user = await db.user.create({
    data: {
      email: `${suite}-${name}@example.test`,
      passwordHash: "unused-test-fixture",
      isActive,
      alumniBatch: 5,
      profile: { create: { fullName: `Share ${name}` } },
    },
  });
  const attempt = await db.examAttempt.create({
    data: {
      userId: user.id,
      version: "test",
      number: 1,
      status: "SUBMITTED",
      deadline: new Date(),
      submittedAt: new Date(),
      layout: {},
      score: 94,
      passed: true,
    },
  });
  const certificate = await db.examCertificate.create({
    data: { userId: user.id, attemptId: attempt.id, name: "Priya Sharma" },
  });
  return certificate.id;
}

function image(id: string, query = "") {
  return shareImage(
    new Request(`http://localhost/api/exam/certificate/${id}/image${query}`),
    { params: Promise.resolve({ id }) },
  );
}

async function dimensions(response: Response) {
  const bytes = new Uint8Array(await response.arrayBuffer());
  const view = new DataView(bytes.buffer);
  return {
    signature: [...bytes.slice(0, 4)],
    width: view.getUint32(16),
    height: view.getUint32(20),
  };
}

beforeAll(async () => {
  certified = await holder("certified", true);
  revoked = await holder("revoked", false);
});

afterAll(async () => {
  await db.user.deleteMany({ where: { email: { startsWith: suite } } });
  await db.$disconnect();
});

describe("the share image of a certificate", () => {
  it("is a square PNG by default, for an Instagram post", async () => {
    const response = await image(certified);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(await dimensions(response)).toEqual({
      signature: PNG,
      width: 1080,
      height: 1080,
    });
  });

  it("is a wide PNG when asked, for link previews", async () => {
    const response = await image(certified, "?shape=wide");
    expect(await dimensions(response)).toEqual({
      signature: PNG,
      width: 1200,
      height: 630,
    });
  });

  it("downloads as a named file when asked to", async () => {
    const response = await image(certified, "?download=1");
    expect(response.headers.get("content-disposition")).toContain(
      'attachment; filename="AI-AMC-Certificate.png"',
    );
  });

  it("does not exist for an unknown certificate", async () => {
    expect((await image("no-such-certificate")).status).toBe(404);
  });

  it("does not exist once the holder's account is deactivated", async () => {
    expect((await image(revoked)).status).toBe(404);
    expect(await findPublicCertificate(revoked)).toBeNull();
  });
});
