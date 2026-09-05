import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/dal";
import { resolveHomePath } from "@/lib/auth/redirectHome";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const session = await getSession();
  if (session) {
    redirect(resolveHomePath(session));
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6">
      <div className="w-full max-w-md rounded-lg border border-border bg-surface p-8 text-center shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
          Student Dues Platform
        </p>
        <h1 className="mt-2 text-xl font-semibold text-ink">Welcome</h1>
        <p className="mt-3 text-sm leading-6 text-ink-muted">
          Sign in to manage dues, payments, and fund distribution for your
          organization.
        </p>
        <Button asChild className="mt-6">
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    </div>
  );
}
