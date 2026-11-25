"use client";
import { BriefcaseBusiness, MapPin } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { Tilt } from "@/components/motion/tilt";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * A member's card as the community will see them, built as a physical object:
 * it leans into the pointer and the photo rides above the surface. On the
 * welcome step it fills in live as the form is typed.
 */
export function MemberCard({
  name,
  role,
  country,
  avatarUrl,
  badge,
  className,
}: {
  name: string;
  role: string;
  country: string;
  avatarUrl: string;
  badge: string | null;
  className?: string;
}) {
  const line = (value: string, placeholder: string) => (
    <span className={cn("truncate", !value.trim() && "text-faint")}>
      {value.trim() || placeholder}
    </span>
  );
  return (
    <div className={cn("stage", className)}>
      <Tilt className="group rounded-3xl" strength={8} lift={16}>
        <div
          aria-hidden
          className="panel-raised lit absolute inset-0 overflow-hidden rounded-3xl"
        >
          <span
            className="absolute -top-24 -right-16 size-60 rounded-full opacity-30 blur-3xl"
            style={{ background: "var(--ember)" }}
          />
          <span
            className="absolute -bottom-28 -left-12 size-60 rounded-full opacity-25 blur-3xl"
            style={{ background: "var(--halo)" }}
          />
        </div>
        <div className="preserve-3d relative p-6 sm:p-7">
          <div className="flex items-center justify-between gap-3">
            <p className="font-display text-ink text-sm font-semibold">
              AI <span className="text-ember">AMC</span>
            </p>
            {badge && <Badge tone="halo">{badge}</Badge>}
          </div>
          <div className="preserve-3d mt-8 flex items-center gap-5">
            <Avatar
              name={name || "You"}
              url={avatarUrl}
              size="xl"
              className="size-24 [transform:translateZ(34px)] text-2xl shadow-[0_18px_30px_-14px_rgba(0,0,0,.8)]"
            />
            <div className="min-w-0 [transform:translateZ(16px)]">
              <p className="font-display text-ink flex text-xl font-semibold">
                {line(name, "Your name")}
              </p>
              <p className="text-dim mt-2 flex items-center gap-2 text-xs">
                <BriefcaseBusiness size={13} className="shrink-0" />
                {line(role, "What you do")}
              </p>
              <p className="text-dim mt-1.5 flex items-center gap-2 text-xs">
                <MapPin size={13} className="shrink-0" />
                {line(country, "Where you are")}
              </p>
            </div>
          </div>
          <div className="mt-8 flex items-center justify-between border-t border-[var(--line)] pt-4">
            <p className="text-faint text-[11px]">Agentic AI Masterclass</p>
            <p className="text-faint font-mono text-[10px] tracking-[.2em]">
              MEMBER
            </p>
          </div>
        </div>
      </Tilt>
    </div>
  );
}
