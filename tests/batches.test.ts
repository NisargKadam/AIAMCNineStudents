import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentUser, requireAdmin, requireUser } from "@/lib/auth/session";
import {
  chooseBatch,
  findEnrollingBatch,
  resolveBatchFilter,
} from "@/lib/batches";
import {
  createStudentAction,
  moveStudentsToBatchAction,
  updateStudentAction,
} from "@/features/admin/actions";
import {
  createBatchAction,
  deleteBatchAction,
  setEnrollingBatchAction,
} from "@/features/admin/batch-actions";
import { upsertSessionAction } from "@/features/sessions/actions";
import { importStudents } from "../scripts/import-students";
import { GET as getFile } from "@/app/api/files/[id]/route";
import SessionsPage from "@/app/(portal)/sessions/page";
import AdminStudentsPage from "@/app/(portal)/admin/students/page";

vi.mock("@/lib/auth/session", () => ({
  requireAdmin: vi.fn(),
  requireUser: vi.fn(),
  getCurrentUser: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/features/admin/student-manager", () => ({
  StudentManager: ({ students }: { students: unknown }) =>
    JSON.stringify(students),
}));

const suite = `batches-${Date.now()}`;
let adminId = "";
let originalEnrollingId: string | null = null;
let numbers: number[] = [];
/** Two batches owned by this suite; B is the newer one. */
const A = { id: "", number: 0 };
const B = { id: "", number: 0 };

beforeAll(async () => {
  originalEnrollingId = (await findEnrollingBatch(db))?.id ?? null;
  const top = (await db.batch.aggregate({ _max: { number: true } }))._max
    .number;
  numbers = [1, 2, 3].map((offset) => (top ?? 0) + 100 + offset);

  const admin = await db.user.create({
    data: {
      email: `${suite}-admin@example.test`,
      passwordHash: "unused-test-fixture",
      role: Role.ADMIN,
      profile: { create: { fullName: `${suite} admin` } },
    },
  });
  adminId = admin.id;
  vi.mocked(requireAdmin).mockResolvedValue(admin as never);

  for (const [target, number, title] of [
    [A, numbers[0], "A"],
    [B, numbers[1], "B"],
  ] as const) {
    const batch = await db.batch.create({
      data: {
        number,
        sessions: {
          create: [1, 2].map((sortOrder) => ({
            sortOrder,
            title: `${suite} ${title}${sortOrder}`,
          })),
        },
      },
    });
    target.id = batch.id;
    target.number = number;
  }
});

afterAll(async () => {
  await db.user.deleteMany({ where: { email: { startsWith: suite } } });
  await db.batch.deleteMany({ where: { number: { in: numbers } } });
  if (originalEnrollingId)
    await db.$transaction([
      db.batch.updateMany({ data: { isEnrolling: false } }),
      db.batch.update({
        where: { id: originalEnrollingId },
        data: { isEnrolling: true },
      }),
    ]);
  await db.$disconnect();
});

function student(name: string, batchId: string | null) {
  return db.user.create({
    data: {
      email: `${suite}-${name}@example.test`,
      passwordHash: "unused-test-fixture",
      batchId,
      profile: { create: { fullName: `${suite} ${name}` } },
    },
  });
}

describe("batch lookups", () => {
  const batches = [
    { id: "b11", number: 11, isEnrolling: true },
    { id: "b9", number: 9, isEnrolling: false },
  ];

  it("reads ?batch= as a batch, every batch, or no batch", () => {
    expect(resolveBatchFilter("9", batches)).toEqual({
      key: "9",
      batchId: "b9",
    });
    expect(resolveBatchFilter(undefined, batches)).toEqual({
      key: "all",
      batchId: undefined,
    });
    expect(resolveBatchFilter("42", batches).key).toBe("all");
    expect(resolveBatchFilter("none", batches)).toEqual({
      key: "none",
      batchId: null,
    });
  });

  it("falls back to the enrolling batch for a schedule screen", () => {
    expect(chooseBatch("9", batches)?.id).toBe("b9");
    expect(chooseBatch(undefined, batches)?.id).toBe("b11");
    expect(chooseBatch("42", batches)?.id).toBe("b11");
    expect(chooseBatch(undefined, [])).toBeNull();
  });
});

