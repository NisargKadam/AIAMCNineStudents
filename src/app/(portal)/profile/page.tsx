import { requireUser } from "@/lib/auth/session";
import { maskSecret } from "@/lib/encryption";
import { PageHeader } from "@/components/page-header";
import { ProfileForm } from "@/features/profile/profile-form";
export const metadata = { title: "My Profile" };
export default async function ProfilePage() {
  const user = await requireUser();
  const p = user.profile;
  return (
    <>
      <PageHeader
        eyebrow="Your identity"
        title="My Profile"
        description="Keep your cohort profile current. Optional fields stay optional, and your API key stays encrypted."
      />
      <ProfileForm
        email={user.email}
        maskedKey={maskSecret(p?.openAiKeyLastFour ?? null)}
        profile={{
          fullName: p?.fullName ?? "",
          githubUsername: p?.githubUsername ?? "",
          linkedinUrl: p?.linkedinUrl ?? "",
          currentRole: p?.currentRole ?? "",
          country: p?.country ?? "",
          timezone: p?.timezone ?? "",
          bio: p?.bio ?? "",
          avatarUrl: p?.avatarUrl ?? "",
        }}
      />
    </>
  );
}
