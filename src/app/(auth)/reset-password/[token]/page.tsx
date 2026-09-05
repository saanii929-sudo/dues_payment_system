import { ResetPasswordForm } from "./reset-password-form";

export default async function ResetPasswordTokenPage({
  params,
}: PageProps<"/reset-password/[token]">) {
  const { token } = await params;

  return (
    <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-6 shadow-sm">
      <h1 className="text-lg font-semibold text-ink">Choose a new password</h1>
      <div className="mt-6">
        <ResetPasswordForm token={token} />
      </div>
    </div>
  );
}
