"use client";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  ArrowUpRight,
  Download,
  KeyRound,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  Shield,
  Trash2,
  UserCheck,
  UserPlus,
  UserX,
} from "lucide-react";
import { toast } from "sonner";
import {
  bulkStudentAction,
  changeStudentRoleAction,
  createStudentAction,
  deleteStudentAction,
  resetStudentPasswordAction,
  setStudentActiveAction,
  setStudentPasswordAction,
  updateStudentAction,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Confirm, Modal } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar } from "@/components/avatar";
import { cn, pluralize } from "@/lib/utils";

export type ManagedStudent = {
  id: string;
  email: string;
  role: "ADMIN" | "STUDENT";
  isActive: boolean;
  name: string;
  avatarUrl: string | null;
  githubUsername: string | null;
  currentRole: string | null;
  country: string | null;
  joinedAt: string;
  prereqDone: number;
  prereqTotal: number;
  assignmentDone: number;
  assignmentTotal: number;
};

type Result = { error?: string; success?: unknown };
type Sort = "recent" | "name" | "progress";

export function StudentManager({
  students,
  currentAdminId,
}: {
  students: ManagedStudent[];
  currentAdminId: string;
}) {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<"all" | "ADMIN" | "STUDENT">("all");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [sort, setSort] = useState<Sort>("recent");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<ManagedStudent | null>(null);
  const [passwordFor, setPasswordFor] = useState<ManagedStudent | null>(null);
  const [deleting, setDeleting] = useState<ManagedStudent | null>(null);
  const [bulkDelete, setBulkDelete] = useState(false);
  const [pending, start] = useTransition();

  function run(action: () => Promise<Result>, fallback = "Done.") {
    start(async () => {
      const result = await action();
      if (result.error) toast.error(result.error);
      else
        toast.success(
          typeof result.success === "string" ? result.success : fallback,
        );
    });
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = students.filter((student) => {
      if (role !== "all" && student.role !== role) return false;
      if (status === "active" && !student.isActive) return false;
      if (status === "inactive" && student.isActive) return false;
      if (!q) return true;
      return [
        student.name,
        student.email,
        student.githubUsername,
        student.currentRole,
        student.country,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
    const progress = (s: ManagedStudent) =>
      s.prereqDone / Math.max(s.prereqTotal, 1) +
      s.assignmentDone / Math.max(s.assignmentTotal, 1);
    return [...list].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "progress") return progress(b) - progress(a);
      return b.joinedAt.localeCompare(a.joinedAt);
    });
  }, [students, query, role, status, sort]);

  const selectedList = filtered.filter((student) => selected.has(student.id));
  const allVisibleSelected =
    filtered.length > 0 && filtered.every((s) => selected.has(s.id));

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function exportCsv() {
    const header = [
      "name",
      "email",
      "role",
      "active",
      "github",
      "current_role",
      "country",
      "prerequisites_done",
      "prerequisites_total",
      "assignments_approved",
      "assignments_total",
      "joined_at",
    ];
    const rows = filtered.map((s) =>
      [
        s.name,
        s.email,
        s.role,
        s.isActive ? "yes" : "no",
        s.githubUsername ?? "",
        s.currentRole ?? "",
        s.country ?? "",
        s.prereqDone,
        s.prereqTotal,
        s.assignmentDone,
        s.assignmentTotal,
        s.joinedAt,
      ]
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...rows].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `ai-amc-students-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success(
      `Exported ${filtered.length} ${pluralize(filtered.length, "row")}.`,
    );
  }

  return (
    <>
      <div className="mb-4 grid gap-2 lg:grid-cols-[1fr_auto_auto_auto_auto]">
        <div className="relative">
          <Search
            size={15}
            className="text-faint absolute top-1/2 left-3.5 -translate-y-1/2"
          />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="pl-10"
            placeholder="Search name, email, GitHub, or country"
            aria-label="Search students"
          />
        </div>
        <Select
          aria-label="Filter by role"
          value={role}
          onChange={(event) => setRole(event.target.value as typeof role)}
        >
          <option value="all">All roles</option>
          <option value="STUDENT">Students</option>
          <option value="ADMIN">Administrators</option>
        </Select>
        <Select
          aria-label="Filter by status"
          value={status}
          onChange={(event) => setStatus(event.target.value as typeof status)}
        >
          <option value="all">Any status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </Select>
        <Select
          aria-label="Sort students"
          value={sort}
          onChange={(event) => setSort(event.target.value as Sort)}
        >
          <option value="recent">Newest first</option>
          <option value="name">By name</option>
          <option value="progress">By progress</option>
        </Select>
        <Button onClick={() => setAdding(true)}>
          <Plus size={16} />
          Add student
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="text-dim flex cursor-pointer items-center gap-2 text-xs">
          <input
            type="checkbox"
            className="accent-ember size-4"
            checked={allVisibleSelected}
            onChange={() =>
              setSelected(
                allVisibleSelected
                  ? new Set()
                  : new Set(filtered.map((student) => student.id)),
              )
            }
          />
          Select all shown
        </label>
        <span className="text-faint num text-xs">
          {filtered.length} of {students.length} accounts
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto"
          onClick={exportCsv}
        >
          <Download size={14} />
          Export CSV
        </Button>
      </div>

      {selectedList.length > 0 && (
        <Card
          tone="raised"
          className="rise mb-4 flex flex-wrap items-center gap-3 p-3.5"
        >
          <p className="text-ink num text-xs font-semibold">
            {selectedList.length} selected
          </p>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={pending}
              onClick={() =>
                run(
                  () =>
                    bulkStudentAction(
                      selectedList.map((s) => s.id),
                      "activate",
                    ).then((result) => {
                      setSelected(new Set());
                      return result;
                    }),
                  "Accounts activated.",
                )
              }
            >
              <UserCheck size={14} />
              Activate
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={pending}
              onClick={() =>
                run(
                  () =>
                    bulkStudentAction(
                      selectedList.map((s) => s.id),
                      "deactivate",
                    ).then((result) => {
                      setSelected(new Set());
                      return result;
                    }),
                  "Accounts deactivated.",
                )
              }
            >
              <UserX size={14} />
              Deactivate
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={pending}
              onClick={() => setBulkDelete(true)}
            >
              <Trash2 size={14} />
              Delete
            </Button>
          </div>
        </Card>
      )}

      {filtered.length ? (
        <div className="space-y-2.5">
          {filtered.map((student) => {
            const isSelf = student.id === currentAdminId;
            return (
              <Card key={student.id} className="p-4">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-3 xl:w-80 xl:flex-none">
                    <input
                      type="checkbox"
                      className="accent-ember size-4 shrink-0"
                      checked={selected.has(student.id)}
                      onChange={() => toggle(student.id)}
                      aria-label={`Select ${student.name}`}
                    />
                    <Avatar name={student.name} url={student.avatarUrl} />
                    <div className="min-w-0">
                      <Link
                        href={`/admin/students/${student.id}`}
                        className="text-ink hover:text-ember flex items-center gap-1 truncate text-sm font-semibold transition-colors"
                      >
                        {student.name}
                        <ArrowUpRight size={12} className="shrink-0" />
                      </Link>
                      <p className="text-faint truncate text-[11px]">
                        {student.email}
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {student.role === "ADMIN" && (
                          <Badge tone="ember">Admin</Badge>
                        )}
                        {!student.isActive && (
                          <Badge tone="alert">Inactive</Badge>
                        )}
                        {isSelf && <Badge tone="halo">You</Badge>}
                      </div>
                    </div>
                  </div>

                  <div className="grid flex-1 gap-3 sm:grid-cols-2">
                    <Progress
                      tone={
                        student.prereqDone === student.prereqTotal
                          ? "verified"
                          : "ember"
                      }
                      label={`Readiness ${student.prereqDone}/${student.prereqTotal}`}
                      value={
                        (student.prereqDone /
                          Math.max(student.prereqTotal, 1)) *
                        100
                      }
                    />
                    <Progress
                      tone={
                        student.assignmentDone === student.assignmentTotal
                          ? "verified"
                          : "ember"
                      }
                      label={`Assignments ${student.assignmentDone}/${student.assignmentTotal}`}
                      value={
                        (student.assignmentDone /
                          Math.max(student.assignmentTotal, 1)) *
                        100
                      }
                    />
                  </div>

                  <div className="flex flex-wrap gap-1 xl:justify-end">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      title="Edit details"
                      aria-label={`Edit ${student.name}`}
                      onClick={() => setEditing(student)}
                    >
                      <Pencil size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      title="Set password"
                      aria-label={`Set password for ${student.name}`}
                      onClick={() => setPasswordFor(student)}
                    >
                      <KeyRound size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={pending || isSelf}
                      title={
                        student.role === "ADMIN"
                          ? "Change to student"
                          : "Promote to administrator"
                      }
                      aria-label={`Change role for ${student.name}`}
                      onClick={() =>
                        run(() =>
                          changeStudentRoleAction(
                            student.id,
                            student.role === "ADMIN" ? "STUDENT" : "ADMIN",
                          ),
                        )
                      }
                    >
                      <Shield size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={pending || isSelf}
                      title={student.isActive ? "Deactivate" : "Activate"}
                      aria-label={`${student.isActive ? "Deactivate" : "Activate"} ${student.name}`}
                      onClick={() =>
                        run(() =>
                          setStudentActiveAction(student.id, !student.isActive),
                        )
                      }
                    >
                      {student.isActive ? (
                        <UserX size={14} />
                      ) : (
                        <UserCheck size={14} />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={pending || isSelf}
                      title="Delete account"
                      aria-label={`Delete ${student.name}`}
                      className={cn(!isSelf && "hover:text-[var(--alert)]")}
                      onClick={() => setDeleting(student)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={UserPlus}
          title="No accounts match these filters"
          description="Clear the search or filters, or add the first student to this cohort."
          action={
            <Button onClick={() => setAdding(true)}>
              <Plus size={16} />
              Add student
            </Button>
          }
        />
      )}

      {/* Add ------------------------------------------------------- */}
      <Modal
        open={adding}
        onOpenChange={setAdding}
        title="Add a student"
        description="They sign in with this email. Leave the password blank to use the cohort default."
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            run(
              () =>
                createStudentAction({
                  fullName: form.get("fullName"),
                  email: form.get("email"),
                  githubUsername: form.get("githubUsername"),
                  password: form.get("password"),
                }).then((result) => {
                  if (!result.error) setAdding(false);
                  return result;
                }),
              "Student created.",
            );
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" htmlFor="new-name">
              <Input id="new-name" name="fullName" required autoFocus />
            </Field>
            <Field label="Email" htmlFor="new-email">
              <Input id="new-email" name="email" type="email" required />
            </Field>
            <Field label="GitHub username" htmlFor="new-github">
              <Input
                id="new-github"
                name="githubUsername"
                placeholder="octocat"
              />
            </Field>
            <Field
              label="Password"
              htmlFor="new-password"
              hint="Optional. At least 12 characters."
            >
              <Input
                id="new-password"
                name="password"
                type="password"
                minLength={12}
                autoComplete="new-password"
              />
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setAdding(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <LoaderCircle size={15} className="animate-spin" />}
              Create account
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit ------------------------------------------------------ */}
      <Modal
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        title="Edit student"
        description="Changes appear everywhere in the portal immediately."
      >
        {editing && (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              run(
                () =>
                  updateStudentAction({
                    userId: editing.id,
                    fullName: form.get("fullName"),
                    email: form.get("email"),
                    githubUsername: form.get("githubUsername"),
                    currentRole: form.get("currentRole"),
                    country: form.get("country"),
                  }).then((result) => {
                    if (!result.error) setEditing(null);
                    return result;
                  }),
                "Student updated.",
              );
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" htmlFor="edit-name">
                <Input
                  id="edit-name"
                  name="fullName"
                  defaultValue={editing.name}
                  required
                />
              </Field>
              <Field label="Email" htmlFor="edit-email">
                <Input
                  id="edit-email"
                  name="email"
                  type="email"
                  defaultValue={editing.email}
                  required
                />
              </Field>
              <Field label="GitHub username" htmlFor="edit-github">
                <Input
                  id="edit-github"
                  name="githubUsername"
                  defaultValue={editing.githubUsername ?? ""}
                />
              </Field>
              <Field label="Current role" htmlFor="edit-role">
                <Input
                  id="edit-role"
                  name="currentRole"
                  defaultValue={editing.currentRole ?? ""}
                />
              </Field>
              <Field label="Country" htmlFor="edit-country">
                <Input
                  id="edit-country"
                  name="country"
                  defaultValue={editing.country ?? ""}
                />
              </Field>
            </div>
            <div className="flex flex-wrap justify-between gap-2 pt-1">
              <Button
                type="button"
                variant="secondary"
                disabled={pending}
                onClick={() =>
                  run(() => resetStudentPasswordAction(editing.id))
                }
              >
                <KeyRound size={14} />
                Reset to default password
              </Button>
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
                  Save changes
                </Button>
              </div>
            </div>
          </form>
        )}
      </Modal>

      {/* Set password --------------------------------------------- */}
      <Modal
        open={passwordFor !== null}
        onOpenChange={(open) => !open && setPasswordFor(null)}
        title="Set a password"
        description="The student is signed out everywhere. Share the new password with them directly."
        width="26rem"
      >
        {passwordFor && (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              run(
                () =>
                  setStudentPasswordAction({
                    userId: passwordFor.id,
                    password: form.get("password"),
                  }).then((result) => {
                    if (!result.error) setPasswordFor(null);
                    return result;
                  }),
                "Password set.",
              );
            }}
          >
            <p className="text-dim text-xs">
              For {passwordFor.name} ({passwordFor.email})
            </p>
            <Field
              label="New password"
              htmlFor="set-password"
              hint="At least 12 characters."
            >
              <Input
                id="set-password"
                name="password"
                type="password"
                minLength={12}
                required
                autoFocus
                autoComplete="new-password"
              />
            </Field>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setPasswordFor(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                Set password
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete --------------------------------------------------- */}
      <Confirm
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete ${deleting?.name ?? "this account"}?`}
        description={
          <>
            This removes their profile, checklist progress, submissions, posts,
            and comments. It cannot be undone. Deactivate instead if you only
            want to block sign-in.
          </>
        }
        confirmLabel="Delete permanently"
        pending={pending}
        onConfirm={() => {
          const target = deleting;
          if (!target) return;
          setDeleting(null);
          run(() => deleteStudentAction(target.id), "Account deleted.");
        }}
      />

      <Confirm
        open={bulkDelete}
        onOpenChange={setBulkDelete}
        title={`Delete ${selectedList.length} ${pluralize(selectedList.length, "account")}?`}
        description="Every selected account and all of their portal data are removed. This cannot be undone."
        confirmLabel="Delete permanently"
        pending={pending}
        onConfirm={() => {
          const ids = selectedList.map((student) => student.id);
          setBulkDelete(false);
          run(
            () =>
              bulkStudentAction(ids, "delete").then((result) => {
                setSelected(new Set());
                return result;
              }),
            "Accounts deleted.",
          );
        }}
      />
    </>
  );
}
