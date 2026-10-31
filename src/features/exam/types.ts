export const EXAM_VERSION = "aiamc-2026-v1";
export const EXAM_MINUTES = 150;
export const PASS_SCORE = 90;
export const CERTIFICATION_TITLE =
  "AI Agentic MasterClass Certified — AI & LLM Expert Engineer";

export type Answer = string | string[];
export type Answers = Record<string, Answer>;
export type QuestionKind = "mcq" | "fix" | "coding" | "sequence";
export type PublicQuestion = {
  id: string;
  kind: QuestionKind;
  topic: string;
  title: string;
  prompt: string;
  points: number;
  options?: { id: string; text: string }[];
  starter?: string;
  example?: { args: unknown[]; expected: unknown };
};
export type ExamLayout = { ids: string[]; orders: Record<string, string[]> };
export type SectionScore = {
  kind: QuestionKind;
  earned: number;
  possible: number;
};
export type ExamResult = {
  id: string;
  number: number;
  score: number;
  passed: boolean;
  submittedAt: string;
  breakdown: SectionScore[];
};
export type ActiveExam = {
  id: string;
  number: number;
  deadline: string;
  serverNow: string;
  questions: PublicQuestion[];
  answers: Answers;
};
export type CertificateView = { id: string; name: string; issuedAt: string };
export const kindLabels: Record<QuestionKind, string> = {
  mcq: "Multiple choice",
  fix: "Code repair",
  coding: "Coding challenge",
  sequence: "Sequence",
};
