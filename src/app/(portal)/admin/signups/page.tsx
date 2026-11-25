import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/page-header";
import { LinkTabs } from "@/components/ui/tabs";
import {
  SignupManager,
  type SignupRow,
  type SignupTab,
} from "@/features/admin/signup-manager";

export const metadata = { title: "Sign-up requests" };

const tabs: SignupTab[] = ["waiting", "approved", "declined"];

export default async function AdminSignupsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireAdmin();
  const requested = (await searchParams).tab as SignupTab;
  const tab = tabs.includes(requested) ? requested : "waiting";

  const [requests, emails] = await Promise.all([
    db.signupRequest.findMany({ orderBy: { createdAt: "desc" } }),
    db.preapprovedEmail.findMany({ orderBy: { email: "asc" } }),
  ]);
  const accounts = await db.user.findMany({
    where: { email: { in: emails.map((row) => row.email) } },
    select: {
      email: true,
      profile: { select: { fullName: true, avatarUrl: true } },
    },
  });
  const accountFor = new Map(accounts.map((user) => [user.email, user]));

  const row = (request: (typeof requests)[number]): SignupRow => ({
    id: request.id,
    email: request.email,
    fullName: request.fullName,
    alumniBatch: request.alumniBatch,
    createdAt: request.createdAt.toISOString(),
    decidedAt: request.decidedAt?.toISOString() ?? null,
  });
  const waiting = requests.filter((request) => request.status === "PENDING");
  const declined = requests.filter((request) => request.status === "DECLINED");

  return (
    <>
      <PageHeader
        eyebrow="Admin console"
        title="Sign-up requests"
        description="Former students from Batches 1 to 10 sign themselves up for certification. Pre-approved emails get in straight away; everyone else waits here for you."
      />
      <LinkTabs
        className="mb-5"
        active={tab}
        tabs={[
          {
            key: "waiting",
            label: "Waiting",
            href: "/admin/signups",
            count: waiting.length,
          },
          {
            key: "approved",
            label: "Pre-approved emails",
            href: "/admin/signups?tab=approved",
            count: emails.length,
          },
          {
            key: "declined",
            label: "Declined",
            href: "/admin/signups?tab=declined",
            count: declined.length,
          },
        ]}
      />
      <SignupManager
        tab={tab}
        waiting={waiting.map(row)}
        declined={declined.map(row)}
        emails={emails.map(({ email }) => {
          const account = accountFor.get(email);
          return {
            email,
            joined: account
              ? {
                  name: account.profile?.fullName ?? email,
                  avatarUrl: account.profile?.avatarUrl ?? null,
                }
              : null,
          };
        })}
      />
    </>
  );
}
