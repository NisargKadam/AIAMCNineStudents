import { CERTIFICATION_TITLE, EXAM_MINUTES, PASS_SCORE } from "./types";

/**
 * Whose masterclass this is. Every certificate a student shares carries this
 * person's tag: in the post text the portal writes, and printed on the share
 * image itself.
 */
export type Instructor = {
  name: string;
  /** Full profile URL, e.g. https://www.linkedin.com/in/someone/ */
  linkedinUrl: string;
  /** Without the "@". Empty hides Instagram sharing, so nothing is shared untagged. */
  instagramHandle: string;
};

export const DEFAULT_INSTRUCTOR: Instructor = {
  name: "Nisarg Kadam",
  linkedinUrl: "https://www.linkedin.com/in/nisarg-kadam-328516a6/",
  instagramHandle: "",
};

const withoutAt = (handle: string) => handle.trim().replace(/^@+/, "");

/**
 * The instructor as configured for this deployment. Read on the server and
 * handed to the client as a prop; the two environment variables let the
 * handles change without a code change.
 */
export function getInstructor(): Instructor {
  return {
    name: DEFAULT_INSTRUCTOR.name,
    linkedinUrl:
      process.env.INSTRUCTOR_LINKEDIN_URL?.trim() ||
      DEFAULT_INSTRUCTOR.linkedinUrl,
    instagramHandle:
      withoutAt(process.env.INSTRUCTOR_INSTAGRAM_HANDLE ?? "") ||
      DEFAULT_INSTRUCTOR.instagramHandle,
  };
}

/** "linkedin.com/in/someone", for printing where a full URL is too long. */
export function linkedinPath(instructor: Instructor) {
  return instructor.linkedinUrl
    .replace(/^https?:\/\/(www\.)?/, "")
    .replace(/\/$/, "");
}

/** The post LinkedIn's composer opens with. */
export function linkedinPost(url: string, instructor: Instructor) {
  return [
    `I am now ${CERTIFICATION_TITLE}.`,
    `I passed the ${EXAM_MINUTES}-minute AI AMC certification exam with a score of ${PASS_SCORE}% or higher, covering LLMs, prompting, agent workflows, RAG, evaluation, guardrails, MCP, and deployment.`,
    `Thank you to my instructor ${instructor.name} for the Agentic AI Masterclass: ${instructor.linkedinUrl}`,
    `Verify my credential: ${url}`,
    "#AIAMC #AgenticAI #LLM #AIEngineering",
  ].join("\n\n");
}

export function linkedinComposeUrl(post: string) {
  return `https://www.linkedin.com/feed/?${new URLSearchParams({
    shareActive: "true",
    text: post,
  })}`;
}

/**
 * The caption for an Instagram post. Instagram turns the pasted "@handle"
 * into a real tag. Null when there is no handle to tag.
 */
export function instagramCaption(url: string, instructor: Instructor) {
  const handle = withoutAt(instructor.instagramHandle);
  if (!handle) return null;
  return [
    `Officially ${CERTIFICATION_TITLE}.`,
    `Passed the AI AMC certification exam. Thank you @${handle} for the Agentic AI Masterclass.`,
    `Verify: ${url}`,
    "#AIAMC #AgenticAI #LLM #AIEngineer",
  ].join("\n\n");
}
