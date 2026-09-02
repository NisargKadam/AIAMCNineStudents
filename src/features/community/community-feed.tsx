"use client";
import Link from "next/link";
import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import {
  Bookmark,
  Code2,
  ExternalLink,
  Heart,
  ImagePlus,
  Link2,
  LoaderCircle,
  MessageCircle,
  Pencil,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import {
  addCommentAction,
  createPostAction,
  deleteCommentAction,
  deletePostAction,
  toggleBookmarkAction,
  toggleLikeAction,
  updatePostAction,
} from "./actions";
import { Avatar } from "@/components/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Confirm } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

export type FeedPost = {
  id: string;
  content: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  createdAt: string;
  updatedAt: string;
  author: {
    name: string;
    role: "ADMIN" | "STUDENT";
    avatarUrl: string | null;
    githubUsername: string | null;
  };
  owned: boolean;
  authored: boolean;
  liked: boolean;
  bookmarked: boolean;
  likeCount: number;
  comments: Array<{
    id: string;
    content: string;
    createdAt: string;
    owned: boolean;
    author: { name: string; avatarUrl: string | null };
  }>;
};

export type FeedView = "all" | "mine" | "saved";

function Composer({ authorName }: { authorName: string }) {
  const [pending, start] = useTransition();
  const [content, setContent] = useState("");
  const [link, setLink] = useState("");
  const [image, setImage] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setUploading(true);
    const data = new FormData();
    data.set("file", file);
    const response = await fetch("/api/uploads", {
      method: "POST",
      body: data,
    });
    const result = await response.json();
    setUploading(false);
    if (!response.ok) return toast.error(result.error ?? "Upload failed.");
    setImage(result.url);
    toast.success("Image attached.");
  }

  const empty = !content.trim() && !link.trim() && !image;

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex gap-3">
        <Avatar name={authorName} size="md" />
        <Textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          maxLength={3000}
          placeholder="What are you building today?"
          className="min-h-20 resize-none border-0 bg-transparent px-2 py-1.5 text-[15px] leading-6 focus:bg-transparent focus:ring-0"
        />
      </div>

      {link !== "" && (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--sunken)] px-3 py-2">
          <Link2 size={14} className="text-ember shrink-0" />
          <Input
            aria-label="Link to share"
            value={link}
            onChange={(event) => setLink(event.target.value)}
            placeholder="https://"
            className="h-8 border-0 bg-transparent px-0 text-xs focus:ring-0"
          />
          <button
            onClick={() => setLink("")}
            aria-label="Remove link"
            className="text-faint hover:text-ink"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {image && (
        <div className="mt-3 flex items-center justify-between rounded-xl border border-[color-mix(in_oklab,var(--verified)_25%,transparent)] bg-[color-mix(in_oklab,var(--verified)_8%,transparent)] px-3 py-2.5 text-xs text-[var(--verified)]">
          Image attached
          <button
            onClick={() => setImage("")}
            aria-label="Remove image"
            className="hover:text-ink"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between border-t border-[var(--line)] pt-3">
        <div className="flex gap-1">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
            }}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <LoaderCircle size={15} className="animate-spin" />
            ) : (
              <ImagePlus size={15} />
            )}
            <span className="hidden sm:inline">Image</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setLink(link ? "" : "https://")}
          >
            <Link2 size={15} />
            <span className="hidden sm:inline">Link</span>
          </Button>
        </div>
        <Button
          disabled={pending || uploading || empty}
          onClick={() =>
            start(async () => {
              const result = await createPostAction({
                content,
                linkUrl: link,
                imageUrl: image,
              });
              if (result.success) {
                toast.success(result.success);
                setContent("");
                setLink("");
                setImage("");
              } else toast.error(result.error ?? "Post failed.");
            })
          }
        >
          {pending ? (
            <LoaderCircle size={15} className="animate-spin" />
          ) : (
            <Send size={15} />
          )}
          Post
        </Button>
      </div>
    </Card>
  );
}

