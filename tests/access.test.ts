import { describe, expect, it } from "vitest";
import { Role } from "@prisma/client";
import {
  ALUMNI_BATCHES,
  alumniLabel,
  isAlumni,
  memberBadge,
} from "@/lib/access";
import { profileGaps } from "@/lib/profile-gaps";
import { parseEmails } from "@/features/signup/emails";
import { studentProfileSchema, welcomeSchema } from "@/lib/validation";

describe("alumni accounts", () => {
  it("offers exactly batches 1 to 10", () => {
    expect([...ALUMNI_BATCHES]).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("treats a student with an alumni batch as an alumnus", () => {
    expect(isAlumni({ role: Role.STUDENT, alumniBatch: 7 })).toBe(true);
  });

  it("treats a student without an alumni batch as a full student", () => {
    expect(isAlumni({ role: Role.STUDENT, alumniBatch: null })).toBe(false);
  });

  it("never treats an administrator as an alumnus", () => {
    expect(isAlumni({ role: Role.ADMIN, alumniBatch: 7 })).toBe(false);
  });

  it("labels people by the batch they belong to", () => {
    expect(alumniLabel(7)).toBe("Batch 7 alumni");
    expect(
      memberBadge({ role: Role.STUDENT, alumniBatch: 7, batch: null }),
    ).toBe("Batch 7 alumni");
    expect(
      memberBadge({
        role: Role.STUDENT,
        alumniBatch: null,
        batch: { number: 11 },
      }),
    ).toBe("Batch 11");
    expect(
      memberBadge({ role: Role.ADMIN, alumniBatch: null, batch: null }),
    ).toBeNull();
    expect(
      memberBadge({ role: Role.STUDENT, alumniBatch: null, batch: null }),
    ).toBeNull();
  });
});

describe("profile gaps", () => {
  it("reports every required field for a missing profile", () => {
    expect(profileGaps(null)).toEqual([
      "photo",
      "fullName",
      "currentRole",
      "country",
    ]);
  });

  it("counts a field holding only spaces as missing", () => {
    expect(
      profileGaps({
        avatarUrl: "/api/files/abc",
        fullName: "Priya Sharma",
        currentRole: "   ",
        country: "India",
      }),
    ).toEqual(["currentRole"]);
  });

  it("reports nothing for a complete profile", () => {
    expect(
      profileGaps({
        avatarUrl: "/api/files/abc",
        fullName: "Priya Sharma",
        currentRole: "ML Engineer",
        country: "India",
      }),
    ).toEqual([]);
  });
});

describe("parseEmails", () => {
  it("accepts any separator, ignores capitals, and removes duplicates", () => {
    expect(
      parseEmails(
        "A@Example.test, b@example.test c@example.test\n<A@example.test>; nope, x@y",
      ),
    ).toEqual({
      emails: ["a@example.test", "b@example.test", "c@example.test"],
      invalid: ["nope", "x@y"],
    });
  });

  it("returns nothing for an empty paste", () => {
    expect(parseEmails("  \n ")).toEqual({ emails: [], invalid: [] });
  });
});

describe("the profile every student must complete", () => {
  const filled = {
    fullName: "Priya Sharma",
    currentRole: "ML Engineer",
    country: "India",
    avatarUrl: "/api/files/abc123",
    githubUsername: "",
    linkedinUrl: "",
    timezone: "",
    bio: "",
  };
  const firstError = (input: Record<string, string>) => {
    const parsed = welcomeSchema.safeParse(input);
    return parsed.success ? null : parsed.error.issues[0]?.message;
  };

  it("accepts a photo stored in the portal and one hosted elsewhere", () => {
    expect(firstError(filled)).toBeNull();
    expect(
      firstError({ ...filled, avatarUrl: "https://example.test/me.jpg" }),
    ).toBeNull();
  });

  it("asks for a photo when there is none", () => {
    expect(firstError({ ...filled, avatarUrl: "" })).toBe(
      "Add a profile photo",
    );
  });

  it("asks for the current role and the country", () => {
    expect(firstError({ ...filled, currentRole: " " })).toBe(
      "Add your current role",
    );
    expect(firstError({ ...filled, country: "" })).toBe("Add your country");
  });

  it("still checks the optional links when they are given", () => {
    expect(
      firstError({ ...filled, linkedinUrl: "https://example.test/in/me" }),
    ).toBe("Use a LinkedIn URL");
  });

  it("holds the profile screen to the same four fields", () => {
    const parsed = studentProfileSchema.safeParse({
      ...filled,
      avatarUrl: "",
      openAiApiKey: "",
      removeApiKey: false,
    });
    expect(parsed.success).toBe(false);
  });
});
