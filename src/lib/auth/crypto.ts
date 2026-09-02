import { createHash, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";

export const hashSessionToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

export const verifyPassword = (password: string, hash: string) =>
  bcrypt.compare(password, hash);

export function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}
