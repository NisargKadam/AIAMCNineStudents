"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Award,
  Check,
  CheckCircle2,
  Clock3,
  Code2,
  Flag,
  ListOrdered,
  LoaderCircle,
  Play,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Confirm } from "@/components/ui/dialog";
import { startExamAction, saveExamAction, runExampleAction } from "./actions";
import { CertificateCard } from "./certificate-card";
import {
  kindLabels,
  type ActiveExam,
  type Answers,
  type Answer,
  type CertificateView,
  type ExamResult,
  type PublicQuestion,
} from "./types";
import { cn } from "@/lib/utils";

export function ExamBoard({
  active,
  results,
  certificate,
  defaultName,
  baseUrl,
}: {
  active: ActiveExam | null;
  results: ExamResult[];
  certificate: CertificateView | null;
  defaultName: string;
  baseUrl: string;
}) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  const passed = results.find((r) => r.passed);
  const latest = results[0];
  if (active) return <ExamWorkspace key={active.id} exam={active} />;
  return (
    <>
      {latest && (
        <Card
          className={cn(
            "mb-6 p-6 sm:p-8",
            passed && "border-[var(--verified)]/35",
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div>
              <p
                className={cn(
                  "text-xs font-bold tracking-widest uppercase",
                  passed ? "text-[var(--verified)]" : "text-[var(--caution)]",
                )}
              >
                {passed
                  ? "PASS · Masterclass complete"
                  : "FAIL · Keep building"}
              </p>
              <h2 className="mt-3 text-2xl font-semibold">
                {passed
                  ? "You earned your certification."
                  : "A higher score is within reach."}
              </h2>
              <p className="text-dim mt-2 text-sm">
                {passed
                  ? "Your assessment demonstrates excellence across the masterclass curriculum."
                  : "You need 90% to pass. Review the curriculum and start a fresh attempt when you are ready."}
              </p>
            </div>
            <div className="text-right">
              <p className="font-display text-5xl font-semibold">
                {(passed ?? latest).score}
                <span className="text-dim text-xl"> / 100</span>
              </p>
              <p className="text-dim mt-2 text-xs">
                Attempt {(passed ?? latest).number}
              </p>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {(passed ?? latest).breakdown.map((s) => (
              <div key={s.kind} className="bg-sunken rounded-xl p-4">
                <p className="text-dim text-xs">{kindLabels[s.kind]}</p>
                <p className="mt-2 text-lg font-semibold">
                  {s.earned}
                  <span className="text-dim text-sm"> / {s.possible}</span>
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}
      {passed ? (
        <CertificateCard
          initial={certificate}
          defaultName={defaultName}
          baseUrl={baseUrl}
        />
      ) : (
        <>
          <Card className="relative overflow-hidden p-6 sm:p-9">
            <div className="pointer-events-none absolute -top-20 -right-12 size-64 rounded-full bg-[var(--ember)]/10 blur-3xl" />
            <div className="relative grid items-center gap-8 lg:grid-cols-[1fr_220px]">
              <div>
                <p className="text-ember flex items-center gap-2 text-xs font-semibold tracking-widest uppercase">
                  <Sparkles size={14} />
                  The final challenge
                </p>
                <h2 className="mt-4 max-w-xl text-3xl leading-tight font-semibold sm:text-4xl">
                  Prove what you can build.
                </h2>
                <p className="text-dim mt-4 max-w-xl text-sm leading-7">
                  From prompt to production. Apply the engineering judgment you
                  learned in the masterclass to real agent, retrieval, safety,
                  and deployment scenarios.
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                  <span className="bg-raised rounded-full px-3 py-1.5 text-xs">
                    Medium · Challenging
                  </span>
                  <span className="bg-raised rounded-full px-3 py-1.5 text-xs">
                    45 questions
                  </span>
                  <span className="bg-raised rounded-full px-3 py-1.5 text-xs">
                    100 points
                  </span>
                </div>
              </div>
              <div className="rounded-2xl border border-[var(--line-strong)] bg-[var(--sunken)] p-6 text-center">
                <Clock3 className="text-ember mx-auto" size={27} />
                <p className="font-display num mt-4 text-4xl font-semibold">
                  02:30:00
                </p>
                <p className="text-dim mt-2 text-xs">
                  One uninterrupted session
                </p>
                <div className="my-5 h-px bg-[var(--line)]" />
                <p className="flex items-center justify-center gap-2 text-sm font-semibold">
                  <Award size={18} className="text-[var(--caution)]" />
                  90% to certify
                </p>
              </div>
            </div>
          </Card>
          <div className="my-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                name: "Multiple choice",
                count: "40 questions",
                points: "40 points",
                time: "50 min",
                icon: CheckCircle2,
              },
              {
                name: "Code repair",
                count: "2 Python fixes",
                points: "20 points",
                time: "30 min",
                icon: Code2,
              },
              {
                name: "Coding challenge",
                count: "1 Python problem",
                points: "30 points",
                time: "40 min",
                icon: Code2,
              },
              {
                name: "Sequence",
                count: "2 ordered workflows",
                points: "10 points",
                time: "15 min",
                icon: ListOrdered,
              },
            ].map((s) => (
              <Card key={s.name} className="p-5">
                <s.icon className="text-ember mb-4" size={20} />
                <h3 className="text-sm font-semibold">{s.name}</h3>
                <p className="text-dim mt-1.5 text-xs">
                  {s.count} · {s.points}
                </p>
                <p className="text-dim mt-3 text-xs">Suggested: {s.time}</p>
              </Card>
            ))}
          </div>
          <Card className="p-6">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck size={18} className="text-[var(--verified)]" />
              Before you begin
            </h3>
            <ul className="text-dim mt-4 list-disc space-y-2 pl-5 text-sm leading-6">
              <li>
                The timer starts immediately and continues through refreshes,
                sign-outs, or disconnections. There is no pause.
              </li>
              <li>
                Every attempt shuffles all 45 questions, MCQ options, and
                sequence cards. Use one browser tab.
              </li>
              <li>
                Answers save automatically while connected. The server accepts
                answers only before your deadline; after time expires, your last
                saved answers are graded.
              </li>
              <li>
                Python tasks use built-ins only. Run the public example, then
                check edge cases. Hidden tests award partial credit; each
                correct sequence position earns one point. There is no negative
                marking.
              </li>
              <li>
                Plan for 135 minutes of work and 15 minutes of review. You can
                navigate freely and flag questions.
              </li>
              <li>
                Scores of 90–100 pass and unlock certification. Below 90 is a
                fail; you may retry. Passing completes the exam and closes
                further attempts.
              </li>
              <li>
                Work independently. This assessment has no live proctoring.
                Correct answers and hidden tests are available only to
                administrators.
              </li>
            </ul>
            <Button
              className="mt-6"
              size="lg"
              disabled={pending}
              onClick={() => setConfirm(true)}
            >
              <Play size={16} />
              {latest ? "Try again" : "Begin exam"}
              <ArrowRight size={16} />
            </Button>
          </Card>
          <Confirm
            open={confirm}
            onOpenChange={setConfirm}
            title="Ready for the final challenge?"
            description="Starting creates your 150-minute session immediately. Make sure you have a stable connection and enough time to finish."
            confirmLabel={pending ? "Starting…" : "Start my 150 minutes"}
            pending={pending}
            tone="default"
            onConfirm={() =>
              start(async () => {
                try {
                  const r = await startExamAction();
                  if (r.error) toast.error(r.error);
                  else router.refresh();
                } catch {
                  toast.error("Could not start the exam. Try again.");
                }
              })
            }
          />
        </>
      )}
      {results.length > 0 && (
        <Card className="mt-6 p-6">
          <h3 className="text-sm font-semibold">Your attempt history</h3>
          <div className="mt-4 space-y-3">
            {results.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] pb-3 text-sm last:border-0 last:pb-0"
              >
                <span>
                  Attempt {r.number}
                  <span className="text-dim ml-3 text-xs">
                    {new Date(r.submittedAt).toLocaleDateString("en-GB", {
                      timeZone: "UTC",
                    })}
                  </span>
                </span>
                <span
                  className={
                    r.passed
                      ? "text-[var(--verified)]"
                      : "text-[var(--caution)]"
                  }
                >
                  {r.score}% · {r.passed ? "PASS" : "FAIL"}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}

function isAnswered(q: PublicQuestion, answers: Answers) {
  const value = answers[q.id];
  return Array.isArray(value)
    ? value.length > 0
    : typeof value === "string" && !!value.trim() && value !== q.starter;
}

function ExamWorkspace({ exam }: { exam: ActiveExam }) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Answers>(exam.answers);
  const [index, setIndex] = useState(0);
  const [flagged, setFlagged] = useState<string[]>([]);
  const [filter, setFilter] = useState("all");
  const [confirm, setConfirm] = useState(false);
  const [saveStatus, setSaveStatus] = useState("All answers saved");
  const [submitting, setSubmitting] = useState(false);
  const initialSeconds = Math.max(
    0,
    Math.ceil((Date.parse(exam.deadline) - Date.parse(exam.serverNow)) / 1000),
  );
  const [seconds, setSeconds] = useState(initialSeconds);
  const anchor = useRef<{ at: number; remaining: number } | null>(null);
  const dirty = useRef<Answers>({});
  const saving = useRef<Promise<void> | null>(null);
  const finished = useRef(false);
  const submittingRef = useRef(false);
  const [running, startRun] = useTransition();
  const [exampleResult, setExampleResult] = useState<{
    id: string;
    message: string;
  } | null>(null);
  const q = exam.questions[index];
  const answered = exam.questions.filter((q) => isAnswered(q, answers)).length;
  const time = [
    Math.floor(seconds / 3600),
    Math.floor((seconds % 3600) / 60),
    seconds % 60,
  ]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
  const storageKey = `aiamc-exam-draft-${exam.id}`;

  const syncClock = useCallback(
    (now: string) => {
      anchor.current = {
        at: performance.now(),
        remaining: Math.max(0, Date.parse(exam.deadline) - Date.parse(now)),
      };
    },
    [exam.deadline],
  );

  const flush = useCallback(
    async (force = false) => {
      if (
        saving.current ||
        finished.current ||
        submittingRef.current ||
        (!force && !Object.keys(dirty.current).length)
      )
        return;
      const snapshot = { ...dirty.current };
      setSaveStatus("Saving…");
      const operation = (async () => {
        try {
          const result = await saveExamAction(exam.id, snapshot);
          if (result.error) {
            setSaveStatus(result.error);
            return;
          }
          if (result.serverNow) syncClock(result.serverNow);
          if (result.result) {
            finished.current = true;
            try {
              sessionStorage.removeItem(storageKey);
            } catch {
              /* Optional draft storage. */
            }
            router.refresh();
            return;
          }
          for (const key of Object.keys(snapshot))
            if (dirty.current[key] === snapshot[key]) delete dirty.current[key];
          try {
            sessionStorage.setItem(storageKey, JSON.stringify(dirty.current));
          } catch {
            /* Server save succeeded. */
          }
          setSaveStatus(
            Object.keys(dirty.current).length
              ? "Unsaved changes"
              : "All answers saved",
          );
        } catch {
          setSaveStatus("Connection lost · retrying automatically");
        }
      })();
      saving.current = operation;
      try {
        await operation;
      } finally {
        saving.current = null;
      }
    },
    [exam.id, router, storageKey, syncClock],
  );

  const submit = useCallback(async () => {
    if (submittingRef.current || finished.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      if (saving.current) await saving.current;
      const result = await saveExamAction(exam.id, dirty.current, true);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      finished.current = true;
      try {
        sessionStorage.removeItem(storageKey);
      } catch {
        /* Optional draft storage. */
      }
      router.refresh();
    } catch {
      toast.error(
        "Could not submit. Reconnect and retry; your last server-saved answers remain protected.",
      );
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [exam.id, router, storageKey]);

  useEffect(() => {
    syncClock(exam.serverNow);
    const restore = setTimeout(() => {
      try {
        const draft = JSON.parse(sessionStorage.getItem(storageKey) ?? "{}");
        if (
          draft &&
          typeof draft === "object" &&
          !Array.isArray(draft) &&
          Object.keys(draft).length
        ) {
          dirty.current = draft;
          setAnswers((previous) => ({ ...previous, ...draft }));
          setSaveStatus("Restoring unsaved changes…");
        }
      } catch {
        /* Database answers remain authoritative. */
      }
    }, 0);
    const timer = setInterval(() => {
      const a = anchor.current!;
      setSeconds(
        Math.max(
          0,
          Math.ceil((a.remaining - (performance.now() - a.at)) / 1000),
        ),
      );
    }, 1000);
    return () => {
      clearTimeout(restore);
      clearInterval(timer);
    };
  }, [exam.serverNow, storageKey, syncClock]);

  useEffect(() => {
    let ticks = 0;
    const interval = setInterval(() => {
      ticks++;
      void flush(ticks % 30 === 0);
    }, 1000);
    const online = () => void flush(true);
    const unload = (event: BeforeUnloadEvent) => {
      if (Object.keys(dirty.current).length && !finished.current)
        event.preventDefault();
    };
    window.addEventListener("online", online);
    window.addEventListener("focus", online);
    window.addEventListener("beforeunload", unload);
    return () => {
      clearInterval(interval);
      window.removeEventListener("online", online);
      window.removeEventListener("focus", online);
      window.removeEventListener("beforeunload", unload);
    };
  }, [flush]);

  useEffect(() => {
    if (seconds > 0) return;
    void submit();
    const retry = setInterval(() => void submit(), 10000);
    return () => clearInterval(retry);
  }, [seconds, submit]);

  function change(value: Answer) {
    if (seconds <= 0 || submitting) return;
    setAnswers((previous) => ({ ...previous, [q.id]: value }));
    dirty.current[q.id] = value;
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(dirty.current));
    } catch {
      /* Autosave remains available. */
    }
    setSaveStatus("Unsaved changes");
    setExampleResult(null);
  }
  function moveSequence(position: number, direction: number) {
    const order = [
      ...(Array.isArray(answers[q.id])
        ? (answers[q.id] as string[])
        : q.options!.map((o) => o.id)),
    ];
    [order[position], order[position + direction]] = [
      order[position + direction],
      order[position],
    ];
    change(order);
  }
  return (
    <div>
      <div className="glass sticky top-20 z-20 mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl px-5 py-4">
        <div>
          <p className="text-dim text-xs">
            Attempt {exam.number} · {answered}/45 answered
          </p>
          <p
            aria-live="polite"
            className={cn(
              "mt-1 text-xs",
              saveStatus === "All answers saved"
                ? "text-[var(--verified)]"
                : "text-[var(--caution)]",
            )}
          >
            {saveStatus}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div
            role="timer"
            aria-label="Time remaining"
            className={cn(
              "num flex items-center gap-2 font-mono text-xl font-semibold",
              seconds <= 600 ? "text-[var(--alert)]" : "text-ink",
            )}
          >
            <Clock3 size={18} />
            {time}
          </div>
          <Button
            size="sm"
            disabled={submitting}
            onClick={() => setConfirm(true)}
          >
            {submitting ? (
              <LoaderCircle size={15} className="animate-spin" />
            ) : (
              <Check size={15} />
            )}
            Submit exam
          </Button>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-[var(--line)]">
          <div
            className="h-full bg-[var(--ember)] transition-[width]"
            style={{ width: `${(answered / 45) * 100}%` }}
          />
        </div>
      </div>
      {seconds === 0 && (
        <p
          role="alert"
          className="mb-4 rounded-xl border border-[var(--line)] p-4 text-sm text-[var(--caution)]"
        >
          Time is up. Your last saved answers are being graded. If disconnected,
          reconnect to retrieve your result.
        </p>
      )}
      <div className="grid gap-5 xl:grid-cols-[1fr_250px]">
        <Card className="min-w-0 p-5 sm:p-7">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-ember text-xs font-semibold">
                QUESTION {index + 1} / 45 · {kindLabels[q.kind].toUpperCase()}
              </p>
              <p className="text-dim mt-2 text-xs">
                {q.topic} · {q.points} {q.points === 1 ? "point" : "points"}
              </p>
            </div>
            <Button
              variant={flagged.includes(q.id) ? "outline" : "ghost"}
              size="sm"
              aria-pressed={flagged.includes(q.id)}
              onClick={() =>
                setFlagged((previous) =>
                  previous.includes(q.id)
                    ? previous.filter((id) => id !== q.id)
                    : [...previous, q.id],
                )
              }
            >
              <Flag size={14} />
              {flagged.includes(q.id) ? "Flagged" : "Flag"}
            </Button>
          </div>
          <h2 className="mt-6 text-xl font-semibold sm:text-2xl">{q.title}</h2>
          <p className="text-dim mt-4 text-sm leading-7 whitespace-pre-line">
            {q.prompt}
          </p>
          <fieldset
            disabled={seconds <= 0 || submitting}
            className="mt-6 min-w-0"
          >
            <legend className="sr-only">Your answer to {q.title}</legend>
            {q.kind === "mcq" && (
              <div className="space-y-3">
                {q.options!.map((o, i) => (
                  <label
                    key={o.id}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-xl border p-4 text-sm leading-6 transition-colors",
                      answers[q.id] === o.id
                        ? "border-[var(--ember)] bg-[var(--ember)]/10"
                        : "border-[var(--line-strong)] hover:bg-[var(--raised)]",
                    )}
                  >
                    <input
                      type="radio"
                      name={q.id}
                      value={o.id}
                      checked={answers[q.id] === o.id}
                      onChange={() => change(o.id)}
                      className="mt-1 accent-[var(--ember)]"
                    />
                    <span className="text-dim font-mono">
                      {String.fromCharCode(65 + i)}.
                    </span>
                    <span>{o.text}</span>
                  </label>
                ))}
              </div>
            )}
            {(q.kind === "coding" || q.kind === "fix") && (
              <>
                <label
                  htmlFor={`code-${q.id}`}
                  className="mb-2 block text-xs font-semibold"
                >
                  Your Python 3 solution
                </label>
                <textarea
                  id={`code-${q.id}`}
                  spellCheck={false}
                  autoCapitalize="off"
                  autoCorrect="off"
                  value={
                    typeof answers[q.id] === "string"
                      ? (answers[q.id] as string)
                      : q.starter
                  }
                  onChange={(e) => change(e.target.value)}
                  maxLength={12000}
                  className="bg-sunken min-h-80 w-full resize-y rounded-xl border border-[var(--line-strong)] p-4 font-mono text-xs leading-6 sm:text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Tab" && !e.shiftKey) {
                      e.preventDefault();
                      const el = e.currentTarget;
                      const pos = el.selectionStart;
                      change(
                        el.value.slice(0, pos) +
                          "    " +
                          el.value.slice(el.selectionEnd),
                      );
                      requestAnimationFrame(() =>
                        el.setSelectionRange(pos + 4, pos + 4),
                      );
                    }
                  }}
                />
                <p className="text-dim mt-2 text-xs">
                  Built-ins only · No imports · 64 MB memory · bounded execution
                  · Tab inserts four spaces; Shift+Tab leaves the editor.
                </p>
                <div className="bg-sunken mt-4 overflow-x-auto rounded-xl p-4">
                  <p className="mb-2 text-xs font-semibold">Public example</p>
                  <pre className="text-dim font-mono text-xs leading-6 break-all whitespace-pre-wrap">
                    Input arguments: {JSON.stringify(q.example!.args, null, 2)}
                    {"\n"}Expected: {JSON.stringify(q.example!.expected)}
                  </pre>
                </div>
                <Button
                  variant="secondary"
                  className="mt-4"
                  disabled={running}
                  onClick={() => {
                    const id = q.id;
                    startRun(async () => {
                      try {
                        const r = await runExampleAction(
                          exam.id,
                          id,
                          typeof answers[id] === "string"
                            ? (answers[id] as string)
                            : q.starter!,
                        );
                        setExampleResult({
                          id,
                          message:
                            r.error ??
                            (r.passed
                              ? "Public example passed. Check edge cases before submitting."
                              : "Public example did not pass. Compare your logic with the contract."),
                        });
                      } catch {
                        setExampleResult({
                          id,
                          message: "Could not run the example. Please retry.",
                        });
                      }
                    });
                  }}
                >
                  <Play size={14} />
                  {running ? "Running…" : "Run example"}
                </Button>
                {exampleResult?.id === q.id && (
                  <p role="status" className="text-dim mt-3 text-sm">
                    {exampleResult.message}
                  </p>
                )}
              </>
            )}
            {q.kind === "sequence" && (
              <>
                <p className="text-dim mb-3 text-xs">
                  Use the arrows to arrange the steps from first to last.
                </p>
                <ol className="space-y-3">
                  {(Array.isArray(answers[q.id])
                    ? (answers[q.id] as string[])
                    : q.options!.map((o) => o.id)
                  ).map((id, i) => (
                    <li
                      key={id}
                      className="bg-sunken flex items-center gap-3 rounded-xl border border-[var(--line)] p-3"
                    >
                      <span className="text-ember font-mono text-sm">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="flex-1 text-sm leading-6">
                        {q.options!.find((o) => o.id === id)!.text}
                      </span>
                      <div className="flex shrink-0 flex-col">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          disabled={i === 0}
                          aria-label={`Move step ${i + 1} up`}
                          onClick={() => moveSequence(i, -1)}
                        >
                          <ArrowUp size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          disabled={i === q.options!.length - 1}
                          aria-label={`Move step ${i + 1} down`}
                          onClick={() => moveSequence(i, 1)}
                        >
                          <ArrowDown size={14} />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ol>
                <Button
                  variant="secondary"
                  className="mt-4"
                  onClick={() =>
                    change(
                      Array.isArray(answers[q.id])
                        ? (answers[q.id] as string[])
                        : q.options!.map((o) => o.id),
                    )
                  }
                >
                  <Check size={14} />
                  Confirm this sequence
                </Button>
              </>
            )}
          </fieldset>
          <div className="mt-8 flex items-center justify-between gap-2 border-t border-[var(--line)] pt-5">
            <Button
              variant="ghost"
              disabled={index === 0}
              onClick={() => setIndex(index - 1)}
            >
              <ArrowLeft size={15} />
              Previous
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                index < 44 ? setIndex(index + 1) : setConfirm(true)
              }
            >
              {index < 44 ? "Next question" : "Review & submit"}
              <ArrowRight size={15} />
            </Button>
          </div>
        </Card>
        <Card className="h-fit p-5 xl:sticky xl:top-48">
          <h3 className="text-sm font-semibold">Your exam map</h3>
          <label htmlFor="exam-map-filter" className="sr-only">
            Filter questions
          </label>
          <select
            id="exam-map-filter"
            className="bg-sunken mt-4 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-xs"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All questions</option>
            <option value="unanswered">Unanswered</option>
            <option value="flagged">Flagged for review</option>
            {Object.entries(kindLabels).map(([kind, label]) => (
              <option key={kind} value={kind}>
                {label}
              </option>
            ))}
          </select>
          <div className="mt-4 grid grid-cols-5 gap-2">
            {exam.questions
              .map((item, i) => ({ item, i }))
              .filter(
                ({ item }) =>
                  filter === "all" ||
                  (filter === "unanswered"
                    ? !isAnswered(item, answers)
                    : filter === "flagged"
                      ? flagged.includes(item.id)
                      : item.kind === filter),
              )
              .map(({ item, i }) => (
                <button
                  key={item.id}
                  aria-label={`Question ${i + 1}, ${kindLabels[item.kind]}${isAnswered(item, answers) ? ", answered" : ", unanswered"}${flagged.includes(item.id) ? ", flagged" : ""}`}
                  aria-current={i === index ? "step" : undefined}
                  onClick={() => setIndex(i)}
                  className={cn(
                    "relative h-9 rounded-lg border text-xs font-semibold",
                    i === index
                      ? "border-[var(--ember)] bg-[var(--ember)] text-white"
                      : isAnswered(item, answers)
                        ? "border-[var(--verified)]/30 bg-[var(--verified)]/10 text-[var(--verified)]"
                        : "border-[var(--line)] bg-[var(--sunken)] text-[var(--ink-dim)]",
                  )}
                >
                  {i + 1}
                  {flagged.includes(item.id) && (
                    <span className="absolute -top-1 -right-1 size-2 rounded-full bg-[var(--caution)]" />
                  )}
                </button>
              ))}
          </div>
          <div className="text-dim mt-5 space-y-2 border-t border-[var(--line)] pt-4 text-xs">
            <p>{45 - answered} unanswered</p>
            <p>{flagged.length} flagged for review</p>
            <p className="leading-5">
              You can revisit any question before submitting. Aim to leave 15
              minutes for review.
            </p>
          </div>
        </Card>
      </div>
      <Confirm
        open={confirm}
        onOpenChange={setConfirm}
        title="Submit your exam?"
        description={
          <>
            <p>
              {answered} of 45 questions answered.{" "}
              {45 - answered > 0
                ? `${45 - answered} questions are unanswered.`
                : "Every question has a response."}
            </p>
            <p className="mt-2">
              {flagged.length} flagged for review. Submission is final for this
              attempt. Your score will be generated immediately.
            </p>
          </>
        }
        confirmLabel={submitting ? "Grading…" : "Submit & see my score"}
        onConfirm={() => void submit()}
        pending={submitting}
        tone="default"
      />
    </div>
  );
}
