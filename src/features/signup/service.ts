import "server-only";
import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

/**
 * Creates a certification-only account. The batch is the one the person says
 * they studied in, so the account never joins a live batch.
 */
export function createAlumniUser(
  tx: Tx,
  input: {
    email: string;
    fullName: string;
    alumniBatch: number;
    passwordHash: string;
  },
) {
  return tx.user.create({
    data: {
      email: input.email,
      passwordHash: input.passwordHash,
      alumniBatch: input.alumniBatch,
      profile: { create: { fullName: input.fullName } },
    },
    select: { id: true },
  });
}

/**
 * Turns a waiting or declined request into an account that signs in with the
 * password the person chose, and removes the request. An email that gained an
 * account in the meantime keeps that account; the request is still removed.
 */
export async function approveRequest(tx: Tx, requestId: string) {
  const request = await tx.signupRequest.findUnique({
    where: { id: requestId },
  });
  if (!request) return "missing" as const;
  await tx.signupRequest.delete({ where: { id: requestId } });
  const taken = await tx.user.findUnique({
    where: { email: request.email },
    select: { id: true },
  });
  if (taken) return "exists" as const;
  const user = await createAlumniUser(tx, request);
  return {
    userId: user.id,
    email: request.email,
    fullName: request.fullName,
    alumniBatch: request.alumniBatch,
  };
}
