import { requireUser } from "@/lib/auth/session";
import { loadSignals } from "@/lib/signals";
import { AppShell } from "@/components/app-shell";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const signals = await loadSignals({ id: user.id, role: user.role });
  return (
    <AppShell
      user={{
        name: user.profile?.fullName ?? user.email,
        email: user.email,
        role: user.role,
        avatarUrl: user.profile?.avatarUrl,
      }}
      signals={signals}
    >
      {children}
    </AppShell>
  );
}