describe("students and batches", () => {
  it("puts a new student in the enrolling batch unless another is picked", async () => {
    const enrolling = await findEnrollingBatch(db);
    const byDefault = await createStudentAction({
      fullName: `${suite} default`,
      email: `${suite}-default@example.test`,
      batchId: "",
    });
    const picked = await createStudentAction({
      fullName: `${suite} picked`,
      email: `${suite}-picked@example.test`,
      batchId: A.id,
    });

    expect(byDefault.success).toContain(`Batch ${enrolling?.number}`);
    expect(picked.success).toContain(`Batch ${A.number}`);
    const created = await db.user.findMany({
      where: {
        email: {
          in: [`${suite}-default@example.test`, `${suite}-picked@example.test`],
        },
      },
      orderBy: { email: "asc" },
    });
    expect(created.map((user) => user.batchId)).toEqual([enrolling?.id, A.id]);
  });

  it("keeps a returning student in the batch they studied with", async () => {
    const returning = await student("returning", A.id);
    const result = await createStudentAction({
      fullName: `${suite} returning`,
      email: returning.email,
      batchId: B.id,
    });
    expect(result.success).toContain(`stay in Batch ${A.number}`);
    expect(
      (await db.user.findUniqueOrThrow({ where: { id: returning.id } }))
        .batchId,
    ).toBe(A.id);
  });

  it("moves selected students and records each move", async () => {
    const [one, two] = await Promise.all([
      student("move-one", A.id),
      student("move-two", A.id),
    ]);
    const result = await moveStudentsToBatchAction([one.id, two.id], B.id);
    expect(result.success).toBe(`2 students moved to Batch ${B.number}.`);
    expect(
      await db.user.count({
        where: { id: { in: [one.id, two.id] }, batchId: B.id },
      }),
    ).toBe(2);
    const log = await db.auditLog.findFirstOrThrow({
      where: { action: "student_batch_changed", entityId: one.id },
    });
    expect(log.metadata).toEqual({ from: A.number, to: B.number });

    const again = await moveStudentsToBatchAction([one.id], B.id);
    expect(again.error).toContain("already in");
  });

  it("changes one student's batch from the edit form", async () => {
    const editing = await student("edit", A.id);
    const result = await updateStudentAction({
      userId: editing.id,
      fullName: `${suite} edit`,
      email: editing.email,
      batchId: B.id,
    });
    expect(result.success).toContain(`now in Batch ${B.number}`);
    expect(
      (await db.user.findUniqueOrThrow({ where: { id: editing.id } })).batchId,
    ).toBe(B.id);
  });

  it("lists only the selected batch on the admin roster", async () => {
    const inA = await student("roster-a", A.id);
    const html = renderToStaticMarkup(
      await AdminStudentsPage({
        searchParams: Promise.resolve({ batch: String(A.number) }),
      }),
    );
    expect(html).toContain(inA.email);
    expect(html).not.toContain(`${suite}-move-one@example.test`);
    expect(html).toContain(`Batch ${A.number} students`);
  });
});

describe("managing batches", () => {
  it("creates a batch with the newest batch's session titles only", async () => {
    await db.cohortSession.updateMany({
      where: { batchId: B.id, sortOrder: 1 },
      data: {
        joinUrl: "https://meet.google.com/abc-defg-hij",
        recordingUrl: "https://www.youtube.com/watch?v=abc123",
        scheduledAt: new Date("2026-01-01T10:00:00Z"),
      },
    });
    const enrollingBefore = await findEnrollingBatch(db);
    const result = await createBatchAction({
      number: numbers[2],
      isEnrolling: false,
    });
    expect(result.success).toContain(`Batch ${numbers[2]} created`);

    const created = await db.batch.findUniqueOrThrow({
      where: { number: numbers[2] },
      include: { sessions: { orderBy: { sortOrder: "asc" } } },
    });
    expect(created.isEnrolling).toBe(false);
    expect(created.sessions.map((session) => session.title)).toEqual([
      `${suite} B1`,
      `${suite} B2`,
    ]);
    expect(created.sessions[0]).toMatchObject({
      joinUrl: null,
      recordingUrl: null,
      scheduledAt: null,
    });
    expect((await findEnrollingBatch(db))?.id).toBe(enrollingBefore?.id);

    const duplicate = await createBatchAction({ number: numbers[2] });
    expect(duplicate.error).toContain("already exists");
  });

  it("keeps exactly one batch enrolling", async () => {
    const result = await setEnrollingBatchAction(A.id);
    expect(result.success).toContain(`Batch ${A.number}`);
    const enrolling = await db.batch.findMany({ where: { isEnrolling: true } });
    expect(enrolling.map((batch) => batch.id)).toEqual([A.id]);

    const blocked = await deleteBatchAction(A.id);
    expect(blocked.error).toBeDefined();
  });

  it("deletes only an empty batch, together with its sessions", async () => {
    const created = await db.batch.findUniqueOrThrow({
      where: { number: numbers[2] },
    });
    const occupant = await student("occupant", created.id);
    const refused = await deleteBatchAction(created.id);
    expect(refused.error).toContain("Move them to another batch first");

    await db.user.delete({ where: { id: occupant.id } });
    const result = await deleteBatchAction(created.id);
    expect(result.success).toContain("deleted");
    expect(
      await db.cohortSession.count({ where: { batchId: created.id } }),
    ).toBe(0);
  });
});

