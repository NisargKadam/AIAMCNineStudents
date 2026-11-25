import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ArrowUpRight, Heart, MessageSquare } from "lucide-react";
import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth/session";
import { visiblePeople } from "@/lib/batches";
import { Avatar } from "@/components/avatar";
import { Card } from "@/components/ui/card";

/**
 * The four latest posts from the same audience as the viewer's community
 * feed: batchmates and instructors for a student, every alumni batch for an
 * alumnus.
 */
export async function RecentPosts({
  user,
  title,
  empty,
}: {
  user: CurrentUser;
  title: string;
  empty: string;
}) {
  const posts = await db.post.findMany({
    where: { user: visiblePeople(user) ?? {} },
    take: 4,
    orderBy: { createdAt: "desc" },
    include: {
      user: { include: { profile: true } },
      _count: { select: { likes: true, comments: true } },
    },
  });

  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-display text-ink text-sm font-semibold">{title}</h2>
        <Link
          href="/community"
          className="text-dim hover:text-ink flex items-center gap-1 text-xs transition-colors"
        >
          Open feed
          <ArrowUpRight size={13} />
        </Link>
      </div>
      {posts.length ? (
        <div className="divide-y divide-[var(--line)]">
          {posts.map((post) => (
            <article key={post.id} className="flex gap-3 py-3.5 first:pt-0">
              <Avatar
                name={post.user.profile?.fullName ?? post.user.email}
                url={post.user.profile?.avatarUrl}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <p className="text-ink truncate text-xs font-semibold">
                    {post.user.profile?.fullName ?? post.user.email}
                  </p>
                  <span className="text-faint shrink-0 text-[11px]">
                    {formatDistanceToNow(post.createdAt, { addSuffix: true })}
                  </span>
                </div>
                <p className="text-dim mt-1 line-clamp-2 text-xs leading-5">
                  {post.content ?? post.linkUrl ?? "Shared an image"}
                </p>
              </div>
              <div className="text-faint flex shrink-0 items-center gap-3 text-[11px]">
                <span className="flex items-center gap-1">
                  <Heart size={11} />
                  {post._count.likes}
                </span>
                <span className="flex items-center gap-1">
                  <MessageSquare size={11} />
                  {post._count.comments}
                </span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="text-dim py-10 text-center text-sm">{empty}</p>
      )}
    </Card>
  );
}
