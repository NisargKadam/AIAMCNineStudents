"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin, requireUser } from "@/lib/auth/session";
import { commentSchema, postSchema } from "@/lib/validation";
import { audit } from "@/lib/audit";
import { canMutateOwnedResource } from "@/lib/authorization";

export async function createPostAction(input: unknown) {
  const user = await requireUser();
  const parsed = postSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  await db.post.create({
    data: {
      userId: user.id,
      content: parsed.data.content || null,
      linkUrl: parsed.data.linkUrl || null,
      imageUrl: parsed.data.imageUrl || null,
    },
  });
  revalidatePath("/community");
  revalidatePath("/dashboard");
  return { success: "Post published." };
}
export async function updatePostAction(id: string, input: unknown) {
  const user = await requireUser();
  const parsed = postSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const post = await db.post.findUnique({ where: { id } });
  if (!post || post.userId !== user.id)
    return { error: "You can only edit your own posts." };
  await db.post.update({
    where: { id },
    data: {
      content: parsed.data.content || null,
      linkUrl: parsed.data.linkUrl || null,
      imageUrl: parsed.data.imageUrl || null,
    },
  });
  revalidatePath("/community");
  return { success: "Post updated." };
}
export async function deletePostAction(id: string) {
  const user = await requireUser();
  const post = await db.post.findUnique({ where: { id } });
  if (!post || !canMutateOwnedResource(user, post.userId))
    return { error: "You are not allowed to delete this post." };
  await db.post.delete({ where: { id } });
  if (user.role === "ADMIN" && post.userId !== user.id)
    await audit(user.id, "post_moderated", "Post", id);
  revalidatePath("/community");
  revalidatePath("/admin/community");
  return { success: true };
}
export async function moderatePostAction(id: string) {
  await requireAdmin();
  return deletePostAction(id);
}
export async function toggleLikeAction(postId: string) {
  const user = await requireUser();
  const key = { userId_postId: { userId: user.id, postId } };
  const existing = await db.postLike.findUnique({ where: key });
  if (existing) await db.postLike.delete({ where: key });
  else await db.postLike.create({ data: { userId: user.id, postId } });
  revalidatePath("/community");
  return { liked: !existing };
}
export async function toggleBookmarkAction(postId: string) {
  const user = await requireUser();
  const key = { userId_postId: { userId: user.id, postId } };
  const existing = await db.bookmark.findUnique({ where: key });
  if (existing) await db.bookmark.delete({ where: key });
  else await db.bookmark.create({ data: { userId: user.id, postId } });
  revalidatePath("/community");
  return { bookmarked: !existing };
}
export async function addCommentAction(input: unknown) {
  const user = await requireUser();
  const parsed = commentSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  await db.postComment.create({
    data: {
      userId: user.id,
      postId: parsed.data.postId,
      content: parsed.data.content,
    },
  });
  revalidatePath("/community");
  return { success: true };
}

export async function deleteCommentAction(id: string) {
  const user = await requireUser();
  const comment = await db.postComment.findUnique({ where: { id } });
  if (!comment || !canMutateOwnedResource(user, comment.userId))
    return { error: "You can only delete your own comments." };
  await db.postComment.delete({ where: { id } });
  if (user.role === "ADMIN" && comment.userId !== user.id)
    await audit(user.id, "comment_moderated", "PostComment", id);
  revalidatePath("/community");
  return { success: true };
}
