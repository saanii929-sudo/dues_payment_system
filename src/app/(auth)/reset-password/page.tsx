import { RequestResetForm } from "./request-reset-form";

export default function ResetPasswordPage() {
  return (
    <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-6 shadow-sm">
      <h1 className="text-lg font-semibold text-ink">Reset your password</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Enter your email and we&apos;ll send you a reset link.
      </p>
      <div className="mt-6">
        <RequestResetForm />
      </div>
    </div>
  );
}
