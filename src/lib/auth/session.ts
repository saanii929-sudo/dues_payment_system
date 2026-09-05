import "@/lib/serverOnly";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getEnv } from "@/lib/validation/env";

const COOKIE_NAME = "session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getSecretKey() {
  return new TextEncoder().encode(getEnv().SESSION_SECRET);
}

/**
 * Deliberately minimal — just enough to identify the session and its
 * expiry. Role and org/faculty/department scope are NOT stored here; they
 * are loaded fresh from the database on every request in lib/auth/dal.ts,
 * so an account deactivation or role change takes effect immediately
 * instead of waiting out a 7-day token. See ARCHITECTURE.md "Session truth
 * moves from the JWT to the database".
 */
export interface SessionPayload {
  userId: string;
  expiresAt: string;
  /** Seconds since epoch, set automatically by jose from setIssuedAt(). */
  iat?: number;
}

export async function encryptSession(userId: string, expiresAt: string): Promise<string> {
  return new SignJWT({ userId, expiresAt })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(new Date(expiresAt))
    .sign(getSecretKey());
}

export async function decryptSession(
  token: string | undefined,
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      algorithms: ["HS256"],
    });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function createSession(userId: string): Promise<void> {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();
  const token = await encryptSession(userId, expiresAt);
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: new Date(expiresAt),
    path: "/",
  });
}

export async function getSessionCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value;
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
