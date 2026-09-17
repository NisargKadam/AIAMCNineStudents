import { requireUser } from "@/lib/auth/session";
import { decryptField } from "@/lib/encryption";
import { PageHeader } from "@/components/page-header";
import { ProfileForm } from "@/features/profile/profile-form";
export const metadata = { title: "My Profile" };
export default async function ProfilePage() {
  const user = await requireUser();
  const p = user.profile;
  let apiKey = "";
  if (p?.encryptedOpenAiApiKey) {
    try {
      apiKey = decryptField(p.encryptedOpenAiApiKey);
    } catch {
      // Keep the profile usable if an old key cannot be decrypted. Saving an
      // empty field leaves the stored value untouched unless Remove is chosen.
    }
  }
  return (
    <>
      <PageHeader
        eyebrow="Your identity"
        title="My Profile"
        description="Keep your cohort profile current. Optional fields stay optional, and your API key stays encrypted."
      />
      <ProfileForm
        email={user.email}
        apiKey={apiKey}
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
