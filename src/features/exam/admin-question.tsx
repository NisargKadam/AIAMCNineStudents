import "server-only";
import type { ExamQuestion } from "./bank";
import type { Answer } from "./types";
import { kindLabels } from "./types";

export function AdminQuestion({
  question: q,
  number,
  answer,
}: {
  question: ExamQuestion;
  number: number;
  answer?: Answer;
}) {
  const correct = Array.isArray(q.correct)
    ? q.correct
        .map((id) => q.options!.find((o) => o.id === id)!.text)
        .join(" → ")
    : q.options?.find((o) => o.id === q.correct)?.text;
  const response = Array.isArray(answer)
    ? answer
        .map((id) => q.options?.find((o) => o.id === id)?.text ?? id)
        .join(" → ")
    : q.kind === "mcq"
      ? q.options?.find((o) => o.id === answer)?.text
      : answer;
  return (
    <details className="group rounded-xl border border-[var(--line)] bg-[var(--panel)]">
      <summary className="cursor-pointer px-5 py-4 text-sm font-semibold">
        <span className="text-dim mr-3 font-mono">
          {String(number).padStart(2, "0")}
        </span>
        {q.title}
        <span className="text-dim ml-3 text-xs font-normal">
          {kindLabels[q.kind]} · {q.points} pts
        </span>
      </summary>
      <div className="space-y-4 border-t border-[var(--line)] p-5 text-sm leading-6">
        <p className="text-dim whitespace-pre-wrap">{q.prompt}</p>
        {answer !== undefined && (
          <div className="bg-sunken rounded-xl p-4">
            <p className="mb-2 text-xs font-semibold">Student response</p>
            <pre className="overflow-x-auto font-mono text-xs leading-6 break-words whitespace-pre-wrap">
              {response || "Unanswered"}
            </pre>
          </div>
        )}
        {q.options && (
          <ol className="space-y-2">
            {q.options.map((o) => (
              <li
                key={o.id}
                className={
                  (
                    Array.isArray(q.correct)
                      ? q.correct.includes(o.id)
                      : q.correct === o.id
                  )
                    ? "text-[var(--verified)]"
                    : "text-dim"
                }
              >
                {q.kind === "mcq"
                  ? `${q.correct === o.id ? "✓ " : ""}${o.text}`
                  : o.text}
              </li>
            ))}
          </ol>
        )}
        <div className="rounded-xl border border-[var(--verified)]/25 bg-[var(--verified)]/5 p-4">
          <p className="text-xs font-bold text-[var(--verified)]">
            PRIVATE ANSWER / REFERENCE SOLUTION
          </p>
          {correct && <p className="mt-2">{correct}</p>}
          {q.solution && (
            <pre className="mt-3 overflow-x-auto font-mono text-xs leading-6 whitespace-pre-wrap">
              {q.solution}
            </pre>
          )}
          <p className="text-dim mt-3">{q.explanation}</p>
        </div>
        {q.tests && (
          <details>
            <summary className="cursor-pointer text-xs font-semibold">
              Hidden grading cases ({q.tests.length})
            </summary>
            <pre className="bg-sunken mt-3 overflow-x-auto rounded-xl p-4 font-mono text-xs leading-6">
              {JSON.stringify(q.tests, null, 2)}
            </pre>
          </details>
        )}
        <p className="text-dim text-xs">Curriculum reference: {q.source}</p>
      </div>
    </details>
  );
}
