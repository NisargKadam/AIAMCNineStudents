"use client";
import { useMemo, useState, useTransition } from "react";
import {
  ExternalLink,
  Heart,
  MessageSquare,
  Search,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { deletePostAction } from "@/features/community/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Confirm } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar } from "@/components/avatar";

type ModeratedPost = {
  id: string;
  author: string;
  avatarUrl: string | null;
  email: string;
  content: string | null;
  linkUrl: string | null;
  createdAt: string;
  likes: number;
  comments: number;
};

export function CommunityModeration({ posts }: { posts: ModeratedPost[] }) {
  const [pending, start] = useTransition();
  const [query, setQuery] = useState("");
  const [target, setTarget] = useState<ModeratedPost | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return posts;
    return posts.filter((post) =>
      [post.author, post.email, post.content, post.linkUrl]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [posts, query]);

  return (
    <>
      <div className="relative mb-4">
        <Search
          size={15}
          className="text-faint absolute top-1/2 left-3.5 -translate-y-1/2"
        />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="pl-10"
          placeholder="Search posts by author, email, or content"
          aria-label="Search posts"
        />
      </div>

      {filtered.length ? (
        <div className="space-y-2.5">
          {filtered.map((post) => (
            <Card key={post.id} className="p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <Avatar name={post.author} url={post.avatarUrl} />
                <div className="min-w-0 flex-1">
                  <p className="text-ink text-sm font-semibold">
                    {post.author}
                  </p>
                  <p className="text-faint mt-0.5 text-[11px]">
                    {post.email} · {new Date(post.createdAt).toLocaleString()}
                  </p>
                  <p className="text-dim mt-3 line-clamp-3 text-xs leading-6">
                    {post.content ?? post.linkUrl ?? "Image only"}
                  </p>
                  {post.linkUrl && (
                    <a
                      href={post.linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-ember mt-2 inline-flex items-center gap-1.5 font-mono text-[11px] hover:underline"
                    >
                      {post.linkUrl}
                      <ExternalLink size={10} />
                    </a>
                  )}
                  <div className="text-faint mt-3 flex items-center gap-4 text-[11px]">
                    <span className="flex items-center gap-1">
                      <Heart size={11} />
                      {post.likes}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare size={11} />
                      {post.comments}
                    </span>
                  </div>
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  disabled={pending}
                  onClick={() => setTarget(post)}
                >
                  <Trash2 size={14} />
                  Remove
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={ShieldCheck}
          title={query ? "No posts match that search" : "Nothing to moderate"}
          description={
            query
              ? "Try a different author, email, or phrase."
              : "The feed is clear. Anything the cohort shares will show up here."
          }
        />
      )}

      <Confirm
        open={target !== null}
        onOpenChange={(open) => !open && setTarget(null)}
        title="Remove this post?"
        description="The post and its comments are deleted for everyone, and the action is written to the audit log."
        confirmLabel="Remove post"
        pending={pending}
        onConfirm={() => {
          const post = target;
          if (!post) return;
          setTarget(null);
          start(async () => {
            const result = await deletePostAction(post.id);
            if (result.error) toast.error(result.error);
            else toast.success("Post removed and recorded in the audit log.");
          });
        }}
      />
    </>
  );
}
