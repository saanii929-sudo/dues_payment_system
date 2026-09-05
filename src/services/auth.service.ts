import "@/lib/serverOnly";
import crypto from "node:crypto";
import { connectToDatabase } from "@/lib/db/connection";
import { User, UserRole, PasswordResetToken } from "@/models";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, deleteSession } from "@/lib/auth/session";
import { recordAudit } from "@/lib/audit/recordAudit";
import { notificationProvider } from "@/lib/notifications/console";
import type { SessionUser } from "@/lib/permissions/roles";

export class AuthError extends Error {}

export async function authenticateUser(
  email: string,
  password: string,
): Promise<SessionUser> {
  await connectToDatabase();
  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail });

  const invalidCredentials = () => new AuthError("Invalid email or password.");

  if (!user || !user.isActive) {
    await recordAudit({
      action: "auth.login_failed",
      targetType: "User",
      metadata: { email: normalizedEmail, reason: !user ? "not_found" : "inactive" },
    });
    throw invalidCredentials();
  }

  const passwordMatches = await verifyPassword(password, user.passwordHash);
  if (!passwordMatches) {
    await recordAudit({
      actorId: user._id.toString(),
      action: "auth.login_failed",
      targetType: "User",
      targetId: user._id.toString(),
      metadata: { reason: "bad_password" },
    });
    throw invalidCredentials();
  }

  const userRole = await UserRole.findOne({ userId: user._id, isActive: true });
  if (!userRole) {
    await recordAudit({
      actorId: user._id.toString(),
      action: "auth.login_failed",
      targetType: "User",
      targetId: user._id.toString(),
      metadata: { reason: "no_active_role" },
    });
    throw new AuthError(
      "Your account has no active role assigned. Contact an administrator.",
    );
  }

  await createSession(user._id.toString());
  user.lastLoginAt = new Date();
  await user.save();

  const sessionUser: SessionUser = {
    userId: user._id.toString(),
    role: userRole.roleKey,
    organizationId: userRole.organizationId?.toString(),
    facultyId: userRole.facultyId?.toString(),
    departmentId: userRole.departmentId?.toString(),
  };

  await recordAudit({
    organizationId: sessionUser.organizationId,
    actorId: sessionUser.userId,
    actorRoleSnapshot: sessionUser.role,
    action: "auth.login",
    targetType: "User",
    targetId: sessionUser.userId,
  });

  return sessionUser;
}

export async function logout(actor: SessionUser | null): Promise<void> {
  await deleteSession();
  if (actor) {
    await recordAudit({
      organizationId: actor.organizationId,
      actorId: actor.userId,
      actorRoleSnapshot: actor.role,
      action: "auth.logout",
      targetType: "User",
      targetId: actor.userId,
    });
  }
}

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function requestPasswordReset(
  email: string,
  appBaseUrl: string,
): Promise<void> {
  await connectToDatabase();
  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail });

  if (!user || !user.isActive) {
    return;
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  await PasswordResetToken.create({
    userId: user._id,
    tokenHash: hashToken(rawToken),
    expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
  });

  const resetUrl = `${appBaseUrl}/reset-password/${rawToken}`;
  await notificationProvider.send({
    channel: "EMAIL",
    to: user.email,
    subject: "Reset your password",
    body: `A password reset was requested for your account. This link expires in 1 hour:\n${resetUrl}\n\nIf you did not request this, you can ignore this message.`,
  });

  await recordAudit({
    actorId: user._id.toString(),
    action: "auth.password_reset_requested",
    targetType: "User",
    targetId: user._id.toString(),
  });
}

export async function resetPassword(
  rawToken: string,
  newPassword: string,
): Promise<void> {
  await connectToDatabase();
  const tokenHash = hashToken(rawToken);
  const resetToken = await PasswordResetToken.findOne({ tokenHash });

  const invalidToken = () =>
    new AuthError("This password reset link is invalid or has expired.");

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt.getTime() < Date.now()) {
    throw invalidToken();
  }

  const user = await User.findById(resetToken.userId);
  if (!user || !user.isActive) {
    throw invalidToken();
  }

  user.passwordHash = await hashPassword(newPassword);
  user.passwordChangedAt = new Date();
  await user.save();

  resetToken.usedAt = new Date();
  await resetToken.save();

  await recordAudit({
    actorId: user._id.toString(),
    action: "auth.password_reset_completed",
    targetType: "User",
    targetId: user._id.toString(),
  });
}

export async function changePassword(
  actor: SessionUser,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  await connectToDatabase();
  const user = await User.findById(actor.userId);
  if (!user) {
    throw new AuthError("Account not found.");
  }

  const currentMatches = await verifyPassword(currentPassword, user.passwordHash);
  if (!currentMatches) {
    throw new AuthError("Current password is incorrect.");
  }

  user.passwordHash = await hashPassword(newPassword);
  user.passwordChangedAt = new Date();
  await user.save();

  await recordAudit({
    organizationId: actor.organizationId,
    actorId: actor.userId,
    actorRoleSnapshot: actor.role,
    action: "auth.password_changed",
    targetType: "User",
    targetId: actor.userId,
  });
}
