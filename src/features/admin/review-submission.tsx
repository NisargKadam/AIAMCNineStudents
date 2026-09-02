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
  function review(status: "REVIEWED" | "NEEDS_CHANGES" | "COMPLETED") {
    start(async () => {
      const result = await reviewSubmissionAction({
        submissionId: id,
        status,
        feedback,
      });
      if (result.error) toast.error(result.error);
      else
        toast.success(
          `Submission marked ${status.toLowerCase().replaceAll("_", " ")}.`,
        );
    });
  }
  return (
    <div className="mt-4">
      <Textarea
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        className="min-h-20"
        placeholder="Instructor feedback…"
      />
      <div className="mt-2 flex flex-wrap justify-end gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={pending}
          onClick={() => review("REVIEWED")}
        >
          Reviewed
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={pending}
          onClick={() => review("NEEDS_CHANGES")}
        >
          Request changes
        </Button>
        <Button
          size="sm"
          disabled={pending}
          onClick={() => review("COMPLETED")}
        >
          {pending && <LoaderCircle size={14} className="animate-spin" />}
          Complete
        </Button>
      </div>
    </div>
  );
}
