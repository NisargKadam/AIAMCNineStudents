import { requireUser } from "@/lib/auth/session";
import { AppShell } from "@/components/app-shell";
export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  return (
    <AppShell
      user={{
        name: user.profile?.fullName ?? user.email,
        email: user.email,
        role: user.role,
        avatarUrl: user.profile?.avatarUrl,
      }}
    >
      {children}
    </AppShell>
  );
}
