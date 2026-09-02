"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Bell,
  BookOpenCheck,
  ClipboardCheck,
  GraduationCap,
  House,
  Info,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  ShieldCheck,
  Sun,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { Avatar } from "@/components/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/features/auth/actions";
import { cn } from "@/lib/utils";

const studentNav = [
  { href: "/dashboard", label: "Dashboard", icon: House },
  { href: "/prerequisites", label: "Prerequisites", icon: BookOpenCheck },
  { href: "/profile", label: "My Profile", icon: UserRound },
  { href: "/assignments", label: "Assignments", icon: ClipboardCheck },
  { href: "/community", label: "Community", icon: MessageSquare },
  { href: "/students", label: "Students", icon: UsersRound },
  { href: "/about", label: "About", icon: Info },
];
const adminNav = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/students", label: "Students", icon: GraduationCap },
  { href: "/admin/assignments", label: "Assignments", icon: ClipboardCheck },
  { href: "/admin/prerequisites", label: "Prerequisites", icon: BookOpenCheck },
  { href: "/admin/community", label: "Community", icon: ShieldCheck },
];

export function AppShell({
  user,
  children,
}: {
  user: {
    name: string;
    email: string;
    role: "ADMIN" | "STUDENT";
    avatarUrl?: string | null;
  };
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [dim, setDim] = useState(false);
  const [profileMenu, setProfileMenu] = useState(false);
  const path = usePathname();
  const pageTitle = path.startsWith("/admin/students/")
    ? "Student detail"
    : path.startsWith("/admin")
      ? "Admin Console"
      : ({
          "/dashboard": "Dashboard",
          "/prerequisites": "Prerequisites",
          "/profile": "My Profile",
          "/assignments": "Assignments",
          "/community": "Community",
          "/students": "Students",
          "/about": "About",
        }[path] ?? "Student Portal");
  const nav = (items: typeof studentNav) => (
    <nav className="space-y-1">
      {items.map(({ href, label, icon: Icon }) => {
        const active =
          href === "/dashboard"
            ? path === href
            : path === href || path.startsWith(`${href}/`);
        return (
          <Link
            onClick={() => setOpen(false)}
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
              active
                ? "bg-white/[.08] text-white shadow-inner"
                : "text-muted hover:bg-white/[.04] hover:text-white",
            )}
          >
            <Icon size={18} className={active ? "text-accent" : ""} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
  const sidebar = (
    <div className="flex h-full flex-col p-4">
      <div className="px-2 py-3">
        <Brand />
      </div>
      <div className="mt-6 flex-1 overflow-y-auto">
        {nav(studentNav)}
        {user.role === "ADMIN" && (
          <>
            <p className="text-muted/60 mt-7 mb-2 px-3 text-[10px] font-bold tracking-[.2em] uppercase">
              Admin Console
            </p>
            {nav(adminNav)}
          </>
        )}
      </div>
      <div className="mt-4 border-t border-white/[.07] pt-4">
        <div className="flex items-center gap-3 px-2">
          <Avatar name={user.name} url={user.avatarUrl} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-white">
              {user.name}
            </p>
            <p className="text-muted truncate text-[10px]">{user.email}</p>
          </div>
          <Badge tone={user.role === "ADMIN" ? "accent" : "neutral"}>
            {user.role}
          </Badge>
        </div>
        <form action={logoutAction}>
          <Button
            type="submit"
            variant="ghost"
            className="mt-3 w-full justify-start"
          >
            <LogOut size={16} />
            Sign out
          </Button>
        </form>
      </div>
    </div>
  );
  return (
    <div className="bg-background min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-white/[.07] bg-[#11151b] lg:block">
        {sidebar}
      </aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            className="absolute inset-0 bg-black/70"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
          />
          <aside className="relative h-full w-[86%] max-w-72 bg-[#11151b] shadow-2xl">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-3 right-3"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
            >
              <X />
            </Button>
            {sidebar}
          </aside>
        </div>
      )}
      <div className="lg:pl-64">
        <header className="bg-background/85 sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/[.07] px-4 backdrop-blur-xl sm:px-7">
          <Button
            className="lg:hidden"
            variant="ghost"
            size="icon"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu />
          </Button>
          <div className="text-muted hidden items-center gap-2 text-xs lg:flex">
            <span>AI AMC Nine</span>
            <span>/</span>
            <span className="text-white">{pageTitle}</span>
          </div>
          <div className="relative ml-auto flex items-center gap-2">
            <span className="text-muted hidden text-xs sm:block">
              Agentic AI Masterclass
            </span>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Notifications"
              title="Notifications"
            >
              <Bell size={17} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Toggle theme"
              title="Toggle theme"
              onClick={() => {
                document.documentElement.classList.toggle("light");
                setDim(!dim);
              }}
            >
              {dim ? <Moon size={17} /> : <Sun size={17} />}
            </Button>
            <div
              className="size-2 rounded-full bg-emerald-400 shadow-[0_0_12px_#34d399]"
              title="System online"
            />
            <Button
              variant="ghost"
              size="icon"
              aria-label="Open profile menu"
              onClick={() => setProfileMenu(!profileMenu)}
            >
              <Avatar name={user.name} url={user.avatarUrl} size="sm" />
            </Button>
            {profileMenu && (
              <div className="absolute top-12 right-0 z-50 w-52 rounded-2xl border border-white/10 bg-[#1b222d] p-2 shadow-2xl">
                <div className="border-b border-white/[.07] px-3 pt-2 pb-3">
                  <p className="truncate text-xs font-semibold text-white">
                    {user.name}
                  </p>
                  <p className="text-muted truncate text-[10px]">
                    {user.email}
                  </p>
                </div>
                <Link
                  href="/profile"
                  onClick={() => setProfileMenu(false)}
                  className="text-muted mt-1 block rounded-xl px-3 py-2 text-xs hover:bg-white/[.06] hover:text-white"
                >
                  View profile
                </Link>
                <form action={logoutAction}>
                  <button className="text-muted w-full rounded-xl px-3 py-2 text-left text-xs hover:bg-white/[.06] hover:text-white">
                    Sign out
                  </button>
                </form>
              </div>
            )}
          </div>
        </header>
        <main
          id="main-content"
          className="mx-auto max-w-[1500px] px-4 py-7 sm:px-7 lg:px-9 lg:py-9"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
