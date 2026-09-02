"use client";
import { useState, useTransition } from "react";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { reviewSubmissionAction } from "@/features/assignments/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function ReviewSubmission({
  id,
  currentFeedback,
}: {
  id: string;
  currentFeedback: string;
}) {
  const [feedback, setFeedback] = useState(currentFeedback);
  const [pending, start] = useTransition();

  function review(
    status: "REVIEWED" | "NEEDS_CHANGES" | "COMPLETED",
    message: string,
  ) {
    start(async () => {
      const result = await reviewSubmissionAction({
        submissionId: id,
        status,
        feedback,
      });
      if (result.error) toast.error(result.error);
      else toast.success(message);
    });
  }

  return (
    <div className="mt-4 border-t border-[var(--line)] pt-4">
      <label
        htmlFor={`feedback-${id}`}
        className="text-ink mb-2 block text-xs font-semibold"
      >
        Feedback for the student
      </label>
      <Textarea
        id={`feedback-${id}`}
        value={feedback}
        onChange={(event) => setFeedback(event.target.value)}
        className="min-h-20"
        maxLength={2000}
        placeholder="What is good, and what should change?"
      />
      <div className="mt-2.5 flex flex-wrap justify-end gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={pending}
          onClick={() => review("REVIEWED", "Marked as reviewed.")}
        >
          Mark reviewed
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={pending}
          onClick={() => review("NEEDS_CHANGES", "Changes requested.")}
        >
          Request changes
        </Button>
        <Button
          variant="verified"
          size="sm"
          disabled={pending}
          onClick={() => review("COMPLETED", "Submission approved.")}
        >
          {pending && <LoaderCircle size={14} className="animate-spin" />}
          Approve
        </Button>
      </div>
    </div>
  );
}
