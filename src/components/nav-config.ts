import {
  BookOpenCheck,
  CalendarDays,
  ClipboardCheck,
  FolderOpen,
  GraduationCap,
  Info,
  Layers,
  LayoutDashboard,
  type LucideIcon,
  MessageSquare,
  ScrollText,
  ShieldCheck,
  SquareGanttChart,
  UserPlus,
  UserRound,
  UsersRound,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  hint: string;
  /** Open to certification-only accounts as well as full students. */
  alumni?: true;
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
        alumni: true,
        label: "Dashboard",
        icon: LayoutDashboard,
        hint: "Progress and what to do next",
      },
      {
        href: "/sessions",
        label: "Sessions",
        icon: CalendarDays,
        hint: "Join links and session recordings",
      },
      {
        href: "/materials",
        label: "Materials",
        icon: FolderOpen,
        hint: "Slides and handouts per session",
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
        href: "/exam",
        alumni: true,
        label: "Exam",
        icon: GraduationCap,
        hint: "Timed assessment and your AI AMC certification",
      },
      {
        href: "/profile",
        alumni: true,
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
        alumni: true,
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
        hint: "What the masterclass is",
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
        href: "/admin/signups",
        label: "Sign-up requests",
        icon: UserPlus,
        hint: "Approve former students and manage pre-approved emails",
      },
      {
        href: "/admin/batches",
        label: "Batches",
        icon: Layers,
        hint: "Intakes, their schedules, and where new students go",
      },
      {
        href: "/admin/submissions",
        label: "Submissions",
        icon: ClipboardCheck,
        hint: "View and review all student submissions",
      },
      {
        href: "/admin/exam",
        label: "Exam console",
        icon: GraduationCap,
        hint: "Student scores, certificates, and private answer key",
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

/**
 * The menu for one person. Alumni hold a certification-only account, so they
 * get the handful of places they can open; a section left empty is dropped.
 */
export function navFor(viewer: {
  role: "ADMIN" | "STUDENT";
  alumni: boolean;
}): NavSection[] {
  return navSections
    .filter((section) => !section.adminOnly || viewer.role === "ADMIN")
    .map((section) => ({
      ...section,
      items: viewer.alumni
        ? section.items.filter((item) => item.alumni)
        : section.items,
    }))
    .filter((section) => section.items.length > 0);
}

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
  return section?.heading ?? "AI AMC";
}
