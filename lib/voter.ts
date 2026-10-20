import { randomUUID } from "crypto";

export const VOTER_COOKIE = "board_voter";

export function parseVoterToken(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(";").map((p) => p.trim());
  for (const part of parts) {
    const [k, ...rest] = part.split("=");
    if (k === VOTER_COOKIE) return rest.join("=") || null;
  }
  return null;
}

export function getOrCreateVoterToken(req: Request): {
  token: string;
  isNew: boolean;
} {
  const existing = parseVoterToken(req.headers.get("cookie"));
  if (existing) return { token: existing, isNew: false };
  return { token: randomUUID(), isNew: true };
}

export function voterSetCookie(token: string): string {
  return `${VOTER_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000`;
}
