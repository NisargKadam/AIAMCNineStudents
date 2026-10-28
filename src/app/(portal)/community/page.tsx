import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { visiblePeople } from "@/lib/batches";
import { batchLabel } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import {
  CommunityFeed,
  type FeedView,
} from "@/features/community/community-feed";

export const metadata = { title: "Community" };

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; view?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const isAdmin = user.role === "ADMIN";
  const view: FeedView =
    params.view === "mine" || params.view === "saved" ? params.view : "all";
  const take = 10;

  // Each batch has its own community: a student sees posts and comments from
  // their batchmates and the instructors only. Administrators see every batch.
  const people = visiblePeople(user);
  const where: Prisma.PostWhereInput = {
    ...(people ? { user: people } : {}),
    ...(view === "mine"
      ? { userId: user.id }
      : view === "saved"
        ? { bookmarks: { some: { userId: user.id } } }
        : {}),
  };

  const posts = await db.post.findMany({
    where,
    take: page * take + 1,
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        include: { profile: true, batch: { select: { number: true } } },
      },
      likes: { where: { userId: user.id }, select: { id: true } },
      bookmarks: { where: { userId: user.id }, select: { id: true } },
      comments: {
        where: people ? { user: people } : {},
        take: 8,
        orderBy: { createdAt: "asc" },
        include: {
          user: {
            include: { profile: true, batch: { select: { number: true } } },
          },
        },
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
        description={
          isAdmin
            ? "Every batch's community in one feed. Students only see posts and comments from their own batch and the instructors."
            : user.batch
              ? `Share what you build with ${batchLabel(user.batch.number)} and your instructors. Only your batch sees what you post here.`
              : "Share what you build, ask sharper questions, and help the cohort move forward together."
        }
      />
      <CommunityFeed
        view={view}
        authorName={user.profile?.fullName ?? user.email}
        nextPage={hasMore ? page + 1 : null}
        posts={posts.slice(0, page * take).map((post) => ({
          id: post.id,
          content: post.content,
          imageUrl: post.imageUrl,
          linkUrl: post.linkUrl,
          createdAt: post.createdAt.toISOString(),
          updatedAt: post.updatedAt.toISOString(),
          author: {
            name: post.user.profile?.fullName ?? post.user.email,
            role: post.user.role,
            avatarUrl: post.user.profile?.avatarUrl ?? null,
            githubUsername: post.user.profile?.githubUsername ?? null,
            batch:
              isAdmin && post.user.role === "STUDENT"
                ? (post.user.batch?.number ?? null)
                : null,
          },
          owned: post.userId === user.id || user.role === "ADMIN",
          authored: post.userId === user.id,
          liked: post.likes.length > 0,
          bookmarked: post.bookmarks.length > 0,
          likeCount: post._count.likes,
          comments: post.comments.map((comment) => ({
            id: comment.id,
            content: comment.content,
            createdAt: comment.createdAt.toISOString(),
            owned: comment.userId === user.id || user.role === "ADMIN",
            author: {
              name: comment.user.profile?.fullName ?? comment.user.email,
              avatarUrl: comment.user.profile?.avatarUrl ?? null,
              batch:
                isAdmin && comment.user.role === "STUDENT"
                  ? (comment.user.batch?.number ?? null)
                  : null,
            },
          })),
        }))}
      />
    </>
  );
}
