"use client";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import * as DropdownPrimitive from "@radix-ui/react-dropdown-menu";
import {
  Bell,
  LogOut,
  Menu,
  Moon,
  Search,
  Sun,
  UserRound,
  X,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { Avatar } from "@/components/avatar";
import { CommandPalette } from "@/components/command-palette";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  navSections,
  sectionForPath,
  titleForPath,
  type NavItem,
} from "@/components/nav-config";
import { toggleTheme as applyTheme, useTheme } from "@/components/use-theme";
import { logoutAction } from "@/features/auth/actions";
import { cn } from "@/lib/utils";

export type ShellUser = {
  name: string;
  email: string;
  role: "ADMIN" | "STUDENT";
  avatarUrl?: string | null;
};

export type ShellSignal = {
  id: string;
  title: string;
  detail: string;
  href: string;
  tone: "ember" | "verified" | "caution" | "neutral";
};

/** Inline pending hint — fixed size, so a slow route never shifts the rail. */
function PendingHint() {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden
      className={cn(
        "bg-ember size-1.5 shrink-0 rounded-full transition-opacity duration-200",
        pending ? "animate-pulse opacity-100" : "opacity-0",
      )}
    />
  );
}

function RailLink({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors duration-200",
        active ? "text-ink" : "text-dim hover:text-ink",
      )}
    >
      {active && (
        <motion.span
          layoutId="rail-active"
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
          className="absolute inset-0 rounded-xl border border-[var(--line-strong)] bg-[var(--raised)] shadow-[0_10px_24px_-18px_rgba(0,0,0,.9)]"
        />
      )}
      <span
        aria-hidden
        className={cn(
          "absolute top-1/2 -left-4 h-5 w-[3px] -translate-y-1/2 rounded-r-full transition-all duration-300",
          active ? "bg-ember opacity-100" : "opacity-0",
        )}
      />
      <Icon
        size={17}
        className={cn(
          "relative shrink-0 transition-colors",
          active ? "text-ember" : "text-faint group-hover:text-dim",
        )}
      />
      <span className="relative flex-1 truncate font-medium">{item.label}</span>
      <PendingHint />
    </Link>
  );
}

