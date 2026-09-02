"use client";
import { useTransition } from "react";
import { ExternalLink, LoaderCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deletePostAction } from "@/features/community/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/avatar";
export function CommunityModeration({
  posts,
}: {
  posts: Array<{
    id: string;
    author: string;
    avatarUrl: string | null;
    email: string;
    content: string | null;
    linkUrl: string | null;
    createdAt: string;
    likes: number;
    comments: number;
  }>;
}) {
  const [pending, start] = useTransition();
  return (
    <div className="space-y-3">
      {posts.map((post) => (
        <Card key={post.id} className="p-5">
          <div className="flex items-start gap-3">
            <Avatar name={post.author} url={post.avatarUrl} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">{post.author}</p>
              <p className="text-muted mt-1 text-[10px]">
                {post.email} · {new Date(post.createdAt).toLocaleString()}
              </p>
              <p className="text-muted mt-3 line-clamp-3 text-xs leading-5">
                {post.content ?? post.linkUrl ?? "Image post"}
              </p>
              {post.linkUrl && (
                <a
                  href={post.linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-[11px] text-[#ff987e]"
                >
                  Inspect link
                  <ExternalLink size={11} />
                </a>
              )}
              <p className="text-muted mt-3 text-[10px]">
                {post.likes} likes · {post.comments} comments
              </p>
            </div>
            <Button
              variant="danger"
              size="sm"
              disabled={pending}
              onClick={() => {
                if (confirm("Permanently remove this community post?"))
                  start(async () => {
                    const result = await deletePostAction(post.id);
                    if (result.error) toast.error(result.error);
                    else toast.success("Post removed and action audited.");
                  });
              }}
            >
              {pending ? (
                <LoaderCircle size={14} className="animate-spin" />
              ) : (
                <Trash2 size={14} />
              )}
              Remove
            </Button>
          </div>
        </Card>
      ))}
      {!posts.length && (
        <Card className="text-muted p-12 text-center text-sm">
          There are no community posts to moderate.
        </Card>
      )}
    </div>
  );
}
