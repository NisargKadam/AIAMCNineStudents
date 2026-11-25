import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/page-header";
import { CommunityModeration } from "@/features/admin/community-moderation";
export const metadata = { title: "Community Moderation" };
export default async function AdminCommunityPage() {
  // Guarded here as well as in the layout: a layout is not re-run for every
  // request, so it cannot be the only thing standing in front of this page.
  await requireAdmin();
  const posts = await db.post.findMany({
    take: 100,
    orderBy: { createdAt: "desc" },
    include: {
      user: { include: { profile: true } },
      _count: { select: { likes: true, comments: true } },
    },
  });
  return (
    <>
      <PageHeader
        eyebrow="Admin Console"
        title="Community Moderation"
        description="Review recent cohort activity and remove inappropriate content. Every moderation action is audited."
      />
      <CommunityModeration
        posts={posts.map((p) => ({
          id: p.id,
          author: p.user.profile?.fullName ?? p.user.email,
          avatarUrl: p.user.profile?.avatarUrl ?? null,
          email: p.user.email,
          content: p.content,
          linkUrl: p.linkUrl,
          createdAt: p.createdAt.toISOString(),
          likes: p._count.likes,
          comments: p._count.comments,
        }))}
      />
    </>
  );
}
