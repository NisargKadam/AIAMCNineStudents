import { loadEnvConfig } from "@next/env";
import { bankForVersion } from "../src/features/exam/bank";
import {
  grade,
  gradeQuestion,
  makeLayout,
  publicQuestions,
} from "../src/features/exam/engine";
import { checkPython } from "../src/features/exam/python";
import { EXAM_VERSION, type Answers } from "../src/features/exam/types";
import { reviewOptionBalance } from "../src/features/exam/option-review";

async function main() {
  loadEnvConfig(process.cwd());
  const bank = bankForVersion(EXAM_VERSION);
  const review = reviewOptionBalance(bank);
  if (review.hasLengthCue)
    throw new Error(
      "MCQ options need an editorial review for answer-length clues.",
    );
  const answers: Answers = Object.fromEntries(
    bank.map((q) => [q.id, q.solution ?? q.correct!]),
  );
  const result = await grade(EXAM_VERSION, answers);
  if (result.score !== 100 || !result.passed)
    throw new Error(
      "The private reference exam did not score 100. Inspect it privately in the admin console.",
    );
  for (const q of bank.filter((q) => q.example)) {
    if (!(await checkPython(q.solution!, q.functionName!, q.example!)).passed)
      throw new Error(
        "A private reference solution failed its public example.",
      );
    if ((await gradeQuestion(q, q.solution!)) !== q.points)
      throw new Error("A private reference solution failed hidden grading.");
  }
  const mcqs = bank.filter((q) => q.kind === "mcq");
  for (const q of mcqs.slice(0, 10)) delete answers[q.id];
  const boundary = await grade(EXAM_VERSION, answers);
  if (boundary.score !== 90 || !boundary.passed)
    throw new Error("90-point boundary failed.");
  delete answers[mcqs[10].id];
  const below = await grade(EXAM_VERSION, answers);
  if (below.score !== 89 || below.passed)
    throw new Error("89-point boundary failed.");
  const visible = publicQuestions(EXAM_VERSION, makeLayout());
  if (
    visible.some((q) =>
      ["correct", "solution", "tests", "explanation"].some((key) => key in q),
    )
  )
    throw new Error("Private field in a student DTO.");
  console.log(
    "Private assessment verified: 45 questions, 100 points, all reference solutions and public examples pass; 90 passes, 89 fails; no answer-key fields in student payloads.",
  );
  console.log(
    `Option review: correct-answer character-length ranks ${review.lengthRanks.map((n) => n.toFixed(1)).join(" / ")}; length-only expected scores ${Object.values(
      review.guessRates,
    )
      .map((rate) => `${(rate * 100).toFixed(1)}%`)
      .join(
        " / ",
      )}; largest option-length ratio ${review.maxCharacterSpread.toFixed(2)}.`,
  );
}
main().catch(() => {
  console.error(
    "Private exam validation failed. No assessment content was logged.",
  );
  process.exitCode = 1;
});
