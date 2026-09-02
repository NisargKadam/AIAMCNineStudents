import { z } from "zod";

const optionalUrl = z.union([z.literal(""), z.url().max(500)]).optional();
export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  password: z.string().min(1).max(200),
  remember: z.boolean().optional(),
});
export const profileSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  githubUsername: z
    .string()
    .trim()
    .max(39)
    .regex(
      /^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i,
      "Enter a valid GitHub username",
    )
    .or(z.literal("")),
  linkedinUrl: optionalUrl.refine(
    (value) => !value || new URL(value).hostname.endsWith("linkedin.com"),
    "Use a LinkedIn URL",
  ),
  currentRole: z.string().trim().max(100).optional(),
  country: z.string().trim().max(80).optional(),
  timezone: z.string().trim().max(100).optional(),
  bio: z.string().trim().max(500).optional(),
  avatarUrl: optionalUrl,
  openAiApiKey: z.string().trim().max(300).optional(),
  removeApiKey: z.boolean().optional(),
});
export const githubUrlSchema = z
  .url()
  .max(500)
  .refine((value) => {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      (url.hostname === "github.com" || url.hostname === "www.github.com")
    );
  }, "Enter a valid HTTPS GitHub URL");
export const submissionSchema = z.object({
  assignmentId: z.string().min(1),
  githubUrl: githubUrlSchema,
  studentNote: z.string().trim().max(1000).optional(),
});
const imageUrl = z
  .union([
    z.literal(""),
    z.url().max(500),
    z.string().startsWith("/uploads/").max(500),
  ])
  .optional();
export const postSchema = z
  .object({
    content: z.string().trim().max(3000).optional(),
    linkUrl: optionalUrl,
    imageUrl,
  })
  .refine(
    (value) => value.content || value.linkUrl || value.imageUrl,
    "Add text, a link, or an image",
  );
export const commentSchema = z.object({
  postId: z.string().min(1),
  content: z.string().trim().min(1).max(1000),
});
export const assignmentSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(2).max(150),
  description: z.string().trim().max(1000).optional(),
  instructions: z.string().trim().max(5000).optional(),
  dueDate: z.string().optional(),
  sortOrder: z.coerce.number().int().positive(),
  isActive: z.boolean().default(true),
});
export const studentSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  githubUsername: z.string().trim().max(39).optional(),
});
export const prerequisiteSchema = z.object({
  id: z.string().optional(),
  categoryId: z.string().min(1),
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(1000).optional(),
  verification: z.string().trim().max(1000).optional(),
  sortOrder: z.coerce.number().int().positive(),
  isActive: z.boolean().default(true),
});
export const categorySchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).optional(),
  sortOrder: z.coerce.number().int().positive(),
  isActive: z.boolean().default(true),
});
export const reviewSchema = z.object({
  submissionId: z.string(),
  status: z.enum(["REVIEWED", "NEEDS_CHANGES", "COMPLETED"]),
  feedback: z.string().trim().max(2000).optional(),
});
