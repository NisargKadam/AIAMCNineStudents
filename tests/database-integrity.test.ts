import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const db = new PrismaClient();
const suite = `vitest-${Date.now()}`;
let studentA = "";
let studentB = "";
let admin = "";
let assignment = "";
let prerequisite = "";
let post = "";

beforeAll(async () => {
  const hash = await bcrypt.hash("test-password", 4);
  const [a, b, c] = await Promise.all([
    db.user.create({
      data: {
        email: `${suite}-a@example.com`,
        passwordHash: hash,
        profile: { create: { fullName: "Test Student A" } },
      },
    }),
    db.user.create({
      data: {
        email: `${suite}-b@example.com`,
        passwordHash: hash,
        profile: { create: { fullName: "Test Student B" } },
      },
    }),
    db.user.create({
      data: {
        email: `${suite}-admin@example.com`,
        passwordHash: hash,
        role: Role.ADMIN,
        profile: { create: { fullName: "Test Admin" } },
      },
    }),
  ]);
  studentA = a.id;
  studentB = b.id;
  admin = c.id;
  const maxAssignment = await db.assignment.aggregate({
    _max: { sortOrder: true },
  });
  assignment = (
    await db.assignment.create({
      data: {
        title: `${suite} original assignment`,
        sortOrder: (maxAssignment._max.sortOrder ?? 0) + 100,
      },
    })
  ).id;
  const maxCategory = await db.prerequisiteCategory.aggregate({
    _max: { sortOrder: true },
  });
  const category = await db.prerequisiteCategory.create({
    data: {
      name: `${suite} category`,
      sortOrder: (maxCategory._max.sortOrder ?? 0) + 100,
    },
  });
  prerequisite = (
    await db.prerequisite.create({
      data: {
        categoryId: category.id,
        title: `${suite} prerequisite`,
        sortOrder: 1,
      },
    })
  ).id;
});

afterAll(async () => {
  await db.user.deleteMany({ where: { email: { startsWith: suite } } });
  await db.assignment.deleteMany({ where: { title: { startsWith: suite } } });
  await db.prerequisiteCategory.deleteMany({
    where: { name: { startsWith: suite } },
  });
  await db.$disconnect();
});

describe("database integrity and workflows", () => {
  it("persists checklist completion and confirmation", async () => {
    await db.studentPrerequisite.create({
      data: {
        userId: studentA,
        prerequisiteId: prerequisite,
        completed: true,
        completedAt: new Date(),
      },
    });
    await db.prerequisiteConfirmation.create({
      data: { userId: studentA, confirmedAt: new Date(), confirmedVersion: 1 },
    });
    expect(
      (
        await db.prerequisiteConfirmation.findUnique({
          where: { userId: studentA },
        })
      )?.confirmedVersion,
    ).toBe(1);
  });
  it("invalidates confirmation when the checklist changes", async () => {
    const changed = new Date();
    await db.$transaction([
      db.studentPrerequisite.update({
        where: {
          userId_prerequisiteId: {
            userId: studentA,
            prerequisiteId: prerequisite,
          },
        },
        data: { completed: false, completedAt: null },
      }),
      db.prerequisiteConfirmation.update({
        where: { userId: studentA },
        data: { invalidatedAt: changed },
      }),
    ]);
    expect(
      (
        await db.prerequisiteConfirmation.findUnique({
          where: { userId: studentA },
        })
      )?.invalidatedAt,
    ).not.toBeNull();
  });
  it("stores and updates a GitHub submission", async () => {
    const saved = await db.assignmentSubmission.create({
      data: {
        userId: studentA,
        assignmentId: assignment,
        githubUrl: "https://github.com/student/project",
      },
    });
    expect(saved.status).toBe("SUBMITTED");
    const updated = await db.assignmentSubmission.update({
      where: { id: saved.id },
      data: { status: "NEEDS_CHANGES", instructorFeedback: "Add tests" },
    });
    expect(updated.instructorFeedback).toBe("Add tests");
  });
  it("enforces one submission per student and assignment", async () => {
    await expect(
      db.assignmentSubmission.create({
        data: {
          userId: studentA,
          assignmentId: assignment,
          githubUrl: "https://github.com/student/duplicate",
        },
      }),
    ).rejects.toThrow();
  });
  it("makes an admin assignment rename visible from the same canonical row", async () => {
    await db.assignment.update({
      where: { id: assignment },
      data: { title: `${suite} renamed assignment` },
    });
    const studentView = await db.assignment.findUnique({
      where: { id: assignment },
    });
    expect(studentView?.title).toContain("renamed assignment");
  });
  it("creates text and link posts plus comments", async () => {
    const saved = await db.post.create({
      data: {
        userId: studentA,
        content: "Integration test build",
        linkUrl: "https://github.com/student/project",
      },
    });
    post = saved.id;
    await db.postComment.create({
      data: { postId: post, userId: studentB, content: "Useful work" },
    });
    const result = await db.post.findUnique({
      where: { id: post },
      include: { comments: true },
    });
    expect(result?.comments).toHaveLength(1);
  });
  it("likes and unlikes a post", async () => {
    await db.postLike.create({ data: { postId: post, userId: studentB } });
    expect(
      await db.postLike.count({ where: { postId: post, userId: studentB } }),
    ).toBe(1);
    await db.postLike.delete({
      where: { userId_postId: { postId: post, userId: studentB } },
    });
    expect(
      await db.postLike.count({ where: { postId: post, userId: studentB } }),
    ).toBe(0);
  });
  it("enforces unique likes", async () => {
    await db.postLike.create({ data: { postId: post, userId: studentB } });
    await expect(
      db.postLike.create({ data: { postId: post, userId: studentB } }),
    ).rejects.toThrow();
  });
  it("supports admin moderation with cascading comments and likes", async () => {
    await db.post.delete({ where: { id: post } });
    expect(await db.postComment.count({ where: { postId: post } })).toBe(0);
    expect(await db.postLike.count({ where: { postId: post } })).toBe(0);
  });
  it("rejects duplicate emails", async () => {
    const existing = await db.user.findUniqueOrThrow({
      where: { id: studentA },
    });
    await expect(
      db.user.create({
        data: { email: existing.email, passwordHash: "unused" },
      }),
    ).rejects.toThrow();
  });
  it("represents inactive accounts for login rejection", async () => {
    await db.user.update({
      where: { id: studentB },
      data: { isActive: false },
    });
    expect(
      (await db.user.findUnique({ where: { id: studentB } }))?.isActive,
    ).toBe(false);
  });
  it("records audit logs without secret metadata", async () => {
    const log = await db.auditLog.create({
      data: {
        actorId: admin,
        action: "assignment_reviewed",
        entityType: "Assignment",
        entityId: assignment,
        metadata: { status: "COMPLETED" },
      },
    });
    expect(JSON.stringify(log.metadata)).not.toContain("password");
  });
});