export function AppShell({
  user,
  signals,
  children,
}: {
  user: ShellUser;
  signals: ShellSignal[];
  children: React.ReactNode;
}) {
  const path = usePathname();
  const [drawer, setDrawer] = useState(false);
  const [palette, setPalette] = useState(false);
  const theme = useTheme();

  const toggleTheme = useCallback(() => {
    applyTheme();
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPalette((open) => !open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const sections = navSections.filter(
    (section) => !section.adminOnly || user.role === "ADMIN",
  );

  const rail = (
    <div className="flex h-full flex-col">
      <div className="px-5 pt-5 pb-4">
        <Brand />
      </div>

      <div className="px-5 pb-4">
        <button
          type="button"
          onClick={() => setPalette(true)}
          className="text-faint hover:border-ember/50 hover:text-dim flex w-full items-center gap-2.5 rounded-xl border border-[var(--line)] bg-[var(--sunken)] px-3 py-2.5 text-xs transition-colors"
        >
          <Search size={14} />
          <span className="flex-1 text-left">Jump to…</span>
          <kbd className="rounded border border-[var(--line)] px-1.5 py-0.5 font-mono text-[10px]">
            ⌘K
          </kbd>
        </button>
      </div>

      <nav className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 pb-4">
        {sections.map((section) => (
          <div key={section.heading}>
            <p className="text-faint mb-1.5 px-3 text-[11px] font-medium">
              {section.heading}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <RailLink
                  key={item.href}
                  item={item}
                  active={
                    item.href === "/dashboard" || item.href === "/admin"
                      ? path === item.href
                      : path === item.href || path.startsWith(`${item.href}/`)
                  }
                  onNavigate={() => setDrawer(false)}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-[var(--line)] p-4">
        <div className="flex items-center gap-3 rounded-xl bg-[var(--sunken)] p-2.5">
          <Avatar name={user.name} url={user.avatarUrl} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="text-ink truncate text-xs font-semibold">
              {user.name}
            </p>
            <p className="text-faint truncate text-[11px]">{user.email}</p>
          </div>
          {user.role === "ADMIN" && <Badge tone="ember">Admin</Badge>}
        </div>
        <form action={logoutAction}>
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="mt-2 w-full justify-start"
          >
            <LogOut size={14} />
            Sign out
          </Button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="relative min-h-svh">
      <div className="aurora" aria-hidden>
        <span />
        <span />
        <span />
      </div>
      <div
        className="field pointer-events-none fixed inset-0 z-0"
        aria-hidden
      />

      <aside className="glass fixed inset-y-0 left-0 z-40 hidden w-[268px] border-r lg:block">
        {rail}
      </aside>

      {drawer && (
        <div className="fixed inset-0 z-[80] lg:hidden">
          <button
            className="absolute inset-0 bg-[rgba(4,6,12,.72)] backdrop-blur-sm"
            onClick={() => setDrawer(false)}
            aria-label="Close navigation"
          />
          <aside className="panel-raised absolute inset-y-0 left-0 w-[84%] max-w-[300px] animate-[drawer-in_320ms_cubic-bezier(.16,.84,.24,1)]">
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute top-4 right-4 z-10"
              onClick={() => setDrawer(false)}
              aria-label="Close navigation"
            >
              <X size={16} />
            </Button>
            {rail}
          </aside>
        </div>
      )}

      <div className="relative z-10 lg:pl-[268px]">
        <header className="glass sticky top-0 z-30 flex h-16 items-center gap-3 border-b px-4 sm:px-6">
          <Button
            className="lg:hidden"
            variant="ghost"
            size="icon-sm"
            onClick={() => setDrawer(true)}
            aria-label="Open navigation"
          >
            <Menu size={18} />
          </Button>

          <div className="min-w-0">
            <p className="text-faint text-[11px] leading-4">
              {sectionForPath(path)}
            </p>
            <p className="text-ink truncate text-sm leading-4 font-semibold">
              {titleForPath(path)}
            </p>
          </div>

          <div className="ml-auto flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              className="lg:hidden"
              onClick={() => setPalette(true)}
              aria-label="Jump to a page"
            >
              <Search size={16} />
            </Button>

            <DropdownPrimitive.Root>
              <DropdownPrimitive.Trigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="relative"
                  aria-label={
                    signals.length
                      ? `${signals.length} things need attention`
                      : "Nothing needs attention"
                  }
                >
                  <Bell size={16} />
                  {signals.length > 0 && (
                    <span className="bg-ember absolute top-1 right-1 size-1.5 rounded-full" />
                  )}
                </Button>
              </DropdownPrimitive.Trigger>
              <DropdownPrimitive.Portal>
                <DropdownPrimitive.Content
                  align="end"
                  sideOffset={10}
                  className="panel-raised lit z-[100] w-[min(92vw,20rem)] origin-top rounded-2xl p-2 data-[state=open]:animate-[menu-in_220ms_cubic-bezier(.16,.84,.24,1)]"
                >
                  <p className="text-faint px-3 pt-2 pb-2 text-[11px]">
                    Needs your attention
                  </p>
                  {signals.length ? (
                    signals.map((signal) => (
                      <DropdownPrimitive.Item key={signal.id} asChild>
                        <Link
                          href={signal.href}
                          className="block cursor-pointer rounded-xl px-3 py-2.5 outline-none hover:bg-[var(--sunken)] focus:bg-[var(--sunken)]"
                        >
                          <span className="flex items-center gap-2">
                            <span
                              className={cn(
                                "size-1.5 shrink-0 rounded-full",
                                signal.tone === "ember" && "bg-ember",
                                signal.tone === "verified" &&
                                  "bg-[var(--verified)]",
                                signal.tone === "caution" &&
                                  "bg-[var(--caution)]",
                                signal.tone === "neutral" &&
                                  "bg-[var(--ink-faint)]",
                              )}
                            />
                            <span className="text-ink truncate text-xs font-semibold">
                              {signal.title}
                            </span>
                          </span>
                          <span className="text-dim mt-1 block text-[11px] leading-4">
                            {signal.detail}
                          </span>
                        </Link>
                      </DropdownPrimitive.Item>
                    ))
                  ) : (
                    <p className="text-dim px-3 py-6 text-center text-xs leading-5">
                      You are all caught up. New reviews and requests land here.
                    </p>
                  )}
                </DropdownPrimitive.Content>
              </DropdownPrimitive.Portal>
            </DropdownPrimitive.Root>

            <Button
              variant="ghost"
              size="icon-sm"
              onClick={toggleTheme}
              aria-label={
                theme === "dark"
                  ? "Switch to light mode"
                  : "Switch to dark mode"
              }
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </Button>

            <DropdownPrimitive.Root>
              <DropdownPrimitive.Trigger asChild>
                <button
                  className="ml-1 rounded-full ring-offset-2 ring-offset-[var(--void)] transition hover:ring-2 hover:ring-[var(--line-strong)]"
                  aria-label="Account menu"
                >
                  <Avatar name={user.name} url={user.avatarUrl} size="sm" />
                </button>
              </DropdownPrimitive.Trigger>
              <DropdownPrimitive.Portal>
                <DropdownPrimitive.Content
                  align="end"
                  sideOffset={10}
                  className="panel-raised lit z-[100] w-56 origin-top-right rounded-2xl p-2 data-[state=open]:animate-[menu-in_220ms_cubic-bezier(.16,.84,.24,1)]"
                >
                  <div className="border-b border-[var(--line)] px-3 pt-2 pb-3">
                    <p className="text-ink truncate text-xs font-semibold">
                      {user.name}
                    </p>
                    <p className="text-faint truncate text-[11px]">
                      {user.email}
                    </p>
                  </div>
                  <DropdownPrimitive.Item asChild>
                    <Link
                      href="/profile"
                      className="text-dim hover:text-ink mt-1 flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-xs outline-none hover:bg-[var(--sunken)] focus:bg-[var(--sunken)]"
                    >
                      <UserRound size={14} />
                      View profile
                    </Link>
                  </DropdownPrimitive.Item>
                  {/* The menu must not close on select: Radix would unmount
                      the form before the submit reaches the server action. */}
                  <form action={logoutAction}>
                    <DropdownPrimitive.Item
                      asChild
                      onSelect={(event) => event.preventDefault()}
                    >
                      <button
                        type="submit"
                        className="text-dim hover:text-ink flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-left text-xs outline-none hover:bg-[var(--sunken)] focus:bg-[var(--sunken)]"
                      >
                        <LogOut size={14} />
                        Sign out
                      </button>
                    </DropdownPrimitive.Item>
                  </form>
                </DropdownPrimitive.Content>
              </DropdownPrimitive.Portal>
            </DropdownPrimitive.Root>
          </div>
        </header>

        <main
          id="main-content"
          className="stage mx-auto w-full max-w-[1480px] px-4 py-7 sm:px-6 lg:px-9 lg:py-10"
        >
          {children}
        </main>

        <footer className="mx-auto w-full max-w-[1480px] px-4 pt-2 pb-8 sm:px-6 lg:px-9">
          <div className="flex flex-col gap-1.5 border-t border-[var(--line)] pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-faint text-[11px]">
              Built by{" "}
              <span className="text-dim font-medium">Nisarg Kadam</span>
            </p>
            <p className="text-faint text-[11px]">
              AI AMC Student Platform — Agentic AI Masterclass
            </p>
          </div>
        </footer>
      </div>

      <CommandPalette
        open={palette}
        onOpenChange={setPalette}
        isAdmin={user.role === "ADMIN"}
        onToggleTheme={toggleTheme}
        theme={theme}
      />
    </div>
  );
}
