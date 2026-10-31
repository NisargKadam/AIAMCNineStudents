import "server-only";
import { randomInt } from "node:crypto";
import { bankForVersion, type ExamQuestion } from "./bank";
import { checkPython } from "./python";
import {
  EXAM_VERSION,
  PASS_SCORE,
  type Answers,
  type ExamLayout,
  type PublicQuestion,
  type SectionScore,
  type QuestionKind,
} from "./types";

export function shuffle<T>(items: readonly T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function makeLayout(): ExamLayout {
  const bank = bankForVersion(EXAM_VERSION);
  return {
    ids: shuffle(bank.map((q) => q.id)),
    orders: Object.fromEntries(
      bank
        .filter((q) => q.options)
        .map((q) => [q.id, shuffle(q.options!.map((o) => o.id))]),
    ),
  };
}

// Allow-list fields: never spread a private question into a client DTO.
export function publicQuestions(
  version: string,
  layout: ExamLayout,
): PublicQuestion[] {
  const bank = bankForVersion(version);
  return layout.ids.map((id) => {
    const q = bank.find((item) => item.id === id)!;
    return {
      id: q.id,
      kind: q.kind,
      topic: q.topic,
      title: q.title,
      prompt: q.prompt,
      points: q.points,
      ...(q.starter ? { starter: q.starter } : {}),
      ...(q.example ? { example: q.example } : {}),
      ...(q.options
        ? {
            options: layout.orders[id].map((optionId) =>
              q.options!.find((o) => o.id === optionId)!,
            ),
          }
        : {}),
    };
  });
}

export function validAnswers(input: unknown, version: string): Answers | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const result: Answers = {};
  const bank = bankForVersion(version);
  if (Object.keys(input).length > bank.length) return null;
  for (const [id, value] of Object.entries(input)) {
    const q = bank.find((item) => item.id === id);
    if (!q) return null;
    if (q.kind === "sequence") {
      if (
        !Array.isArray(value) ||
        value.length !== q.options!.length ||
        new Set(value).size !== value.length ||
        value.some(
          (v) => typeof v !== "string" || !q.options!.some((o) => o.id === v),
        )
      )
        return null;
      result[id] = value;
    } else {
      if (
        typeof value !== "string" ||
        value.length > (q.kind === "mcq" ? 10 : 12000)
      )
        return null;
      if (
        q.kind === "mcq" &&
        value !== "" &&
        !q.options!.some((o) => o.id === value)
      )
        return null;
      result[id] = value;
    }
  }
  return result;
}

export async function gradeQuestion(q: ExamQuestion, answer: unknown) {
  if (q.kind === "mcq") return answer === q.correct ? q.points : 0;
  if (q.kind === "sequence")
    return Array.isArray(answer)
      ? (q.correct as string[]).reduce(
          (sum, id, i) => sum + (answer[i] === id ? 1 : 0),
          0,
        )
      : 0;
  if (typeof answer !== "string" || !answer.trim()) return 0;
  let passed = 0;
  for (const test of q.tests!) {
    if ((await checkPython(answer, q.functionName!, test)).passed) passed++;
  }
  return passed * (q.points / q.tests!.length);
}

export async function grade(version: string, answers: Answers) {
  const breakdown: SectionScore[] = (
    ["mcq", "fix", "coding", "sequence"] as QuestionKind[]
  ).map((kind) => ({ kind, earned: 0, possible: 0 }));
  for (const q of bankForVersion(version)) {
    const section = breakdown.find((s) => s.kind === q.kind)!;
    section.possible += q.points;
    section.earned += await gradeQuestion(q, answers[q.id]);
  }
  const score = breakdown.reduce((total, section) => total + section.earned, 0);
  return { score, passed: score >= PASS_SCORE, breakdown };
}
