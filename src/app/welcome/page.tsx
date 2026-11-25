import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireSignedIn } from "@/lib/auth/session";
import { isAlumni, memberBadge } from "@/lib/access";
import { profileGaps } from "@/lib/profile-gaps";
import { WelcomeForm } from "@/features/profile/welcome-form";

export const metadata = { title: "Finish your profile" };

/**
 * Where a student lands until they have a photo and a complete profile. It
 * sits outside the portal shell so there is nothing else to wander into.
 */
export default async function WelcomePage() {
  const user = await requireSignedIn();
  if (user.role === "ADMIN" || profileGaps(user.profile).length === 0)
    redirect("/dashboard");
  // The exam page lets a running attempt past the profile step. Anyone who
  // lands here mid-exam, by signing in again or following another link, goes
  // straight back to it: the timer does not wait.
  const running = await db.examAttempt.findFirst({
    where: {
      userId: user.id,
      status: "IN_PROGRESS",
      deadline: { gt: new Date() },
    },
    select: { id: true },
  });
  if (running) redirect("/exam");
  const profile = user.profile;

  return (
    <main className="relative min-h-svh overflow-hidden lg:grid lg:grid-cols-[1fr_1fr]">
      <div className="aurora" aria-hidden>
        <span />
        <span />
        <span />
      </div>
      <div className="field pointer-events-none absolute inset-0" aria-hidden />
      <WelcomeForm
        email={user.email}
        alumni={isAlumni(user)}
        badge={memberBadge(user)}
        profile={{
          fullName: profile?.fullName ?? "",
          currentRole: profile?.currentRole ?? "",
          country: profile?.country ?? "",
          avatarUrl: profile?.avatarUrl ?? "",
          timezone: profile?.timezone ?? "",
          linkedinUrl: profile?.linkedinUrl ?? "",
          githubUsername: profile?.githubUsername ?? "",
          bio: profile?.bio ?? "",
        }}
      />
    </main>
  );
}
