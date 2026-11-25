"use client";
import { useMemo, useState, useTransition } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Check,
  ClipboardPaste,
  Copy,
  Inbox,
  LoaderCircle,
  Search,
  Trash2,
  UserCheck,
  UserX,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  addPreapprovedEmailsAction,
  approveSignupAction,
  declineSignupAction,
  deleteSignupRequestAction,
  removePreapprovedEmailAction,
} from "./signup-actions";
import { Avatar } from "@/components/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { alumniLabel } from "@/lib/access";
import { cn, pluralize } from "@/lib/utils";

export type SignupTab = "waiting" | "approved" | "declined";

export type SignupRow = {
  id: string;
  email: string;
  fullName: string;
  alumniBatch: number;
  createdAt: string;
  decidedAt: string | null;
};

export type PreapprovedRow = {
  email: string;
  /** The account that signed up with this email, if there is one yet. */
  joined: { name: string; avatarUrl: string | null } | null;
};

type Result = { error?: string; success?: string };

function RequestList({
  rows,
  declined,
  busy,
  run,
}: {
  rows: SignupRow[];
  declined: boolean;
  busy: string | null;
  run: (key: string, action: () => Promise<Result>) => void;
}) {
  return (
    <ul className="space-y-3">
      {rows.map((row) => {
        const working = busy === row.id;
        return (
          <li key={row.id}>
            <Card className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
              <div className="flex min-w-0 flex-1 items-center gap-3.5">
                <Avatar name={row.fullName} size="md" />
                <div className="min-w-0">
                  <p className="text-ink flex flex-wrap items-center gap-2 text-sm font-semibold">
                    <span className="truncate">{row.fullName}</span>
                    <Badge tone="halo">{alumniLabel(row.alumniBatch)}</Badge>
                  </p>
                  <p className="text-dim mt-0.5 truncate text-xs">
                    {row.email}
                  </p>
                  <p className="text-faint mt-1 text-[11px]">
                    {declined && row.decidedAt
                      ? `Declined ${formatDistanceToNow(new Date(row.decidedAt), { addSuffix: true })}`
                      : `Asked ${formatDistanceToNow(new Date(row.createdAt), { addSuffix: true })}`}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  variant="verified"
                  size="sm"
                  disabled={working}
                  onClick={() => run(row.id, () => approveSignupAction(row.id))}
                >
                  {working ? (
                    <LoaderCircle size={14} className="animate-spin" />
                  ) : (
                    <UserCheck size={14} />
                  )}
                  {declined ? "Approve anyway" : "Approve"}
                </Button>
                {declined ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={working}
                    onClick={() =>
                      run(row.id, () => deleteSignupRequestAction(row.id))
                    }
                  >
                    <Trash2 size={14} />
                    Delete
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={working}
                    onClick={() =>
                      run(row.id, () => declineSignupAction(row.id))
                    }
                  >
                    <UserX size={14} />
                    Decline
                  </Button>
                )}
              </div>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}

function PreapprovedList({
  emails,
  busy,
  run,
}: {
  emails: PreapprovedRow[];
  busy: string | null;
  run: (
    key: string,
    action: () => Promise<Result>,
    after?: (result: Result) => void,
  ) => void;
}) {
  const [text, setText] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "joined" | "not-yet">("all");

  const joined = emails.filter((row) => row.joined).length;
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return emails.filter(
      (row) =>
        (filter === "all" ||
          (filter === "joined" ? row.joined !== null : row.joined === null)) &&
        (!q ||
          row.email.includes(q) ||
          row.joined?.name.toLowerCase().includes(q)),
    );
  }, [emails, filter, query]);

  async function copyNotJoined() {
    const pending = emails.filter((row) => !row.joined).map((row) => row.email);
    try {
      await navigator.clipboard.writeText(pending.join(", "));
      toast.success(
        `${pending.length} ${pluralize(pending.length, "email")} copied.`,
      );
    } catch {
      toast.error("Could not copy. Select the emails in the list instead.");
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[.9fr_1.1fr]">
      <Card className="h-fit p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="text-dim grid size-10 shrink-0 place-items-center rounded-xl border border-[var(--line)] bg-[var(--sunken)]">
            <ClipboardPaste size={18} />
          </span>
          <div>
            <h2 className="font-display text-ink text-base font-semibold">
              Add emails
            </h2>
            <p className="text-dim mt-1 text-xs leading-5">
              Anyone who signs up with one of these gets in straight away. Paste
              the list as it is: commas, spaces or new lines all work, and
              capitals and duplicates are handled.
            </p>
          </div>
        </div>
        <label htmlFor="preapproved-paste" className="sr-only">
          Emails to pre-approve
        </label>
        <Textarea
          id="preapproved-paste"
          className="mt-5 min-h-40 font-mono text-xs"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={
            "first@example.com, second@example.com\nthird@example.com"
          }
          spellCheck={false}
        />
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-faint text-[11px] leading-4">
            Stored in the portal&apos;s database only.
          </p>
          <Button
            disabled={busy === "paste" || !text.trim()}
            onClick={() =>
              run(
                "paste",
                () => addPreapprovedEmailsAction(text),
                (result) => {
                  setNote(result.success ?? null);
                  setText("");
                },
              )
            }
          >
            {busy === "paste" ? (
              <LoaderCircle size={15} className="animate-spin" />
            ) : (
              <Check size={15} />
            )}
            Add to the list
          </Button>
        </div>
        {note && (
          <p
            role="status"
            className="text-dim mt-4 rounded-xl border border-[var(--line)] bg-[var(--sunken)] px-3.5 py-3 text-xs leading-5 break-words"
          >
            {note}
          </p>
        )}
      </Card>

      <Card className="p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-ink text-base font-semibold">
              Pre-approved emails
            </h2>
            <p className="text-dim mt-1 text-xs">
              {joined} of {emails.length} have joined
            </p>
          </div>
          {emails.length > joined && (
            <Button variant="secondary" size="sm" onClick={copyNotJoined}>
              <Copy size={14} />
              Copy who has not joined
            </Button>
          )}
        </div>
        {emails.length > 0 && (
          <Progress
            className="mt-4"
            tone="verified"
            value={(joined / emails.length) * 100}
          />
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          <div className="relative min-w-40 flex-1">
            <Search
              size={14}
              className="text-faint absolute top-1/2 left-3.5 -translate-y-1/2"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-10 pl-9 text-xs"
              placeholder="Search by email or name"
              aria-label="Search pre-approved emails"
            />
          </div>
          <div className="flex gap-1 rounded-xl border border-[var(--line)] bg-[var(--sunken)] p-1">
            {(
              [
                ["all", "All"],
                ["joined", "Joined"],
                ["not-yet", "Not yet"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                aria-pressed={filter === key}
                onClick={() => setFilter(key)}
                className={cn(
                  "rounded-lg px-3 text-xs font-medium transition-colors",
                  filter === key
                    ? "panel-raised text-ink"
                    : "text-dim hover:text-ink",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {shown.length ? (
          <ul className="mt-4 divide-y divide-[var(--line)]">
            {shown.map((row) => (
              <li key={row.email} className="flex items-center gap-3 py-2.5">
                {row.joined ? (
                  <Avatar
                    name={row.joined.name}
                    url={row.joined.avatarUrl}
                    size="xs"
                  />
                ) : (
                  <span className="size-7 shrink-0 rounded-full border border-dashed border-[var(--line-strong)]" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-ink truncate font-mono text-xs">
                    {row.email}
                  </p>
                  {row.joined && (
                    <p className="text-faint truncate text-[11px]">
                      {row.joined.name}
                    </p>
                  )}
                </div>
                {row.joined ? (
                  <Badge tone="verified">Joined</Badge>
                ) : (
                  <Badge tone="neutral">Not yet</Badge>
                )}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={busy === row.email}
                  onClick={() =>
                    run(row.email, () =>
                      removePreapprovedEmailAction(row.email),
                    )
                  }
                  aria-label={`Remove ${row.email} from the list`}
                  title="Remove from the list"
                >
                  <X size={14} />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-dim py-12 text-center text-sm">
            {emails.length
              ? "No email matches that search."
              : "The list is empty. Paste your alumni emails to let them straight in."}
          </p>
        )}
      </Card>
    </div>
  );
}

export function SignupManager({
  tab,
  waiting,
  declined,
  emails,
}: {
  tab: SignupTab;
  waiting: SignupRow[];
  declined: SignupRow[];
  emails: PreapprovedRow[];
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [, start] = useTransition();

  function run(
    key: string,
    action: () => Promise<Result>,
    after?: (result: Result) => void,
  ) {
    setBusy(key);
    start(async () => {
      try {
        const result = await action();
        if (result.error) toast.error(result.error);
        else {
          toast.success(result.success ?? "Done.");
          after?.(result);
        }
      } catch {
        toast.error("That did not go through. Try again.");
      } finally {
        setBusy(null);
      }
    });
  }

  if (tab === "approved")
    return <PreapprovedList emails={emails} busy={busy} run={run} />;

  const rows = tab === "declined" ? declined : waiting;
  if (rows.length === 0)
    return tab === "declined" ? (
      <EmptyState
        icon={UserX}
        title="Nobody has been declined"
        description="Requests you decline stay here, so you can still approve them later or delete them."
      />
    ) : (
      <EmptyState
        icon={Inbox}
        title="Nobody is waiting"
        description="When a former student signs up with an email that is not pre-approved, their request lands here for you to approve or decline."
      />
    );
  return (
    <RequestList
      rows={rows}
      declined={tab === "declined"}
      busy={busy}
      run={run}
    />
  );
}
