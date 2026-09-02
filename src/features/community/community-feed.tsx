"use client";
import Link from "next/link";
import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import {
  Bookmark,
  Camera,
  ExternalLink,
  Code2,
  Heart,
  ImagePlus,
  Link2,
  LoaderCircle,
  MessageCircle,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import {
  createPostAction,
  addCommentAction,
  deletePostAction,
  toggleBookmarkAction,
  toggleLikeAction,
} from "./actions";
import { Avatar } from "@/components/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
type Post = {
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
  liked: boolean;
  bookmarked: boolean;
  likeCount: number;
  comments: Array<{
    id: string;
    content: string;
    createdAt: string;
    author: { name: string; avatarUrl: string | null };
  }>;
};
function PostComposer() {
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
    if (!response.ok) return toast.error(result.error);
    setImage(result.url);
    toast.success("Image ready to post.");
  }
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex gap-3">
        <div className="bg-accent/15 text-accent grid size-10 shrink-0 place-items-center rounded-full">
          <Camera size={18} />
        </div>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={3000}
          placeholder="What are you building today?"
          className="min-h-20 border-0 bg-transparent p-2 text-base focus:ring-0"
        />
      </div>
      {link && (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-white/[.04] p-3">
          <Link2 size={15} className="text-[#ff987e]" />
          <Input
            aria-label="Post link"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://..."
            className="h-8 border-0 bg-transparent p-0"
          />
          <button onClick={() => setLink("")} aria-label="Remove link">
            <X size={15} />
          </button>
        </div>
      )}
      {image && (
        <div className="mt-3 flex items-center justify-between rounded-xl bg-emerald-500/[.07] p-3 text-xs text-emerald-300">
          <span>Image uploaded and ready</span>
          <button onClick={() => setImage("")} aria-label="Remove image">
            <X size={15} />
          </button>
        </div>
      )}
      <div className="mt-3 flex items-center justify-between border-t border-white/[.06] pt-3">
        <div className="flex gap-1">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
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
            <span className="hidden sm:inline">Add Image</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setLink("https://")}
          >
            <Link2 size={15} />
            <span className="hidden sm:inline">Add Link</span>
          </Button>
        </div>
        <Button
          disabled={
            pending || uploading || (!content.trim() && !link && !image)
          }
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
              } else toast.error(result.error);
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
  return (
    <div className="mt-4 flex gap-2">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Add a thoughtful comment…"
        onKeyDown={(e) => {
          if (e.key === "Enter" && value.trim()) {
            e.preventDefault();
            start(async () => {
              const result = await addCommentAction({ postId, content: value });
              if (result.success) setValue("");
              else toast.error(result.error);
            });
          }
        }}
      />
      <Button
        size="icon"
        disabled={pending || !value.trim()}
        aria-label="Post comment"
        onClick={() =>
          start(async () => {
            const result = await addCommentAction({ postId, content: value });
            if (result.success) setValue("");
            else toast.error(result.error);
          })
        }
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
function PostCard({ post }: { post: Post }) {
  const [pending, start] = useTransition();
  const [liked, setLiked] = useState(post.liked);
  const [count, setCount] = useState(post.likeCount);
  const [bookmarked, setBookmarked] = useState(post.bookmarked);
  const github =
    post.linkUrl &&
    new URL(post.linkUrl).hostname.replace("www.", "") === "github.com";
  return (
    <Card className="overflow-hidden">
      <article className="p-5 sm:p-6">
        <header className="flex items-start gap-3">
          <Avatar name={post.author.name} url={post.author.avatarUrl} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-sm font-semibold text-white">
                {post.author.name}
              </h2>
              <Badge tone={post.author.role === "ADMIN" ? "accent" : "neutral"}>
                {post.author.role === "ADMIN" ? "Instructor" : "Student"}
              </Badge>
            </div>
            <p className="text-muted mt-1 text-[11px]">
              {formatDistanceToNow(new Date(post.createdAt), {
                addSuffix: true,
              })}
              {post.updatedAt !== post.createdAt ? " · edited" : ""}
            </p>
          </div>
          {post.owned && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Delete post"
              onClick={() => {
                if (confirm("Delete this post?"))
                  start(async () => {
                    const result = await deletePostAction(post.id);
                    if (result.error) toast.error(result.error);
                    else toast.success("Post deleted.");
                  });
              }}
            >
              {pending ? (
                <LoaderCircle size={16} className="animate-spin" />
              ) : (
                <Trash2 size={16} />
              )}
            </Button>
          )}
        </header>
        {post.content && (
          <p className="mt-5 text-sm leading-7 whitespace-pre-wrap text-[#d8dce2]">
            {post.content}
          </p>
        )}
        {post.imageUrl && (
          <div className="mt-5 overflow-hidden rounded-xl border border-white/[.07] bg-black/20">
            <Image
              src={post.imageUrl}
              alt="Community post attachment"
              width={1200}
              height={800}
              unoptimized
              className="max-h-[620px] w-full object-cover"
            />
          </div>
        )}
        {post.linkUrl && (
          <a
            href={post.linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`mt-5 flex items-center gap-3 rounded-xl border p-4 transition hover:bg-white/[.05] ${github ? "border-white/10 bg-[#0d1117]" : "border-accent/15 bg-accent/[.05]"}`}
          >
            {github ? (
              <Code2 className="shrink-0" size={22} />
            ) : (
              <Link2 className="shrink-0 text-[#ff987e]" size={21} />
            )}
            <span className="min-w-0 flex-1">
              <b className="block text-xs text-white">
                {github ? "GitHub repository" : "External link"}
              </b>
              <span className="text-muted mt-1 block truncate text-[11px]">
                {post.linkUrl}
              </span>
            </span>
            <ExternalLink size={15} className="text-muted" />
          </a>
        )}
        <div className="mt-5 flex items-center border-t border-white/[.06] pt-3">
          <Button
            variant="ghost"
            size="sm"
            className={liked ? "text-rose-300" : ""}
            onClick={() => {
              setLiked(!liked);
              setCount((value) => value + (liked ? -1 : 1));
              start(async () => {
                const result = await toggleLikeAction(post.id);
                setLiked(result.liked);
              });
            }}
          >
            <Heart size={16} fill={liked ? "currentColor" : "none"} />
            {count}
          </Button>
          <Button variant="ghost" size="sm">
            <MessageCircle size={16} />
            {post.comments.length}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`ml-auto ${bookmarked ? "text-amber-300" : ""}`}
            aria-label="Bookmark"
            onClick={() => {
              setBookmarked(!bookmarked);
              start(async () => {
                const result = await toggleBookmarkAction(post.id);
                setBookmarked(result.bookmarked);
              });
            }}
          >
            <Bookmark size={16} fill={bookmarked ? "currentColor" : "none"} />
          </Button>
        </div>
        {post.comments.length > 0 && (
          <div className="mt-3 space-y-3 rounded-xl bg-black/15 p-3">
            {post.comments.map((comment) => (
              <div key={comment.id} className="flex gap-2.5">
                <Avatar
                  name={comment.author.name}
                  url={comment.author.avatarUrl}
                  size="sm"
                />
                <div>
                  <p className="text-[11px] font-semibold text-white">
                    {comment.author.name}
                  </p>
                  <p className="text-muted mt-0.5 text-xs leading-5">
                    {comment.content}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
        <CommentBox postId={post.id} />
      </article>
    </Card>
  );
}
export function CommunityFeed({
  posts,
  nextPage,
}: {
  posts: Post[];
  nextPage: number | null;
}) {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PostComposer />
      {posts.length ? (
        posts.map((post) => <PostCard key={post.id} post={post} />)
      ) : (
        <Card className="grid min-h-64 place-items-center p-8 text-center">
          <div>
            <MessageCircle className="text-muted mx-auto" size={30} />
            <h2 className="mt-4 font-semibold text-white">
              Be the first to share what you’re building.
            </h2>
            <p className="text-muted mt-2 text-xs">
              Progress gets more valuable when the cohort can learn from it.
            </p>
          </div>
        </Card>
      )}
      {nextPage && (
        <Button asChild variant="secondary" className="w-full">
          <Link href={`/community?page=${nextPage}`}>Load more posts</Link>
        </Button>
      )}
    </div>
  );
}
