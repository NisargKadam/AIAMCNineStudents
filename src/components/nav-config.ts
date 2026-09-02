import {
  BookOpenCheck,
  ClipboardCheck,
  GraduationCap,
  Info,
  LayoutDashboard,
  type LucideIcon,
  MessageSquare,
  ScrollText,
  ShieldCheck,
  SquareGanttChart,
  UserRound,
  UsersRound,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  hint: string;
};

export type NavSection = {
  heading: string;
  items: NavItem[];
  adminOnly?: boolean;
};

export const navSections: NavSection[] = [
  {
    heading: "Your work",
    items: [
      {
        href: "/dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        hint: "Progress and what to do next",
      },
      {
        href: "/prerequisites",
        label: "Prerequisites",
        icon: BookOpenCheck,
        hint: "Readiness checklist",
      },
      {
        href: "/assignments",
        label: "Assignments",
        icon: ClipboardCheck,
        hint: "Submit GitHub work and read feedback",
      },
      {
        href: "/profile",
        label: "My profile",
        icon: UserRound,
        hint: "Your details, avatar, and API key",
      },
    ],
  },
  {
    heading: "Cohort",
    items: [
      {
        href: "/community",
        label: "Community",
        icon: MessageSquare,
        hint: "Share progress and ask questions",
      },
      {
        href: "/students",
        label: "Students",
        icon: UsersRound,
        hint: "Who else is building",
      },
      {
        href: "/about",
        label: "About",
        icon: Info,
        hint: "What AI AMC Nine is",
      },
    ],
  },
  {
    heading: "Admin console",
    adminOnly: true,
    items: [
      {
        href: "/admin",
        label: "Overview",
        icon: SquareGanttChart,
        hint: "Cohort health at a glance",
      },
      {
        href: "/admin/students",
        label: "Manage students",
        icon: GraduationCap,
        hint: "Add, edit, inspect, or remove accounts",
      },
      {
        href: "/admin/assignments",
        label: "Curriculum",
        icon: ClipboardCheck,
        hint: "Assignments every student sees",
      },
      {
        href: "/admin/prerequisites",
        label: "Readiness",
        icon: BookOpenCheck,
        hint: "Categories and checklist items",
      },
      {
        href: "/admin/community",
        label: "Moderation",
        icon: ShieldCheck,
        hint: "Review and remove posts",
      },
      {
        href: "/admin/audit",
        label: "Audit log",
        icon: ScrollText,
        hint: "Every administrative action",
      },
    ],
  },
];

const titles = new Map(
  navSections.flatMap((section) =>
    section.items.map((item) => [item.href, item.label] as const),
  ),
);

export function titleForPath(path: string) {
  if (path.startsWith("/admin/students/") && path !== "/admin/students")
    return "Student record";
  return titles.get(path) ?? "Student portal";
}

export function sectionForPath(path: string) {
  if (path.startsWith("/admin")) return "Admin console";
  const section = navSections.find((s) =>
    s.items.some((item) => item.href === path),
  );
  return section?.heading ?? "AI AMC Nine";
}
