"use client";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  KeyRound,
  LoaderCircle,
  Plus,
  Search,
  Shield,
  UserCheck,
  UserX,
} from "lucide-react";
import { toast } from "sonner";
import {
  changeStudentRoleAction,
  createStudentAction,
  resetStudentPasswordAction,
  setStudentActiveAction,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar } from "@/components/avatar";
type Student = {
  id: string;
  email: string;
  role: "ADMIN" | "STUDENT";
  isActive: boolean;
  name: string;
  avatarUrl: string | null;
  githubUsername: string | null;
  prereqDone: number;
  prereqTotal: number;
  assignmentDone: number;
  assignmentTotal: number;
};
export function StudentManager({ students }: { students: Student[] }) {
  const [query, setQuery] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [pending, start] = useTransition();
  const filtered = useMemo(
    () =>
      students.filter((s) =>
        `${s.name} ${s.email} ${s.githubUsername}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [students, query],
  );
  function run(
    action: () => Promise<{ error?: string; success?: unknown }>,
    message: string,
  ) {
    start(async () => {
      const result = await action();
      if (result.error) toast.error(result.error);
      else toast.success(message);
    });
  }
  return (
    <>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="text-muted absolute top-3.5 left-3.5" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10"
            placeholder="Search name, email, or GitHub…"
          />
        </div>
        <Button onClick={() => setShowAdd(!showAdd)}>
          <Plus size={16} />
          Add Student
        </Button>
      </div>
      {showAdd && (
        <Card className="mb-5 p-5">
          <form
            className="grid gap-3 sm:grid-cols-4"
            onSubmit={(e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              run(
                () =>
                  createStudentAction({
                    fullName: form.get("fullName"),
                    email: form.get("email"),
                    githubUsername: form.get("githubUsername"),
                  }),
                "Student created.",
              );
            }}
          >
            <Input name="fullName" required placeholder="Full name" />
            <Input name="email" required type="email" placeholder="Email" />
            <Input
              name="githubUsername"
              placeholder="GitHub username (optional)"
            />
            <Input
              name="password"
              type="password"
              minLength={12}
              placeholder="Password (optional; 12+ chars)"
              autoComplete="new-password"
            />
            <div className="flex justify-end sm:col-span-3">
              <Button disabled={pending} type="submit">
                {pending && <LoaderCircle size={15} className="animate-spin" />}
                Create account
              </Button>
            </div>
          </form>
        </Card>
      )}
      <div className="space-y-3">
        {filtered.map((student) => (
          <Card key={student.id} className="p-4 sm:p-5">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center">
              <div className="flex min-w-0 items-center gap-3 xl:w-72">
                <Avatar name={student.name} url={student.avatarUrl} />
                <div className="min-w-0">
                  <Link
                    href={`/admin/students/${student.id}`}
                    className="truncate text-sm font-semibold text-white hover:text-[#ff987e]"
                  >
                    {student.name}
                  </Link>
                  <p className="text-muted truncate text-[11px]">
                    {student.email}
                  </p>
                  <div className="mt-1 flex gap-1">
                    <Badge
                      tone={student.role === "ADMIN" ? "accent" : "neutral"}
                    >
                      {student.role}
                    </Badge>
                    {!student.isActive && <Badge tone="danger">INACTIVE</Badge>}
                  </div>
                </div>
              </div>
              <div className="grid flex-1 gap-3 sm:grid-cols-2">
                <Progress
                  label={`Prerequisites ${student.prereqDone}/${student.prereqTotal}`}
                  value={
                    (student.prereqDone / Math.max(student.prereqTotal, 1)) *
                    100
                  }
                />
                <Progress
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
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    run(
                      () =>
                        setStudentActiveAction(student.id, !student.isActive),
                      student.isActive
                        ? "Account deactivated."
                        : "Account activated.",
                    )
                  }
                >
                  {student.isActive ? (
                    <UserX size={14} />
                  ) : (
                    <UserCheck size={14} />
                  )}
                  <span className="hidden 2xl:inline">
                    {student.isActive ? "Deactivate" : "Activate"}
                  </span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() => {
                    if (
                      confirm(
                        "Reset this student's password to the configured cohort default?",
                      )
                    )
                      run(
                        () => resetStudentPasswordAction(student.id),
                        "Password reset and sessions revoked.",
                      );
                  }}
                >
                  <KeyRound size={14} />
                  <span className="hidden 2xl:inline">Reset</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() => {
                    if (
                      confirm(
                        `Change role to ${student.role === "ADMIN" ? "STUDENT" : "ADMIN"}?`,
                      )
                    )
                      run(
                        () =>
                          changeStudentRoleAction(
                            student.id,
                            student.role === "ADMIN" ? "STUDENT" : "ADMIN",
                          ),
                        "Role updated.",
                      );
                  }}
                >
                  <Shield size={14} />
                  <span className="hidden 2xl:inline">
                    {student.role === "ADMIN" ? "Demote" : "Promote"}
                  </span>
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
      {!filtered.length && (
        <Card className="text-muted p-12 text-center text-sm">
          No students match this search.
        </Card>
      )}
    </>
  );
}
