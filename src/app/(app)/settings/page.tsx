import { verifySession } from "@/lib/auth/dal";
import { getCurrentUserProfile } from "@/services/user.service";
import { ChangePasswordForm } from "./change-password-form";

export default async function SettingsPage() {
  const session = await verifySession();
  const profile = await getCurrentUserProfile(session);

  return (
    <div className="max-w-lg space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-ink">Account settings</h1>
        <p className="text-sm text-ink-muted">Manage your account details and password.</p>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-ink-muted">Name</dt>
          <dd className="text-ink">{profile.fullName}</dd>
          <dt className="text-ink-muted">Email</dt>
          <dd className="text-ink">{profile.email}</dd>
          <dt className="text-ink-muted">Role</dt>
          <dd className="text-ink">{session.role}</dd>
        </dl>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold text-ink">Change password</h2>
        <p className="mt-1 text-xs text-ink-muted">
          You&apos;ll be signed out and asked to log in again afterward.
        </p>
        <div className="mt-4">
          <ChangePasswordForm />
        </div>
      </div>
    </div>
  );
}
