"use client";
import { useState, useTransition } from "react";
import { Calendar, LoaderCircle, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  deleteAssignmentAction,
  upsertAssignmentAction,
} from "@/features/assignments/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
type Assignment = {
  id: string;
  title: string;
  description: string;
  instructions: string;
  sortOrder: number;
  dueDate: string;
  isActive: boolean;
  submissionCount: number;
};
function AssignmentEditor({
  assignment,
  onDone,
}: {
  assignment: Assignment;
  onDone?: () => void;
}) {
  const [pending, start] = useTransition();
  const [data, setData] = useState(assignment);
  const update = <K extends keyof Assignment>(key: K, value: Assignment[K]) =>
    setData((d) => ({ ...d, [key]: value }));
  return (
    <Card className="p-5">
      <div className="grid gap-4 lg:grid-cols-[5rem_1fr_13rem_auto]">
        <div>
          <label className="text-muted mb-2 block text-[10px] tracking-wider uppercase">
            Order
          </label>
          <Input
            type="number"
            min={1}
            value={data.sortOrder}
            onChange={(e) => update("sortOrder", Number(e.target.value))}
          />
        </div>
        <div>
          <label className="text-muted mb-2 block text-[10px] tracking-wider uppercase">
            Title
          </label>
          <Input
            value={data.title}
            onChange={(e) => update("title", e.target.value)}
          />
        </div>
        <div>
          <label className="text-muted mb-2 block text-[10px] tracking-wider uppercase">
            Due date
          </label>
          <div className="relative">
            <Calendar
              size={14}
              className="text-muted absolute top-3.5 left-3"
            />
            <Input
              type="date"
              className="pl-9"
              value={data.dueDate}
              onChange={(e) => update("dueDate", e.target.value)}
            />
          </div>
        </div>
        <label className="text-muted flex items-center gap-2 self-end pb-3 text-xs">
          <input
            type="checkbox"
            checked={data.isActive}
            onChange={(e) => update("isActive", e.target.checked)}
            className="accent-[#d6401a]"
          />
          Active
        </label>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Textarea
          className="min-h-20"
          value={data.description}
          onChange={(e) => update("description", e.target.value)}
          placeholder="Student-facing description"
        />
        <Textarea
          className="min-h-20"
          value={data.instructions}
          onChange={(e) => update("instructions", e.target.value)}
          placeholder="Detailed instructions (optional)"
        />
      </div>
      <div className="mt-4 flex items-center justify-between">
        <p className="text-muted text-[11px]">
          {data.submissionCount} student submission
          {data.submissionCount === 1 ? "" : "s"}
        </p>
        <div className="flex gap-2">
          {data.id && (
            <Button
              variant="danger"
              size="sm"
              disabled={pending}
              onClick={() => {
                if (
                  confirm("Delete this assignment and all of its submissions?")
                )
                  start(async () => {
                    await deleteAssignmentAction(data.id);
                    toast.success("Assignment deleted.");
                  });
              }}
            >
              <Trash2 size={14} />
              Delete
            </Button>
          )}
          <Button
            size="sm"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const result = await upsertAssignmentAction(data);
                if (result.error) toast.error(result.error);
                else {
                  toast.success(
                    data.id ? "Assignment updated." : "Assignment created.",
                  );
                  onDone?.();
                }
              })
            }
          >
            {pending ? (
              <LoaderCircle size={14} className="animate-spin" />
            ) : (
              <Save size={14} />
            )}
            Save
          </Button>
        </div>
      </div>
    </Card>
  );
}
export function AssignmentManager({
  assignments,
}: {
  assignments: Assignment[];
}) {
  const [adding, setAdding] = useState(false);
  const nextOrder = Math.max(0, ...assignments.map((a) => a.sortOrder)) + 1;
  return (
    <>
      <div className="mb-5 flex justify-end">
        <Button onClick={() => setAdding(!adding)}>
          <Plus size={16} />
          Create Assignment
        </Button>
      </div>
      {adding && (
        <div className="mb-4">
          <AssignmentEditor
            onDone={() => setAdding(false)}
            assignment={{
              id: "",
              title: "",
              description: "",
              instructions: "",
              sortOrder: nextOrder,
              dueDate: "",
              isActive: true,
              submissionCount: 0,
            }}
          />
        </div>
      )}
      <div className="space-y-4">
        {assignments.map((assignment) => (
          <AssignmentEditor key={assignment.id} assignment={assignment} />
        ))}
      </div>
    </>
  );
}
