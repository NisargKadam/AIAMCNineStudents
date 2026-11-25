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
import { navFor } from "@/components/nav-config";
import {
  DEFAULT_INSTRUCTOR,
  getInstructor,
  instagramCaption,
  linkedinComposeUrl,
  linkedinPost,
} from "@/features/exam/instructor";

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

describe("the menu each person gets", () => {
  const hrefs = (viewer: Parameters<typeof navFor>[0]) =>
    navFor(viewer).flatMap((section) => section.items.map((item) => item.href));

  it("gives an alumnus only home, the exam, their profile, and the community", () => {
    expect(hrefs({ role: "STUDENT", alumni: true })).toEqual([
      "/dashboard",
      "/exam",
      "/profile",
      "/community",
    ]);
  });

  it("gives a current student the full portal and no admin console", () => {
    const menu = hrefs({ role: "STUDENT", alumni: false });
    expect(menu).toContain("/sessions");
    expect(menu).toContain("/assignments");
    expect(menu.some((href) => href.startsWith("/admin"))).toBe(false);
  });

  it("gives an administrator everything, including sign-up requests", () => {
    const menu = hrefs({ role: "ADMIN", alumni: false });
    expect(menu).toContain("/sessions");
    expect(menu).toContain("/admin/signups");
  });

  it("leaves no empty section in anyone's menu", () => {
    for (const viewer of [
      { role: "STUDENT", alumni: true },
      { role: "STUDENT", alumni: false },
      { role: "ADMIN", alumni: false },
    ] as const)
      expect(navFor(viewer).every((section) => section.items.length > 0)).toBe(
        true,
      );
  });
});

describe("sharing a certificate", () => {
  const url = "https://portal.example.test/certificates/abc-123";
  const instructor = {
    name: "Ada Instructor",
    linkedinUrl: "https://www.linkedin.com/in/ada-instructor/",
    instagramHandle: "ada.teaches",
  };

  it("writes a LinkedIn post that credits the instructor and links the certificate", () => {
    const post = linkedinPost(url, instructor);
    expect(post).toContain("Ada Instructor");
    expect(post).toContain("https://www.linkedin.com/in/ada-instructor/");
    expect(post).toContain(url);
  });

  it("opens LinkedIn's composer with that post already written", () => {
    const post = linkedinPost(url, instructor);
    const compose = new URL(linkedinComposeUrl(post));
    expect(compose.origin + compose.pathname).toBe(
      "https://www.linkedin.com/feed/",
    );
    expect(compose.searchParams.get("shareActive")).toBe("true");
    expect(compose.searchParams.get("text")).toBe(post);
  });

  it("writes an Instagram caption that tags the instructor's handle", () => {
    const caption = instagramCaption(url, instructor);
    expect(caption).toContain("@ada.teaches");
    expect(caption).toContain(url);
  });

  it("accepts a handle written with or without the @", () => {
    expect(
      instagramCaption(url, { ...instructor, instagramHandle: "@ada.teaches" }),
    ).toContain(" @ada.teaches");
  });

  it("offers no Instagram caption when there is no handle to tag", () => {
    expect(
      instagramCaption(url, { ...instructor, instagramHandle: "" }),
    ).toBeNull();
  });

  it("credits the masterclass instructor by default", () => {
    expect(DEFAULT_INSTRUCTOR.name).toBe("Nisarg Kadam");
    expect(DEFAULT_INSTRUCTOR.linkedinUrl).toMatch(
      /^https:\/\/www\.linkedin\.com\/in\/[a-z0-9-]+\/$/,
    );
  });

  it("lets the deployment set the instructor's handles", () => {
    const before = { ...process.env };
    process.env.INSTRUCTOR_INSTAGRAM_HANDLE = " @from.env ";
    process.env.INSTRUCTOR_LINKEDIN_URL =
      "https://www.linkedin.com/in/from-env/";
    try {
      expect(getInstructor()).toMatchObject({
        instagramHandle: "from.env",
        linkedinUrl: "https://www.linkedin.com/in/from-env/",
      });
    } finally {
      process.env = before;
    }
  });
});
