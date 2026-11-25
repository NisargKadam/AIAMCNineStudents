import { requireSignedIn } from "@/lib/auth/session";
import { loadSignals } from "@/lib/signals";
import { AppShell } from "@/components/app-shell";
import { isAlumni, memberBadge } from "@/lib/access";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Each page applies its own guard; the shell only needs to know who is here.
  const user = await requireSignedIn();
  const signals = await loadSignals(user);
  return (
    <AppShell
      user={{
        name: user.profile?.fullName ?? user.email,
        email: user.email,
        role: user.role,
        avatarUrl: user.profile?.avatarUrl,
        batch: memberBadge(user),
        alumni: isAlumni(user),
      }}
      signals={signals}
    >
      {children}
    </AppShell>
  );
}
