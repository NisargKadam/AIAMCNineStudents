/**
 * What every student must add before using the portal. Links, timezone and
 * bio stay optional; administrators are never held to this.
 */
export type ProfileGap = "photo" | "fullName" | "currentRole" | "country";

export const gapLabels: Record<ProfileGap, string> = {
  photo: "Photo",
  fullName: "Full name",
  currentRole: "Current role",
  country: "Country",
};

type ProfileFields = {
  avatarUrl?: string | null;
  fullName?: string | null;
  currentRole?: string | null;
  country?: string | null;
};

/** The required fields still empty, in the order the welcome screen asks for them. */
export function profileGaps(
  profile: ProfileFields | null | undefined,
): ProfileGap[] {
  const filled = (value: string | null | undefined) => Boolean(value?.trim());
  const gaps: ProfileGap[] = [];
  if (!filled(profile?.avatarUrl)) gaps.push("photo");
  if (!filled(profile?.fullName)) gaps.push("fullName");
  if (!filled(profile?.currentRole)) gaps.push("currentRole");
  if (!filled(profile?.country)) gaps.push("country");
  return gaps;
}
