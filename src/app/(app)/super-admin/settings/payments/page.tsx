import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth/dal";
import { ROLES } from "@/lib/permissions/roles";
import { getPlatformSettings } from "@/services/platform.service";
import { PaymentConfigForm } from "./payment-config-form";

export default async function PaymentConfigPage() {
  const session = await verifySession();
  if (session.role !== ROLES.SUPER_ADMIN) {
    redirect("/login");
  }

  const settings = await getPlatformSettings();

  return (
    <div className="max-w-lg space-y-4">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-ink">Global payment configuration</h1>
        <p className="text-sm text-ink-muted">
          Governs how payment integration behaves once live.
        </p>
      </div>
      <div className="rounded-lg border border-border bg-surface p-4">
        <PaymentConfigForm settings={settings} />
      </div>
    </div>
  );
}