describe("per-batch schedules", () => {
  it("numbers sessions within a batch", async () => {
    const clash = await upsertSessionAction({
      batchId: A.id,
      sortOrder: 1,
      title: `${suite} clash`,
      isActive: true,
    });
    expect(clash.error).toBe(`Batch ${A.number} already has a session 1.`);

    const added = await upsertSessionAction({
      batchId: A.id,
      sortOrder: 3,
      title: `${suite} A3`,
      isActive: true,
    });
    expect(added.success).toBe("Session added.");

    const orphan = await upsertSessionAction({
      sortOrder: 4,
      title: `${suite} orphan`,
      isActive: true,
    });
    expect(orphan.error).toContain("Pick the batch");
  });

  it("shows a student only their own batch's sessions", async () => {
    const viewer = await db.user.findUniqueOrThrow({
      where: { id: (await student("viewer", A.id)).id },
      include: { profile: true, batch: true },
    });
    vi.mocked(requireUser).mockResolvedValueOnce(viewer as never);
    const html = renderToStaticMarkup(
      await SessionsPage({ searchParams: Promise.resolve({}) }),
    );
    expect(html).toContain(`${suite} A1`);
    expect(html).toContain(`Live classes · Batch ${A.number}`);
    expect(html).not.toContain(`${suite} B1`);
  });

  it("serves session materials only to the session's batch", async () => {
    const session = await db.cohortSession.findFirstOrThrow({
      where: { batchId: A.id, sortOrder: 1 },
    });
    const file = await db.storedFile.create({
      data: {
        kind: "SESSION_MATERIAL",
        fileName: `${suite}.pdf`,
        contentType: "application/pdf",
        size: 3,
        bytes: Buffer.from("abc"),
        uploadedById: adminId,
        sessionId: session.id,
      },
    });
    const download = async (user: object) => {
      vi.mocked(getCurrentUser).mockResolvedValueOnce(user as never);
      return getFile(new Request(`http://test/api/files/${file.id}`), {
        params: Promise.resolve({ id: file.id }),
      });
    };

    const own = await download({ id: "x", role: "STUDENT", batchId: A.id });
    const other = await download({ id: "y", role: "STUDENT", batchId: B.id });
    const admin = await download({ id: adminId, role: "ADMIN", batchId: null });
    expect([own.status, other.status, admin.status]).toEqual([200, 404, 200]);
  });
});

describe("roster import", () => {
  it("reads an optional batch column and defaults to the enrolling batch", async () => {
    const enrolling = await findEnrollingBatch(db);
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const result = await importStudents(
      db,
      [
        "name,email,batch",
        `named,${suite}-csv-named@example.test,Batch ${B.number}`,
        `blank,${suite}-csv-blank@example.test,`,
        `unknown,${suite}-csv-unknown@example.test,998877`,
      ].join("\n"),
    );
    log.mockRestore();

    expect(result.created).toBe(2);
    expect(result.unknownBatch).toEqual(["Unknown (998877)"]);
    const imported = await db.user.findMany({
      where: { email: { startsWith: `${suite}-csv-` } },
      orderBy: { email: "asc" },
    });
    expect(imported.map((user) => [user.email, user.batchId])).toEqual([
      [`${suite}-csv-blank@example.test`, enrolling?.id],
      [`${suite}-csv-named@example.test`, B.id],
    ]);
  });
});
