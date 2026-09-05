import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-6 shadow-sm">
      <h1 className="text-lg font-semibold text-ink">Sign in</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Access your organization&apos;s dues platform.
      </p>
      <div className="mt-6">
        <LoginForm />
      </div>
    </div>
  );
}
