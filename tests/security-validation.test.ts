import { beforeAll, describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import {
  canAccessAdmin,
  canMutateOwnedResource,
  canSubmitForUser,
} from "@/lib/authorization";
import { decryptField, encryptField, maskSecret } from "@/lib/encryption";
import {
  githubUrlSchema,
  loginSchema,
  postSchema,
  profileSchema,
  submissionSchema,
} from "@/lib/validation";
import { hashSessionToken, safeEqual } from "@/lib/auth/crypto";

beforeAll(() => {
  process.env.FIELD_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
});

describe("authentication and authorization", () => {
  it("accepts a valid student credential pair", async () => {
    const hash = await bcrypt.hash("Standard AINisarg050926", 4);
    expect(await bcrypt.compare("Standard AINisarg050926", hash)).toBe(true);
  });
  it("rejects an invalid password", async () => {
    const hash = await bcrypt.hash("correct-password", 4);
    expect(await bcrypt.compare("wrong-password", hash)).toBe(false);
  });
  it("normalizes login email", () => {
    expect(
      loginSchema.parse({ email: " STUDENT@Example.COM ", password: "secret" })
        .email,
    ).toBe("student@example.com");
  });
  it("blocks students and allows admins in the policy used by the admin guard", () => {
    expect(canAccessAdmin(Role.STUDENT)).toBe(false);
    expect(canAccessAdmin(Role.ADMIN)).toBe(true);
  });
  it("only lets a student submit for their own account", () => {
    expect(canSubmitForUser("student-a", "student-a")).toBe(true);
    expect(canSubmitForUser("student-a", "student-b")).toBe(false);
  });
  it("permits owners and admins, but not other students, to mutate posts", () => {
    expect(canMutateOwnedResource({ id: "a", role: Role.STUDENT }, "a")).toBe(
      true,
    );
    expect(canMutateOwnedResource({ id: "b", role: Role.STUDENT }, "a")).toBe(
      false,
    );
    expect(canMutateOwnedResource({ id: "admin", role: Role.ADMIN }, "a")).toBe(
      true,
    );
  });
  it("hashes session tokens deterministically without preserving plaintext", () => {
    const token = "private-session-token";
    expect(hashSessionToken(token)).not.toContain(token);
    expect(hashSessionToken(token)).toBe(hashSessionToken(token));
    expect(safeEqual("same", "same")).toBe(true);
    expect(safeEqual("a", "b")).toBe(false);
  });
});

describe("profile and secret validation", () => {
  it("encrypts and decrypts an API key with authenticated encryption", () => {
    const plaintext = "sk-test-super-secret-abcd";
    const encrypted = encryptField(plaintext);
    expect(encrypted).not.toContain(plaintext);
    expect(decryptField(encrypted)).toBe(plaintext);
    expect(maskSecret("abcd")).toMatch(/abcd$/);
  });
  it("rejects ciphertext tampering", () => {
    const encrypted = encryptField("sk-tamper-check");
    expect(() => decryptField(`${encrypted.slice(0, -2)}xx`)).toThrow();
  });
  it("accepts a valid GitHub username", () => {
    expect(
      profileSchema.safeParse({
        fullName: "Student One",
        githubUsername: "student-one",
      }).success,
    ).toBe(true);
  });
  it("rejects an invalid GitHub username", () => {
    expect(
      profileSchema.safeParse({
        fullName: "Student One",
        githubUsername: "-bad-",
      }).success,
    ).toBe(false);
  });
  it("never requires optional profile fields", () => {
    expect(
      profileSchema.safeParse({ fullName: "Student One", githubUsername: "" })
        .success,
    ).toBe(true);
  });
});

describe("assignment and community input safety", () => {
  it("accepts an HTTPS GitHub repository URL", () => {
    expect(
      githubUrlSchema.safeParse(
        "https://github.com/student/project/tree/main/assignment-1",
      ).success,
    ).toBe(true);
  });
  it("rejects non-GitHub and insecure submission URLs", () => {
    expect(
      githubUrlSchema.safeParse("https://example.com/project").success,
    ).toBe(false);
    expect(
      githubUrlSchema.safeParse("http://github.com/student/project").success,
    ).toBe(false);
  });
  it("validates a complete assignment submission", () => {
    expect(
      submissionSchema.safeParse({
        assignmentId: "a1",
        githubUrl: "https://github.com/student/project",
        studentNote: "Ready",
      }).success,
    ).toBe(true);
  });
  it("allows text, link, and local-upload image post variants", () => {
    expect(
      postSchema.safeParse({ content: "Today I built an agent." }).success,
    ).toBe(true);
    expect(
      postSchema.safeParse({ linkUrl: "https://github.com/student/project" })
        .success,
    ).toBe(true);
    expect(
      postSchema.safeParse({ imageUrl: "/uploads/image.webp" }).success,
    ).toBe(true);
  });
  it("rejects an empty post", () => {
    expect(
      postSchema.safeParse({ content: "", linkUrl: "", imageUrl: "" }).success,
    ).toBe(false);
  });
});
