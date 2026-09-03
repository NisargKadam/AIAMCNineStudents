"use client";
import { useState, useTransition } from "react";
import {
  CalendarDays,
  ExternalLink,
  LoaderCircle,
  Pencil,
  Play,
  Plus,
  Trash2,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import { deleteSessionAction, upsertSessionAction } from "./actions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Confirm, Modal } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { pluralize } from "@/lib/utils";
import {
  formatSessionTime,
  isoToLocalInput,
  localInputToIso,
} from "./schedule";

export type CohortSession = {
  id: string;
  sortOrder: number;
  title: string;
  description: string | null;
  scheduledAt: string | null;
  joinUrl: string | null;
  recordingUrl: string | null;
  isActive: boolean;
};

type Draft = Omit<CohortSession, "id"> & { id: string };

const blank = (sortOrder: number): Draft => ({
  id: "",
  sortOrder,
  title: `Session ${sortOrder}`,
  description: "",
  scheduledAt: "",
  joinUrl: "",
  recordingUrl: "",
  isActive: true,
});

export function SessionBoard({
  sessions,
  canEdit,
  nextSessionId,
}: {
  sessions: CohortSession[];
  canEdit: boolean;
  /** Decided on the server so the clock is read once per request. */
  nextSessionId: string | null;
}) {
  const [editing, setEditing] = useState<Draft | null>(null);
  const [deleting, setDeleting] = useState<CohortSession | null>(null);
  const [pending, start] = useTransition();

  const recorded = sessions.filter((s) => s.recordingUrl).length;
  const next = sessions.find((s) => s.id === nextSessionId);
  const nextOrder = Math.max(0, ...sessions.map((s) => s.sortOrder)) + 1;

  function save(draft: Draft) {
    let scheduledAt: string;
    try {
      scheduledAt = localInputToIso(draft.scheduledAt ?? "");
    } catch {
      toast.error("That date and time could not be read. Pick it again.");
      return;
    }

    start(async () => {
      const result = await upsertSessionAction({
        id: draft.id || undefined,
        sortOrder: draft.sortOrder,
        title: draft.title,
        description: draft.description ?? "",
        scheduledAt,
        joinUrl: draft.joinUrl ?? "",
        recordingUrl: draft.recordingUrl ?? "",
        isActive: draft.isActive,
      });
      if (result.error) toast.error(result.error);
      else {
        toast.success(result.success ?? "Saved.");
        setEditing(null);
      }
    });
  }

  return (
    <>
      <Card className="mb-5 p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {next ? (
              <>
                <p className="text-dim flex items-center gap-2 text-xs">
                  <span className="live-dot size-1.5 rounded-full bg-[var(--verified)]" />
                  Next up
                </p>
                <p className="font-display text-ink mt-2 text-lg font-semibold">
                  {next.title}
                </p>
                <p className="text-dim mt-1 text-xs">
                  {next.scheduledAt && formatSessionTime(next.scheduledAt)}
                </p>
              </>
            ) : (
              <>
                <p className="text-dim text-xs">Schedule</p>
                <p className="font-display text-ink mt-2 text-lg font-semibold">
                  No upcoming session on the calendar
                </p>
                <p className="text-dim mt-1 text-xs">
                  {canEdit
                    ? "Add a date and a join link to a session below."
                    : "Your instructor will post the next date here."}
                </p>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-[var(--line)] bg-[var(--sunken)] px-4 py-3 text-center">
              <p className="num font-display text-ink text-xl font-semibold">
                {recorded}
                <span className="text-faint text-sm"> / {sessions.length}</span>
              </p>
              <p className="text-faint mt-0.5 text-[11px]">recordings posted</p>
            </div>
            {next?.joinUrl && (
              <Button asChild>
                <a
                  href={next.joinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Video size={15} />
                  Join next session
                </a>
              </Button>
            )}
          </div>
        </div>
      </Card>

      {canEdit && (
        <div className="mb-4 flex items-center justify-between">
          <p className="text-dim text-xs">
            {sessions.length} {pluralize(sessions.length, "session")}. Students
            see the links but cannot change them.
          </p>
          <Button onClick={() => setEditing(blank(nextOrder))}>
            <Plus size={16} />
            Add session
          </Button>
        </div>
      )}

      {sessions.length ? (
        <div className="space-y-2.5">
          {sessions.map((session) => (
            <Card key={session.id} className="p-4 sm:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                <div className="flex min-w-0 flex-1 items-start gap-3.5">
                  <span className="text-faint num grid size-10 shrink-0 place-items-center rounded-xl border border-[var(--line)] bg-[var(--sunken)] font-mono text-xs">
                    {String(session.sortOrder).padStart(2, "0")}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-ink text-sm font-semibold">
                        {session.title}
                      </h2>
                      {!session.isActive && (
                        <Badge tone="neutral">Hidden</Badge>
                      )}
                      {session.recordingUrl && (
                        <Badge tone="verified">Recorded</Badge>
                      )}
                    </div>
                    {session.description && (
                      <p className="text-dim mt-1.5 text-xs leading-5">
                        {session.description}
                      </p>
                    )}
                    {session.scheduledAt && (
                      <p className="text-faint mt-2 flex items-center gap-1.5 text-[11px]">
                        <CalendarDays size={11} />
                        {formatSessionTime(session.scheduledAt)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                  {session.joinUrl ? (
                    <Button asChild variant="secondary" size="sm">
                      <a
                        href={session.joinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Video size={14} />
                        Join session
                        <ExternalLink size={11} />
                      </a>
                    </Button>
                  ) : (
                    <span className="text-faint rounded-lg border border-dashed border-[var(--line)] px-3 py-1.5 text-[11px]">
                      Join link not posted
                    </span>
                  )}

                  {session.recordingUrl ? (
                    <Button asChild size="sm">
                      <a
                        href={session.recordingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Play size={14} />
                        Watch recording
                        <ExternalLink size={11} />
                      </a>
                    </Button>
                  ) : (
                    <span className="text-faint rounded-lg border border-dashed border-[var(--line)] px-3 py-1.5 text-[11px]">
                      Recording not posted
                    </span>
                  )}

                  {canEdit && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Edit ${session.title}`}
                        onClick={() =>
                          setEditing({
                            ...session,
                            description: session.description ?? "",
                            joinUrl: session.joinUrl ?? "",
                            recordingUrl: session.recordingUrl ?? "",
                            scheduledAt: isoToLocalInput(session.scheduledAt),
                          })
                        }
                      >
                        <Pencil size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Delete ${session.title}`}
                        className="hover:text-[var(--alert)]"
                        onClick={() => setDeleting(session)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Video}
          title="No sessions yet"
          description={
            canEdit
              ? "Add the first session, then post its join link and recording."
              : "Your instructor has not published the schedule yet."
          }
          action={
            canEdit ? (
              <Button onClick={() => setEditing(blank(1))}>
                <Plus size={16} />
                Add session
              </Button>
            ) : undefined
          }
        />
      )}

      <Modal
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        title={editing?.id ? "Edit session" : "Add session"}
        description="Students see everything here as soon as you save it."
      >
        {editing && (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              save(editing);
            }}
          >
            <div className="grid gap-4 sm:grid-cols-[6rem_1fr]">
              <Field label="Number" htmlFor="session-order">
                <Input
                  id="session-order"
                  type="number"
                  min={1}
                  value={editing.sortOrder}
                  onChange={(event) =>
                    setEditing({
                      ...editing,
                      sortOrder: Number(event.target.value),
                    })
                  }
                />
              </Field>
              <Field label="Title" htmlFor="session-title">
                <Input
                  id="session-title"
                  value={editing.title}
                  onChange={(event) =>
                    setEditing({ ...editing, title: event.target.value })
                  }
                  required
                  placeholder="What this session covers"
                />
              </Field>
            </div>

            <Field
              label="Date and time"
              htmlFor="session-when"
              hint="Optional. Saved in your timezone, shown to everyone in theirs."
            >
              <Input
                id="session-when"
                type="datetime-local"
                value={editing.scheduledAt ?? ""}
                onChange={(event) =>
                  setEditing({ ...editing, scheduledAt: event.target.value })
                }
              />
            </Field>

            <Field
              label="Join link"
              htmlFor="session-join"
              hint="The live meeting link students click to attend."
            >
              <Input
                id="session-join"
                type="url"
                className="font-mono text-xs"
                value={editing.joinUrl ?? ""}
                onChange={(event) =>
                  setEditing({ ...editing, joinUrl: event.target.value })
                }
                placeholder="https://meet.google.com/..."
              />
            </Field>

            <Field
              label="Recording link"
              htmlFor="session-recording"
              hint="Paste the YouTube URL once the session is up."
            >
              <Input
                id="session-recording"
                type="url"
                className="font-mono text-xs"
                value={editing.recordingUrl ?? ""}
                onChange={(event) =>
                  setEditing({ ...editing, recordingUrl: event.target.value })
                }
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </Field>

            <Field label="Notes" htmlFor="session-notes">
              <Textarea
                id="session-notes"
                className="min-h-20"
                maxLength={1000}
                value={editing.description ?? ""}
                onChange={(event) =>
                  setEditing({ ...editing, description: event.target.value })
                }
                placeholder="What to prepare, or what was covered."
              />
            </Field>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <label className="text-dim flex cursor-pointer items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  className="accent-ember size-4"
                  checked={editing.isActive}
                  onChange={(event) =>
                    setEditing({ ...editing, isActive: event.target.checked })
                  }
                />
                Visible to students
              </label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setEditing(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending && (
                    <LoaderCircle size={15} className="animate-spin" />
                  )}
                  {editing.id ? "Save session" : "Add session"}
                </Button>
              </div>
            </div>
          </form>
        )}
      </Modal>

      <Confirm
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete ${deleting?.title ?? "this session"}?`}
        description="The session and its links are removed for everyone. This cannot be undone."
        confirmLabel="Delete session"
        pending={pending}
        onConfirm={() => {
          const target = deleting;
          if (!target) return;
          setDeleting(null);
          start(async () => {
            const result = await deleteSessionAction(target.id);
            if (result.error) toast.error(result.error);
            else toast.success(result.success ?? "Session deleted.");
          });
        }}
      />
    </>
  );
}
