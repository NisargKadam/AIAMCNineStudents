import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ token: null as string | null }));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => (state.token ? { value: state.token } : undefined),
    set: vi.fn(),
    delete: vi.fn(),
  }),
  headers: async () => new Headers({ "x-forwarded-for": "203.0.113.9" }),
}));

import { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { hashSessionToken } from "@/lib/auth/crypto";
import {
  requireAdmin,
  requireFullAccess,
  requireSignedIn,
  requireUser,
} from "@/lib/auth/session";
import { submitAssignmentAction } from "@/features/assignments/actions";
import {
  confirmPrerequisites,
  savePrerequisiteChecklist,
} from "@/features/prerequisites/actions";
import { saveExamAction, startExamAction } from "@/features/exam/actions";
import { startExam } from "@/features/exam/service";
import { toggleLikeAction } from "@/features/community/actions";
import {
  completeProfileAction,
  updateProfileAction,
} from "@/features/profile/actions";
import WelcomePage from "@/app/welcome/page";
import DashboardPage from "@/app/(portal)/dashboard/page";
import { AlumniHome } from "@/features/dashboard/alumni-home";
import { loadSignals } from "@/lib/signals";
import {
  changeStudentRoleAction,
  createStudentAction,
  moveStudentsToBatchAction,
  updateStudentAction,
} from "@/features/admin/actions";
import AdminStudentsPage from "@/app/(portal)/admin/students/page";
import AdminStudentPage from "@/app/(portal)/admin/students/[id]/page";
import AdminBatchesPage from "@/app/(portal)/admin/batches/page";
import AdminPage from "@/app/(portal)/admin/page";
import AdminExamPage from "@/app/(portal)/admin/exam/page";
import AdminAttemptPage from "@/app/(portal)/admin/exam/[id]/page";
import AdminAuditPage from "@/app/(portal)/admin/audit/page";
import AdminCommunityPage from "@/app/(portal)/admin/community/page";
import AdminAssignmentsPage from "@/app/(portal)/admin/assignments/page";
import AdminPrerequisitesPage from "@/app/(portal)/admin/prerequisites/page";
import AdminSubmissionsPage from "@/app/(portal)/admin/submissions/page";
import AdminSignupsPage from "@/app/(portal)/admin/signups/page";
import { GET as getFile } from "@/app/api/files/[id]/route";
import SessionsPage from "@/app/(portal)/sessions/page";
import MaterialsPage from "@/app/(portal)/materials/page";
import PrerequisitesPage from "@/app/(portal)/prerequisites/page";
import AssignmentsPage from "@/app/(portal)/assignments/page";
import StudentsPage from "@/app/(portal)/students/page";
import AboutPage from "@/app/(portal)/about/page";
import ExamPage from "@/app/(portal)/exam/page";
import CommunityPage from "@/app/(portal)/community/page";
import ProfilePage from "@/app/(portal)/profile/page";

const suite = `alumni-access-${Date.now()}`;
const tokens = new Map<string, string>();
const ids = new Map<string, string>();
const batch = { id: "", number: 0 };
let assignmentId = "";
let materialId = "";

const complete = {
  avatarUrl: "/api/files/fixture",
  currentRole: "AI Engineer",
  country: "India",
};

/** Creates a person and a live session for them, like a real sign-in. */
async function person(
  name: string,
  data: {
    role?: Role;
    batchId?: string | null;
    alumniBatch?: number | null;
    profile?: Record<string, string> | null;
  } = {},
) {
  const user = await db.user.create({
    data: {
      email: `${suite}-${name}@example.test`,
      passwordHash: "unused-test-fixture",
      role: data.role ?? Role.STUDENT,
      batchId: data.batchId ?? null,
      alumniBatch: data.alumniBatch ?? null,
      profile: {
        create: {
          fullName: `${suite} ${name}`,
          ...(data.profile === null ? {} : (data.profile ?? complete)),
        },
      },
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
  ids.set(name, user.id);
  return user;
}

function actAs(name: string | null) {
  state.token = name ? tokens.get(name)! : null;
}

const noParams = { searchParams: Promise.resolve({}) };

beforeAll(async () => {
  const top = (await db.batch.aggregate({ _max: { number: true } }))._max
    .number;
  batch.number = (top ?? 0) + 200;
  const created = await db.batch.create({
    data: {
      number: batch.number,
      sessions: { create: [{ sortOrder: 1, title: `${suite} session` }] },
    },
    include: { sessions: true },
  });
  batch.id = created.id;

  await person("admin", { role: Role.ADMIN, profile: null });
  await person("student", { batchId: batch.id });
  await person("newcomer", { batchId: batch.id, profile: null });
  await person("midexam", { batchId: batch.id, profile: null });
  await person("alumna7", { alumniBatch: 7 });
  await person("alumnus3", { alumniBatch: 3 });

  const maxAssignment = await db.assignment.aggregate({
    _max: { sortOrder: true },
  });
  assignmentId = (
    await db.assignment.create({
      data: {
        title: `${suite} assignment`,
        sortOrder: (maxAssignment._max.sortOrder ?? 0) + 300,
      },
    })
  ).id;
  materialId = (
    await db.storedFile.create({
      data: {
        kind: "SESSION_MATERIAL",
        fileName: "slides.pdf",
        contentType: "application/pdf",
        size: 3,
        bytes: Buffer.from("pdf"),
        sessionId: created.sessions[0].id,
      },
    })
  ).id;
});

afterAll(async () => {
  await db.assignment.deleteMany({ where: { id: assignmentId } });
  await db.user.deleteMany({ where: { email: { startsWith: suite } } });
  await db.batch.deleteMany({ where: { id: batch.id } });
  await db.$disconnect();
});

describe("the guards", () => {
  it("sends a signed-out visitor to sign in", async () => {
    actAs(null);
    await expect(requireSignedIn()).rejects.toThrow("REDIRECT:/login");
    await expect(requireUser()).rejects.toThrow("REDIRECT:/login");
  });

  it("lets a student with a complete profile through", async () => {
    actAs("student");
    await expect(requireUser()).resolves.toMatchObject({
      id: ids.get("student"),
    });
    await expect(requireFullAccess()).resolves.toMatchObject({
      id: ids.get("student"),
    });
  });

  it("sends a student with an unfinished profile to the welcome step", async () => {
    actAs("newcomer");
    await expect(requireUser()).rejects.toThrow("REDIRECT:/welcome");
    await expect(requireFullAccess()).rejects.toThrow("REDIRECT:/welcome");
  });

  it("still recognises a student with an unfinished profile as signed in", async () => {
    actAs("newcomer");
    await expect(requireSignedIn()).resolves.toMatchObject({
      id: ids.get("newcomer"),
    });
  });

  it("never holds an administrator to the profile step", async () => {
    actAs("admin");
    await expect(requireUser()).resolves.toMatchObject({
      id: ids.get("admin"),
    });
    await expect(requireAdmin()).resolves.toMatchObject({
      id: ids.get("admin"),
    });
  });

  it("keeps students out of the admin console", async () => {
    actAs("student");
    await expect(requireAdmin()).rejects.toThrow("REDIRECT:/unauthorized");
  });

  it("lets alumni use the portal but not the full-student areas", async () => {
    actAs("alumna7");
    await expect(requireUser()).resolves.toMatchObject({
      id: ids.get("alumna7"),
    });
    await expect(requireFullAccess()).rejects.toThrow("REDIRECT:/dashboard");
  });
});

describe("what an alumnus cannot open", () => {
  it.each([
    ["sessions", () => SessionsPage(noParams)],
    ["materials", () => MaterialsPage(noParams)],
    ["prerequisites", () => PrerequisitesPage()],
    ["assignments", () => AssignmentsPage()],
    ["students", () => StudentsPage(noParams)],
    ["about", () => AboutPage()],
  ])("is sent home from the %s page", async (_name, open) => {
    actAs("alumna7");
    await expect(open()).rejects.toThrow("REDIRECT:/dashboard");
  });

  it("cannot submit an assignment by calling the action", async () => {
    actAs("alumna7");
    await expect(
      submitAssignmentAction({
        assignmentId,
        githubUrl: "https://github.com/example/repo",
      }),
    ).rejects.toThrow("REDIRECT:/dashboard");
    expect(
      await db.assignmentSubmission.count({
        where: { userId: ids.get("alumna7") },
      }),
    ).toBe(0);
  });

  it("cannot touch the readiness checklist by calling the actions", async () => {
    actAs("alumna7");
    const item = await db.prerequisite.findFirst({ where: { isActive: true } });
    await expect(
      savePrerequisiteChecklist(item ? [{ id: item.id, completed: true }] : []),
    ).rejects.toThrow("REDIRECT:/dashboard");
    await expect(confirmPrerequisites()).rejects.toThrow("REDIRECT:/dashboard");
    expect(
      await db.studentPrerequisite.count({
        where: { userId: ids.get("alumna7") },
      }),
    ).toBe(0);
  });

  it("cannot download a live batch's session material", async () => {
    const request = new Request(`http://localhost/api/files/${materialId}`);
    const params = { params: Promise.resolve({ id: materialId }) };
    actAs("alumna7");
    expect((await getFile(request, params)).status).toBe(404);
    actAs("student");
    expect((await getFile(request, params)).status).toBe(200);
  });
});

describe("what an alumnus can open", () => {
  it.each([
    ["exam", () => ExamPage()],
    ["community", () => CommunityPage(noParams)],
    ["profile", () => ProfilePage()],
  ])("opens the %s page", async (_name, open) => {
    actAs("alumna7");
    await expect(open()).resolves.toBeTruthy();
  });

  it("can start the certification exam", async () => {
    actAs("alumna7");
    const started = await startExamAction();
    expect(started.error).toBeUndefined();
    expect(started.active?.questions.length).toBeGreaterThan(0);
  });
});

describe("the profile step and a running exam", () => {
  it("does not interrupt a student whose exam is in progress", async () => {
    const active = await startExam(ids.get("midexam")!);
    actAs("midexam");
    await expect(ExamPage()).resolves.toBeTruthy();
    const saved = await saveExamAction(active!.id, {});
    expect(saved.error).toBeUndefined();
  });

  it("asks for the profile before a new exam can be opened or started", async () => {
    actAs("newcomer");
    await expect(ExamPage()).rejects.toThrow("REDIRECT:/welcome");
    await expect(startExamAction()).rejects.toThrow("REDIRECT:/welcome");
  });
});

describe("the alumni community", () => {
  type Shown = {
    id: string;
    author: { name: string; badge: string | null };
  };
  const postIds = new Map<string, string>();

  /** The suite's own posts as the signed-in person's feed shows them. */
  async function feed() {
    const page = await CommunityPage(noParams);
    const children = (page as { props: { children: unknown[] } }).props
      .children as Array<{ props?: { posts?: Shown[] } }>;
    const posts = children.find((child) => child?.props?.posts)!.props!.posts!;
    return posts.filter((post) => [...postIds.values()].includes(post.id));
  }
  const authors = (posts: Shown[]) =>
    posts.map((post) => post.author.name.replace(`${suite} `, "")).sort();

  beforeAll(async () => {
    for (const name of ["alumna7", "alumnus3", "student", "admin"]) {
      const post = await db.post.create({
        data: { userId: ids.get(name)!, content: `${suite} post by ${name}` },
      });
      postIds.set(name, post.id);
    }
  });

  it("shows an alumnus every alumni batch and the instructors, not current students", async () => {
    actAs("alumna7");
    expect(authors(await feed())).toEqual(["admin", "alumna7", "alumnus3"]);
  });

  it("leaves a current student's feed to their batch and the instructors", async () => {
    actAs("student");
    expect(authors(await feed())).toEqual(["admin", "student"]);
  });

  it("shows an administrator everything", async () => {
    actAs("admin");
    expect(authors(await feed())).toEqual([
      "admin",
      "alumna7",
      "alumnus3",
      "student",
    ]);
  });

  it("tells alumni which batch each alumni author came from", async () => {
    actAs("alumna7");
    const posts = await feed();
    const badge = (name: string) =>
      posts.find((post) => post.id === postIds.get(name))!.author.badge;
    expect(badge("alumnus3")).toBe("Batch 3 alumni");
    expect(badge("alumna7")).toBe("Batch 7 alumni");
    expect(badge("admin")).toBeNull();
  });

  it("labels alumni and current students apart for an administrator", async () => {
    actAs("admin");
    const posts = await feed();
    const badge = (name: string) =>
      posts.find((post) => post.id === postIds.get(name))!.author.badge;
    expect(badge("alumna7")).toBe("Batch 7 alumni");
    expect(badge("student")).toBe(`Batch ${batch.number}`);
  });

  it("lets an alumnus react to another alumnus but not to a current student", async () => {
    actAs("alumna7");
    expect(await toggleLikeAction(postIds.get("alumnus3")!)).toEqual({
      liked: true,
    });
    expect(await toggleLikeAction(postIds.get("student")!)).toEqual({
      liked: false,
    });
    expect(
      await db.postLike.count({ where: { postId: postIds.get("student")! } }),
    ).toBe(0);
  });
});

describe("finishing a profile", () => {
  function profileForm(fields: Record<string, string>) {
    const data = new FormData();
    const all = {
      fullName: "Fresh Finisher",
      currentRole: "Data Scientist",
      country: "Singapore",
      avatarUrl: "/api/files/finisher1",
      githubUsername: "",
      linkedinUrl: "",
      timezone: "Asia/Singapore",
      bio: "",
      openAiApiKey: "",
      removeApiKey: "false",
      ...fields,
    };
    for (const [key, value] of Object.entries(all)) data.set(key, value);
    return data;
  }
  const profileOf = (name: string) =>
    db.studentProfile.findUnique({ where: { userId: ids.get(name)! } });

  beforeAll(async () => {
    await person("finisher", { alumniBatch: 2, profile: null });
  });

  it("shows the welcome step only to someone who still has gaps", async () => {
    actAs("finisher");
    await expect(WelcomePage()).resolves.toBeTruthy();
    actAs("student");
    await expect(WelcomePage()).rejects.toThrow("REDIRECT:/dashboard");
    actAs("admin");
    await expect(WelcomePage()).rejects.toThrow("REDIRECT:/dashboard");
  });

  it("does not let the welcome step be finished without a photo", async () => {
    actAs("finisher");
    expect(
      await completeProfileAction(null, profileForm({ avatarUrl: "" })),
    ).toEqual({ error: "Add a profile photo" });
    await expect(requireUser()).rejects.toThrow("REDIRECT:/welcome");
  });

  it("saves the profile and opens the portal once everything is there", async () => {
    actAs("finisher");
    await expect(completeProfileAction(null, profileForm({}))).rejects.toThrow(
      "REDIRECT:/dashboard",
    );
    expect(await profileOf("finisher")).toMatchObject({
      fullName: "Fresh Finisher",
      currentRole: "Data Scientist",
      country: "Singapore",
      avatarUrl: "/api/files/finisher1",
      timezone: "Asia/Singapore",
    });
    await expect(requireUser()).resolves.toMatchObject({
      id: ids.get("finisher"),
    });
  });

  it("no longer lets a student remove their photo or blank a required field", async () => {
    actAs("student");
    expect(
      await updateProfileAction(null, profileForm({ avatarUrl: "" })),
    ).toEqual({ error: "Add a profile photo" });
    expect(
      await updateProfileAction(null, profileForm({ country: "" })),
    ).toEqual({ error: "Add your country" });
    expect(await profileOf("student")).toMatchObject({
      avatarUrl: "/api/files/fixture",
      country: "India",
    });
  });

  it("leaves an administrator's profile optional", async () => {
    actAs("admin");
    expect(
      await updateProfileAction(
        null,
        profileForm({
          fullName: "Suite Admin",
          avatarUrl: "",
          currentRole: "",
          country: "",
        }),
      ),
    ).toEqual({ success: "Profile saved." });
  });
});

describe("the alumni home", () => {
  it("replaces the coursework dashboard for an alumnus", async () => {
    actAs("alumna7");
    const page = (await DashboardPage()) as { type: unknown };
    expect(page.type).toBe(AlumniHome);
  });

  it("keeps the coursework dashboard for a current student", async () => {
    actAs("student");
    const page = (await DashboardPage()) as { type: unknown };
    expect(page.type).not.toBe(AlumniHome);
  });

  it("loads the exam state and the alumni feed without error", async () => {
    actAs("alumna7");
    const user = await requireUser();
    await expect(AlumniHome({ user })).resolves.toBeTruthy();
  });

  it("only ever points an alumnus at places they can open", async () => {
    const signals = await loadSignals({
      id: ids.get("alumnus3")!,
      role: Role.STUDENT,
      alumniBatch: 3,
    });
    const allowed = ["/exam", "/community", "/profile", "/dashboard"];
    expect(signals.length).toBeGreaterThan(0);
    expect(signals.every((signal) => allowed.includes(signal.href))).toBe(true);
  });
});

describe("the admin console and alumni", () => {
  /**
   * Every string and number a page puts on screen itself, joined up. Text is
   * read from children; other props are followed only to reach elements a
   * page passes into a slot, such as a header's action.
   */
  function textOf(node: unknown, asChild = true): string {
    if (typeof node === "string" || typeof node === "number")
      return asChild ? String(node) : "";
    if (Array.isArray(node))
      return node.map((item) => textOf(item, asChild)).join("");
    const props = (node as { props?: Record<string, unknown> } | null)?.props;
    if (!props) return "";
    return Object.entries(props)
      .map(([key, value]) => textOf(value, key === "children"))
      .join("");
  }

  /** The value a page hands to one of its components under a prop name. */
  function prop<T>(node: unknown, name: string): T | undefined {
    if (Array.isArray(node)) {
      for (const child of node) {
        const found = prop<T>(child, name);
        if (found !== undefined) return found;
      }
      return undefined;
    }
    const props = (node as { props?: Record<string, unknown> })?.props;
    if (!props) return undefined;
    if (name in props) return props[name] as T;
    return prop<T>(props.children, name);
  }

  const userOf = (name: string) =>
    db.user.findUniqueOrThrow({
      where: { id: ids.get(name)! },
      include: { examAttempts: true },
    });
  const listed = (page: unknown) =>
    (prop<Array<{ id: string }>>(page, "students") ?? []).map(
      (student) => student.id,
    );

  beforeAll(async () => {
    await person("upgrade-add", { alumniBatch: 6 });
    await person("upgrade-edit", { alumniBatch: 6 });
    await person("stays", { alumniBatch: 6 });
    await person("drifter", { batchId: null });
    await person("demoted", { alumniBatch: 8 });
    await startExam(ids.get("upgrade-add")!);
  });

  it("makes an alumnus a full student when the instructor adds them to a batch", async () => {
    actAs("admin");
    const result = await createStudentAction({
      fullName: `${suite} upgrade-add`,
      email: `${suite}-upgrade-add@example.test`,
      password: "a-long-test-password-1",
      batchId: batch.id,
    });
    expect(result.success).toContain("full access");
    const user = await userOf("upgrade-add");
    expect(user).toMatchObject({ alumniBatch: null, batchId: batch.id });
    expect(user.examAttempts).toHaveLength(1);
  });

  it("makes an alumnus a full student when their batch is set in the edit form", async () => {
    actAs("admin");
    const result = await updateStudentAction({
      userId: ids.get("upgrade-edit"),
      fullName: `${suite} upgrade-edit`,
      email: `${suite}-upgrade-edit@example.test`,
      batchId: batch.id,
    });
    expect(result.success).toContain("full access");
    expect(await userOf("upgrade-edit")).toMatchObject({
      alumniBatch: null,
      batchId: batch.id,
    });
  });

  it("leaves an alumnus alone when only their details are edited", async () => {
    actAs("admin");
    const result = await updateStudentAction({
      userId: ids.get("stays"),
      fullName: `${suite} stays renamed`,
      email: `${suite}-stays@example.test`,
    });
    expect(result).toHaveProperty("success");
    expect(await userOf("stays")).toMatchObject({
      alumniBatch: 6,
      batchId: null,
    });
  });

  it("skips alumni when moving several people into a batch", async () => {
    actAs("admin");
    const result = await moveStudentsToBatchAction(
      [ids.get("stays")!, ids.get("drifter")!],
      batch.id,
    );
    expect(result.success).toContain("1 alumni account was skipped");
    expect(await userOf("drifter")).toMatchObject({ batchId: batch.id });
    expect(await userOf("stays")).toMatchObject({
      alumniBatch: 6,
      batchId: null,
    });
  });

  it("refuses a move that selects only alumni", async () => {
    actAs("admin");
    const result = await moveStudentsToBatchAction(
      [ids.get("stays")!],
      batch.id,
    );
    expect(result).toHaveProperty("error");
    expect(await userOf("stays")).toMatchObject({ batchId: null });
  });

  it("returns a demoted administrator to being an alumnus, not into a live batch", async () => {
    actAs("admin");
    await changeStudentRoleAction(ids.get("demoted")!, Role.ADMIN);
    await changeStudentRoleAction(ids.get("demoted")!, Role.STUDENT);
    expect(await userOf("demoted")).toMatchObject({
      role: "STUDENT",
      alumniBatch: 8,
      batchId: null,
    });
  });

  it("lists alumni under their own tab on Manage students", async () => {
    actAs("admin");
    const alumniTab = listed(
      await AdminStudentsPage({
        searchParams: Promise.resolve({ batch: "alumni" }),
      }),
    );
    expect(alumniTab).toContain(ids.get("alumna7"));
    expect(alumniTab).toContain(ids.get("stays"));
    expect(alumniTab).not.toContain(ids.get("student"));

    const noBatchTab = listed(
      await AdminStudentsPage({
        searchParams: Promise.resolve({ batch: "none" }),
      }),
    );
    expect(noBatchTab).not.toContain(ids.get("alumna7"));
  });

  it("tells Manage students which rows are alumni", async () => {
    actAs("admin");
    const page = await AdminStudentsPage({
      searchParams: Promise.resolve({ batch: "alumni" }),
    });
    const rows =
      prop<Array<{ id: string; alumniBatch: number | null }>>(
        page,
        "students",
      ) ?? [];
    expect(rows.find((row) => row.id === ids.get("alumna7"))?.alumniBatch).toBe(
      7,
    );
  });

  it("does not report alumni as students missing a batch", async () => {
    await person("unassigned", { batchId: null });
    const unassigned = await db.user.count({
      where: { role: "STUDENT", batchId: null, alumniBatch: null },
    });
    actAs("admin");
    const text = textOf(await AdminBatchesPage());
    expect(text).toContain(`${unassigned} student`);
    expect(text).toContain("not in any batch");
  });

  it("counts current students on the overview and alumni beside them", async () => {
    const [current, alumni] = await Promise.all([
      db.user.count({ where: { role: "STUDENT", alumniBatch: null } }),
      db.user.count({
        where: { role: "STUDENT", alumniBatch: { not: null } },
      }),
    ]);
    actAs("admin");
    const text = textOf(await AdminPage({ searchParams: Promise.resolve({}) }));
    expect(text).toContain(`${alumni} alumni`);
    expect(text).toContain(`of ${current} student`);
  });

  it("shows the alumni badge on a student record instead of a missing-batch warning", async () => {
    actAs("admin");
    const text = textOf(
      await AdminStudentPage({
        params: Promise.resolve({ id: ids.get("alumna7")! }),
        searchParams: Promise.resolve({}),
      }),
    );
    expect(text).toContain("Batch 7 alumni");
    expect(text).not.toContain("No batch");
  });

  it("lets the exam console filter to alumni and names their batch", async () => {
    actAs("admin");
    const text = textOf(
      await AdminExamPage({
        searchParams: Promise.resolve({ batch: "alumni" }),
      }),
    );
    expect(text).toContain(`${suite} alumna7`);
    expect(text).toContain("Batch 7 alumni");
    expect(text).not.toContain(`${suite} midexam`);
  });

  it("keeps alumni out of the cohort directory", async () => {
    actAs("admin");
    const directory = listed(
      await StudentsPage({ searchParams: Promise.resolve({}) }),
    );
    expect(directory).toContain(ids.get("student"));
    expect(directory).not.toContain(ids.get("alumna7"));
  });
});

describe("every admin page guards itself", () => {
  // A layout is not re-run for every request, so each page must refuse on its
  // own rather than lean on the admin layout above it.
  const someId = { params: Promise.resolve({ id: "anything" }) };
  const pages: Array<[string, () => Promise<unknown>]> = [
    ["overview", () => AdminPage(noParams)],
    ["students", () => AdminStudentsPage(noParams)],
    ["student record", () => AdminStudentPage({ ...someId, ...noParams })],
    ["sign-up requests", () => AdminSignupsPage(noParams)],
    ["batches", () => AdminBatchesPage()],
    ["submissions", () => AdminSubmissionsPage(noParams)],
    ["exam console", () => AdminExamPage(noParams)],
    ["exam attempt", () => AdminAttemptPage(someId)],
    ["curriculum", () => AdminAssignmentsPage()],
    ["readiness", () => AdminPrerequisitesPage()],
    ["moderation", () => AdminCommunityPage()],
    ["audit log", () => AdminAuditPage(noParams)],
  ];

  it.each(pages)(
    "turns a current student away from %s",
    async (_name, open) => {
      actAs("student");
      await expect(open()).rejects.toThrow("REDIRECT:/unauthorized");
    },
  );

  it.each(pages)("turns an alumnus away from %s", async (_name, open) => {
    actAs("alumna7");
    await expect(open()).rejects.toThrow("REDIRECT:/unauthorized");
  });

  it.each(pages)(
    "sends a signed-out visitor to sign in from %s",
    async (_name, open) => {
      actAs(null);
      await expect(open()).rejects.toThrow("REDIRECT:/login");
    },
  );
});

describe("the welcome step and a running exam", () => {
  it("sends a student whose exam is running back to it instead of holding them", async () => {
    await startExam(ids.get("midexam")!);
    actAs("midexam");
    await expect(WelcomePage()).rejects.toThrow("REDIRECT:/exam");
  });
});
