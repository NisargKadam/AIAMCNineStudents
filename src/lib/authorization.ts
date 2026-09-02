import { Role } from "@prisma/client";

export function canAccessAdmin(role: Role) {
  return role === Role.ADMIN;
}

export function canMutateOwnedResource(
  actor: { id: string; role: Role },
  ownerId: string,
) {
  return actor.id === ownerId || actor.role === Role.ADMIN;
}

export function canSubmitForUser(actorId: string, targetUserId: string) {
  return actorId === targetUserId;
}
