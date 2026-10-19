import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { verifySession } from "@/lib/auth/dal";
import { ROLES } from "@/lib/permissions/roles";
import { getOrganizationDetails } from "@/services/organization.service";
import { generatePaymentQrDataUrl } from "@/lib/qr";
import { ProfileForm } from "./profile-form";

export default async function OrganizationProfilePage() {
  const session = await verifySession();
  if (session.role !== ROLES.ORG_ADMIN || !session.organizationId) {
    redirect("/login");
  }

  const organization = await getOrganizationDetails(session, session.organizationId);

  const headerList = await headers();
  const host = headerList.get("host");
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const paymentUrl = `${protocol}://${host}/pay/${organization.slug}`;
  const qrDataUrl = await generatePaymentQrDataUrl(paymentUrl);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-ink">Organization profile</h1>
        <p className="text-sm text-ink-muted">
          Public URL slug:{" "}
          <span className="font-mono text-ink">{organization.slug}</span> (fixed, cannot be
          changed).
        </p>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <ProfileForm organization={organization} />
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold text-ink">Payment access</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Students can pay their dues at this link — no account or app download required. Print or
          display the QR code around campus for quick access.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-6">
          {/* eslint-disable-next-line @next/next/no-img-element -- a locally-generated data: URI, not a remote image */}
          <img
            src={qrDataUrl}
            alt={`QR code linking to the ${organization.name} payment page`}
            width={160}
            height={160}
            className="rounded-md border border-border"
          />
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
              Payment URL
            </p>
            <a
              href={paymentUrl}
              target="_blank"
              rel="noreferrer"
              className="break-all text-sm font-medium text-accent underline"
            >
              {paymentUrl}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