function CommentBox({ postId }: { postId: string }) {
  const [value, setValue] = useState("");
  const [pending, start] = useTransition();

  const submit = () => {
    if (!value.trim()) return;
    start(async () => {
      const result = await addCommentAction({ postId, content: value });
      if (result.success) setValue("");
      else toast.error(result.error ?? "Comment failed.");
    });
  };

  return (
    <div className="mt-3 flex gap-2">
      <Input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Add a comment"
        aria-label="Add a comment"
        className="h-10"
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            submit();
          }
        }}
      />
      <Button
        size="icon"
        className="size-10 shrink-0"
        disabled={pending || !value.trim()}
        aria-label="Post comment"
        onClick={submit}
      >
        {pending ? (
          <LoaderCircle size={15} className="animate-spin" />
        ) : (
          <Send size={15} />
        )}
      </Button>
    </div>
  );
}

function PostCard({ post }: { post: FeedPost }) {
  const [pending, start] = useTransition();
  const [liked, setLiked] = useState(post.liked);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [bookmarked, setBookmarked] = useState(post.bookmarked);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(post.content ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showComments, setShowComments] = useState(post.comments.length > 0);

  const isGithub =
    post.linkUrl !== null &&
    (() => {
      try {
        return (
          new URL(post.linkUrl).hostname.replace("www.", "") === "github.com"
        );
      } catch {
        return false;
      }
    })();

  return (
    <Card className="overflow-hidden">
      <article className="p-5">
        <header className="flex items-start gap-3">
          <Avatar name={post.author.name} url={post.author.avatarUrl} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-ink truncate text-sm font-semibold">
                {post.author.name}
              </h2>
              {post.author.role === "ADMIN" && (
                <Badge tone="ember">Instructor</Badge>
              )}
            </div>
            <p className="text-faint mt-0.5 text-[11px]">
              {formatDistanceToNow(new Date(post.createdAt), {
                addSuffix: true,
              })}
              {post.updatedAt !== post.createdAt && " · edited"}
            </p>
          </div>
          <div className="flex shrink-0 gap-0.5">
            {post.authored && !editing && (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Edit post"
                onClick={() => setEditing(true)}
              >
                <Pencil size={15} />
              </Button>
            )}
            {post.owned && (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Delete post"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 size={15} />
              </Button>
            )}
          </div>
        </header>

        {editing ? (
          <div className="mt-4">
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={3000}
            />
            <div className="mt-2 flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDraft(post.content ?? "");
                  setEditing(false);
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const result = await updatePostAction(post.id, {
                      content: draft,
                      linkUrl: post.linkUrl ?? "",
                      imageUrl: post.imageUrl ?? "",
                    });
                    if (result.success) {
                      toast.success(result.success);
                      setEditing(false);
                    } else toast.error(result.error ?? "Update failed.");
                  })
                }
              >
                Save changes
              </Button>
            </div>
          </div>
        ) : (
          post.content && (
            <p className="text-ink/90 mt-4 text-sm leading-7 whitespace-pre-wrap">
              {post.content}
            </p>
          )
        )}

        {post.imageUrl && (
          <div className="mt-4 overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--sunken)]">
            <Image
              src={post.imageUrl}
              alt="Attachment shared with this post"
              width={1200}
              height={800}
              unoptimized
              className="max-h-[600px] w-full object-cover"
            />
          </div>
        )}

        {post.linkUrl && (
          <a
            href={post.linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--sunken)] p-3.5 transition-colors hover:border-[var(--line-strong)]"
          >
            {isGithub ? (
              <Code2 size={19} className="text-ink shrink-0" />
            ) : (
              <Link2 size={18} className="text-ember shrink-0" />
            )}
            <span className="min-w-0 flex-1">
              <span className="text-ink block text-xs font-semibold">
                {isGithub ? "GitHub repository" : "External link"}
              </span>
              <span className="text-faint mt-0.5 block truncate font-mono text-[11px]">
                {post.linkUrl}
              </span>
            </span>
            <ExternalLink size={14} className="text-faint shrink-0" />
          </a>
        )}

        <div className="mt-4 flex items-center gap-1 border-t border-[var(--line)] pt-3">
          <Button
            variant="ghost"
            size="sm"
            className={cn(liked && "text-[var(--alert)]")}
            onClick={() => {
              setLiked(!liked);
              setLikeCount((value) => value + (liked ? -1 : 1));
              start(async () => {
                const result = await toggleLikeAction(post.id);
                setLiked(result.liked);
              });
            }}
          >
            <Heart
              size={15}
              fill={liked ? "currentColor" : "none"}
              className="transition-transform duration-200"
            />
            <span className="num">{likeCount}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowComments(!showComments)}
            aria-expanded={showComments}
          >
            <MessageCircle size={15} />
            <span className="num">{post.comments.length}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn("ml-auto", bookmarked && "text-[var(--caution)]")}
            aria-label={bookmarked ? "Remove bookmark" : "Save post"}
            onClick={() => {
              setBookmarked(!bookmarked);
              start(async () => {
                const result = await toggleBookmarkAction(post.id);
                setBookmarked(result.bookmarked);
              });
            }}
          >
            <Bookmark size={15} fill={bookmarked ? "currentColor" : "none"} />
          </Button>
        </div>

        {showComments && (
          <div className="rise mt-1">
            {post.comments.length > 0 && (
              <ul className="space-y-3 rounded-xl border border-[var(--line)] bg-[var(--sunken)] p-3">
                {post.comments.map((comment) => (
                  <li key={comment.id} className="group flex gap-2.5">
                    <Avatar
                      name={comment.author.name}
                      url={comment.author.avatarUrl}
                      size="xs"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-ink text-[11px] font-semibold">
                        {comment.author.name}
                        <span className="text-faint ml-2 font-normal">
                          {formatDistanceToNow(new Date(comment.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                      </p>
                      <p className="text-dim mt-1 text-xs leading-5">
                        {comment.content}
                      </p>
                    </div>
                    {comment.owned && (
                      <button
                        aria-label="Delete comment"
                        className="text-faint shrink-0 opacity-0 transition-opacity group-hover:opacity-100 hover:text-[var(--alert)] focus-visible:opacity-100"
                        onClick={() =>
                          start(async () => {
                            const result = await deleteCommentAction(
                              comment.id,
                            );
                            if (result.error) toast.error(result.error);
                          })
                        }
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <CommentBox postId={post.id} />
          </div>
        )}
      </article>

      <Confirm
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this post?"
        description="The post and its comments are removed for everyone. This cannot be undone."
        confirmLabel="Delete post"
        pending={pending}
        onConfirm={() =>
          start(async () => {
            const result = await deletePostAction(post.id);
            setConfirmDelete(false);
            if (result.error) toast.error(result.error);
            else toast.success("Post deleted.");
          })
        }
      />
    </Card>
  );
}

export function CommunityFeed({
  posts,
  nextPage,
  view,
  authorName,
}: {
  posts: FeedPost[];
  nextPage: number | null;
  view: FeedView;
  authorName: string;
}) {
  const views: Array<{ key: FeedView; label: string }> = [
    { key: "all", label: "Everything" },
    { key: "mine", label: "My posts" },
    { key: "saved", label: "Saved" },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {view === "all" && <Composer authorName={authorName} />}

      <div className="flex gap-1.5">
        {views.map(({ key, label }) => (
          <Link
            key={key}
            href={key === "all" ? "/community" : `/community?view=${key}`}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
              view === key
                ? "text-ink border-[var(--line-strong)] bg-[var(--raised)]"
                : "text-dim hover:text-ink border-transparent hover:bg-[var(--raised)]",
            )}
          >
            {label}
          </Link>
        ))}
      </div>

      {posts.length ? (
        posts.map((post) => <PostCard key={post.id} post={post} />)
      ) : (
        <EmptyState
          icon={MessageCircle}
          title={
            view === "saved"
              ? "Nothing saved yet"
              : view === "mine"
                ? "You have not posted yet"
                : "The feed is empty"
          }
          description={
            view === "saved"
              ? "Bookmark a post and it will wait for you here."
              : view === "mine"
                ? "Share a build note, a blocker, or something you learned this week."
                : "Be the first to share what you are building."
          }
          action={
            view !== "all" ? (
              <Button asChild variant="secondary">
                <Link href="/community">Back to the feed</Link>
              </Button>
            ) : undefined
          }
        />
      )}

      {nextPage && (
        <Button asChild variant="secondary" className="w-full">
          <Link
            href={
              view === "all"
                ? `/community?page=${nextPage}`
                : `/community?view=${view}&page=${nextPage}`
            }
          >
            Load more
          </Link>
        </Button>
      )}
    </div>
  );
}
