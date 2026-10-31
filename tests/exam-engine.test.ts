import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { bankForVersion } from "@/features/exam/bank";
const questions = bankForVersion("aiamc-2026-v1");
import {
  grade,
  gradeQuestion,
  makeLayout,
  publicQuestions,
  validAnswers,
} from "@/features/exam/engine";
import { checkPython } from "@/features/exam/python";
import { EXAM_VERSION, type Answers } from "@/features/exam/types";
import {
  createCertificatePDF,
  supportsCertificateName,
} from "@/features/exam/certificate";
import { PDFDocument } from "pdf-lib";

describe("certification exam contract", () => {
  it("has exactly the requested question mix and 100 available points", () => {
    expect(questions).toHaveLength(45);
    expect(new Set(questions.map((q) => q.id)).size).toBe(45);
    expect(
      Object.fromEntries(
        ["mcq", "fix", "coding", "sequence"].map((kind) => [
          kind,
          questions.filter((q) => q.kind === kind).length,
        ]),
      ),
    ).toEqual({ mcq: 40, fix: 2, coding: 1, sequence: 2 });
    expect(questions.reduce((n, q) => n + q.points, 0)).toBe(100);
    for (const q of questions) {
      if (q.options)
        expect(new Set(q.options.map((o) => o.id)).size).toBe(q.options.length);
      if (q.tests) expect(q.points % q.tests.length).toBe(0);
    }
  });
  it("shuffles complete permutations while keeping stable option IDs", () => {
    const a = makeLayout(),
      b = makeLayout();
    expect([...a.ids].sort()).toEqual(questions.map((q) => q.id).sort());
    expect(a.ids).not.toEqual(b.ids);
    for (const q of questions.filter((q) => q.options))
      expect([...a.orders[q.id]].sort()).toEqual(
        q.options!.map((o) => o.id).sort(),
      );
  });
  it("never serializes reference solutions, keys, hidden tests, or explanations to students", () => {
    const visible = publicQuestions(EXAM_VERSION, makeLayout());
    expect(visible).toHaveLength(45);
    for (const q of visible)
      for (const key of [
        "correct",
        "solution",
        "tests",
        "explanation",
        "source",
        "functionName",
      ])
        expect(q).not.toHaveProperty(key);
  });
  it("rejects unknown questions, forged options, duplicate sequence steps, and oversized code", () => {
    expect(validAnswers({ nope: "o0" }, EXAM_VERSION)).toBeNull();
    expect(validAnswers({ "practice-01": "forged" }, EXAM_VERSION)).toBeNull();
    expect(
      validAnswers(
        { "practice-sequence-1": ["a", "a", "c", "d", "e"] },
        EXAM_VERSION,
      ),
    ).toBeNull();
    expect(
      validAnswers({ "practice-code": "x".repeat(12001) }, EXAM_VERSION),
    ).toBeNull();
    expect(validAnswers({ score: 100, passed: true }, EXAM_VERSION)).toBeNull();
    expect(validAnswers({ "practice-01": "o1" }, EXAM_VERSION)).toEqual({
      "practice-01": "o1",
    });
  });
  it("awards sequence partial credit per position and empty answers score zero", async () => {
    const q = questions.find((q) => q.id === "practice-sequence-1")!;
    expect(await gradeQuestion(q, ["b", "a", "c", "d", "e"])).toBe(3);
    expect((await grade(EXAM_VERSION, {})).score).toBe(0);
  });
  it("grades the full reference exam as 100 and enforces the exact 90-point boundary", async () => {
    const answers: Answers = Object.fromEntries(
      questions.map((q) => [q.id, q.solution ?? q.correct!]),
    );
    const full = await grade(EXAM_VERSION, answers);
    expect(full.score).toBe(100);
    expect(full.passed).toBe(true);
    for (let i = 1; i <= 10; i++)
      delete answers[`practice-${String(i).padStart(2, "0")}`];
    expect(await grade(EXAM_VERSION, answers)).toMatchObject({
      score: 90,
      passed: true,
    });
    delete answers["practice-11"];
    expect(await grade(EXAM_VERSION, answers)).toMatchObject({
      score: 89,
      passed: false,
    });
  }, 45000);
  it("grades behavior rather than source similarity", async () => {
    const q = questions.find((q) => q.id === "practice-fix-1")!;
    const different =
      "def identity(x):\n    output = [x]\n    return output[0]";
    expect(await gradeQuestion(q, different)).toBe(10);
  });
});

describe("bounded Python grading", () => {
  it("handles syntax errors, infinite loops, forbidden imports, and mutation", async () => {
    const example = { args: [[1, 2]], expected: [1, 2] };
    expect((await checkPython("def f(:", "f", example)).passed).toBe(false);
    expect(
      (await checkPython("def f(a):\n while True:\n  pass", "f", example))
        .passed,
    ).toBe(false);
    expect(
      (await checkPython("import os\ndef f(a):\n return a", "f", example))
        .passed,
    ).toBe(false);
    expect(
      (
        await checkPython(
          "def f(a):\n a.reverse()\n return [1, 2]",
          "f",
          example,
        )
      ).passed,
    ).toBe(false);
    expect(
      (await checkPython("def f(a):\n return a", "f", example)).passed,
    ).toBe(true);
  });
});

describe("certificate rendering", () => {
  it("supports accented names and generates one landscape page with deterministic identity", async () => {
    expect(await supportsCertificateName("Zoë O'Connor-Sánchez")).toBe(true);
    const bytes = await createCertificatePDF(
      {
        id: "f083ef53-e3c1-4a6b-a885-12a8c9a6d240",
        name: "Zoë O'Connor-Sánchez",
        issuedAt: new Date("2026-11-01T00:00:00Z"),
      },
      95,
    );
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(1);
    expect(pdf.getPage(0).getSize()).toEqual({ width: 842, height: 595 });
    expect(pdf.getTitle()).toContain("Zoë O'Connor-Sánchez");
  });
});
