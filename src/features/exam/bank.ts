import "server-only";
import { gunzipSync } from "node:zlib";
import { z } from "zod";
import type { PublicQuestion } from "./types";

export type TestCase = { args: unknown[]; expected: unknown };
export type ExamQuestion = PublicQuestion & {
  correct?: string | string[];
  explanation: string;
  source: string;
  solution?: string;
  functionName?: string;
  tests?: TestCase[];
};

const testCase = z.object({
  args: z.array(z.unknown()),
  expected: z.unknown(),
});
const question = z.object({
  id: z.string().min(1),
  kind: z.enum(["mcq", "fix", "coding", "sequence"]),
  topic: z.string(),
  title: z.string(),
  prompt: z.string(),
  points: z.number().int().positive(),
  options: z.array(z.object({ id: z.string(), text: z.string() })).optional(),
  starter: z.string().optional(),
  example: testCase.optional(),
  correct: z.union([z.string(), z.array(z.string())]).optional(),
  explanation: z.string(),
  source: z.string(),
  solution: z.string().optional(),
  functionName: z
    .string()
    .regex(/^[A-Za-z_][A-Za-z0-9_]*$/)
    .optional(),
  tests: z.array(testCase).min(1).optional(),
});
const definition = z.object({
  version: z.string(),
  questions: z.array(question).length(45),
});
let cached:
  { encoded: string; version: string; questions: ExamQuestion[] } | undefined;

/** The repository is public. Assessment content, keys, and hidden tests must
 * only enter through private runtime configuration, never a committed seed.
 * Keep this immutable version available for every saved attempt. */
export function bankForVersion(version: string): ExamQuestion[] {
  const encoded = process.env.EXAM_BANK_BASE64;
  if (!encoded)
    throw new Error(
      "Private exam configuration is missing. Set EXAM_BANK_BASE64.",
    );
  if (cached?.encoded === encoded && cached.version === version)
    return cached.questions;
  const bytes = Buffer.from(encoded, "base64");
  const json =
    bytes[0] === 0x1f && bytes[1] === 0x8b
      ? gunzipSync(bytes, { maxOutputLength: 1024 * 1024 })
      : bytes;
  const parsed = definition.safeParse(JSON.parse(json.toString("utf8")));
  if (!parsed.success || parsed.data.version !== version)
    throw new Error("Invalid private exam definition or unsupported version.");
  const bank = parsed.data.questions as ExamQuestion[];
  const counts = Object.fromEntries(
    ["mcq", "fix", "coding", "sequence"].map((kind) => [
      kind,
      bank.filter((q) => q.kind === kind).length,
    ]),
  );
  if (
    counts.mcq !== 40 ||
    counts.fix !== 2 ||
    counts.coding !== 1 ||
    counts.sequence !== 2 ||
    new Set(bank.map((q) => q.id)).size !== 45 ||
    bank.reduce((n, q) => n + q.points, 0) !== 100
  )
    throw new Error("Invalid exam composition.");
  for (const q of bank) {
    if (
      q.kind === "mcq" &&
      (q.points !== 1 ||
        q.options?.length !== 4 ||
        !q.options.some((o) => o.id === q.correct))
    )
      throw new Error("Invalid MCQ rubric.");
    if (
      q.kind === "sequence" &&
      (q.points !== 5 ||
        !Array.isArray(q.correct) ||
        q.correct.length !== 5 ||
        new Set(q.correct).size !== 5 ||
        q.options?.length !== 5 ||
        q.correct.some((id) => !q.options!.some((o) => o.id === id)))
    )
      throw new Error("Invalid sequence rubric.");
    if (q.kind === "fix" || q.kind === "coding") {
      if (
        !q.functionName ||
        !q.solution ||
        !q.starter ||
        !q.example ||
        q.tests?.length !== (q.kind === "fix" ? 5 : 10) ||
        q.points !== (q.kind === "fix" ? 10 : 30)
      )
        throw new Error("Invalid coding rubric.");
    }
  }
  cached = { encoded, version, questions: bank };
  return bank;
}
