import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { PageHeader } from "@/components/page-header";
import { CommunityFeed } from "@/features/community/community-feed";
export const metadata = { title: "Community" };
export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await requireUser();
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const take = 10;
  const posts = await db.post.findMany({
    take: page * take + 1,
    orderBy: { createdAt: "desc" },
    include: {
      user: { include: { profile: true } },
      likes: { where: { userId: user.id }, select: { id: true } },
      bookmarks: { where: { userId: user.id }, select: { id: true } },
      comments: {
        take: 5,
        orderBy: { createdAt: "asc" },
        include: { user: { include: { profile: true } } },
      },
      _count: { select: { likes: true } },
    },
  });
  const hasMore = posts.length > page * take;
  return (
    <>
      <PageHeader
        eyebrow="Cohort network"
        title="Community"
        description="Share what you build, ask sharper questions, and help the cohort move forward together."
      />
      <CommunityFeed
        nextPage={hasMore ? page + 1 : null}
        posts={posts.slice(0, page * take).map((p) => ({
          id: p.id,
          content: p.content,
          imageUrl: p.imageUrl,
          linkUrl: p.linkUrl,
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString(),
          author: {
            name: p.user.profile?.fullName ?? p.user.email,
            role: p.user.role,
            avatarUrl: p.user.profile?.avatarUrl ?? null,
            githubUsername: p.user.profile?.githubUsername ?? null,
          },
          owned: p.userId === user.id || user.role === "ADMIN",
          liked: p.likes.length > 0,
          bookmarked: p.bookmarks.length > 0,
          likeCount: p._count.likes,
          comments: p.comments.map((c) => ({
            id: c.id,
            content: c.content,
            createdAt: c.createdAt.toISOString(),
            author: {
              name: c.user.profile?.fullName ?? c.user.email,
              avatarUrl: c.user.profile?.avatarUrl ?? null,
            },
          })),
        }))}
      />
    </>
  );
}
