"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { CornerDownLeft, Moon, Search, Sun } from "lucide-react";
import { navSections } from "@/components/nav-config";
import { cn } from "@/lib/utils";

type Command = {
  id: string;
  label: string;
  hint: string;
  group: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  run: () => void;
};

type PaletteProps = {
  onOpenChange: (open: boolean) => void;
  isAdmin: boolean;
  onToggleTheme: () => void;
  theme: "dark" | "light";
};

/**
 * Mounted only while the palette is open, so the search box and highlighted
 * row start clean on every invocation without an effect to reset them.
 */
function PaletteBody({
  onOpenChange,
  isAdmin,
  onToggleTheme,
  theme,
}: PaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);

  const commands = useMemo<Command[]>(() => {
    const navigation = navSections
      .filter((section) => !section.adminOnly || isAdmin)
      .flatMap((section) =>
        section.items.map((item) => ({
          id: item.href,
          label: item.label,
          hint: item.hint,
          group: section.heading,
          icon: item.icon,
          run: () => router.push(item.href),
        })),
      );
    return [
      ...navigation,
      {
        id: "theme",
        label:
          theme === "dark" ? "Switch to light mode" : "Switch to dark mode",
        hint: "Changes the whole portal",
        group: "Display",
        icon: theme === "dark" ? Sun : Moon,
        run: onToggleTheme,
      },
    ];
  }, [isAdmin, onToggleTheme, router, theme]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((command) =>
      `${command.label} ${command.hint} ${command.group}`
        .toLowerCase()
        .includes(q),
    );
  }, [commands, query]);

  // Clamped rather than reset, so a shrinking result list keeps a valid row.
  const active = Math.min(cursor, Math.max(results.length - 1, 0));

  function choose(command: Command | undefined) {
    if (!command) return;
    onOpenChange(false);
    command.run();
  }

  let lastGroup = "";

  return (
    <div
      onKeyDown={(event) => {
        const count = Math.max(results.length, 1);
        if (event.key === "ArrowDown") {
          event.preventDefault();
          setCursor((active + 1) % count);
        }
        if (event.key === "ArrowUp") {
          event.preventDefault();
          setCursor((active - 1 + count) % count);
        }
        if (event.key === "Enter") {
          event.preventDefault();
          choose(results[active]);
        }
      }}
    >
      <div className="flex items-center gap-3 border-b border-[var(--line)] px-4">
        <Search size={16} className="text-faint shrink-0" />
        <input
          autoFocus
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setCursor(0);
          }}
          placeholder="Jump to a page…"
          aria-label="Search pages"
          className="text-ink placeholder:text-faint h-14 w-full bg-transparent text-sm outline-none"
        />
        <kbd className="text-faint hidden rounded border border-[var(--line)] px-1.5 py-0.5 font-mono text-[10px] sm:block">
          esc
        </kbd>
      </div>

      <div className="max-h-[52vh] overflow-y-auto p-2">
        {results.length === 0 && (
          <p className="text-dim px-3 py-8 text-center text-sm">
            Nothing matches “{query}”.
          </p>
        )}
        {results.map((command, position) => {
          const showGroup = command.group !== lastGroup;
          lastGroup = command.group;
          const Icon = command.icon;
          const selected = position === active;
          return (
            <div key={command.id}>
              {showGroup && (
                <p className="text-faint px-3 pt-3 pb-1.5 text-[11px] font-medium">
                  {command.group}
                </p>
              )}
              <button
                type="button"
                onMouseEnter={() => setCursor(position)}
                onClick={() => choose(command)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                  selected
                    ? "text-ink bg-[var(--sunken)]"
                    : "text-dim hover:bg-[var(--sunken)]",
                )}
              >
                <Icon
                  size={16}
                  className={cn("shrink-0", selected && "text-ember")}
                />
                <span className="min-w-0 flex-1">
                  <span className="text-ink block truncate text-sm font-medium">
                    {command.label}
                  </span>
                  <span className="text-faint block truncate text-[11px]">
                    {command.hint}
                  </span>
                </span>
                {selected && (
                  <CornerDownLeft size={13} className="text-faint" />
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CommandPalette({
  open,
  ...props
}: PaletteProps & { open: boolean }) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={props.onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[90] bg-[rgba(4,6,12,.72)] backdrop-blur-sm data-[state=closed]:animate-[fade-out_150ms_ease-in] data-[state=open]:animate-[fade-in_180ms_ease-out]" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="panel-raised lit fixed top-[14vh] left-1/2 z-[100] w-[min(94vw,34rem)] -translate-x-1/2 overflow-hidden rounded-2xl p-0 data-[state=closed]:animate-[modal-out_150ms_ease-in] data-[state=open]:animate-[palette-in_300ms_cubic-bezier(.16,.84,.24,1)]"
        >
          <DialogPrimitive.Title className="sr-only">
            Jump to a page
          </DialogPrimitive.Title>
          <PaletteBody {...props} />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
