import { notFound } from "next/navigation";
import {
  ShieldCheck,
  ReceiptText,
  Smartphone,
  Timer,
  UserX,
  QrCode,
  Mail,
  Phone,
  ArrowRight,
} from "lucide-react";
import { getPublicOrganizationBySlug } from "@/services/organization.service";
import { listPublicFaculties } from "@/services/faculty.service";
import { listPublicDepartments } from "@/services/department.service";
import { listPublicAcademicLevels } from "@/services/academic-level.service";
import { listPublicStudentCategories } from "@/services/student-category.service";
import { Button } from "@/components/ui/button";
import { PaymentForm } from "./payment-form";

const BENEFITS = [
  {
    icon: ReceiptText,
    title: "Instant digital receipt",
    description: "Get a verifiable receipt the moment your payment clears.",
  },
  {
    icon: Smartphone,
    title: "Mobile Money & Card",
    description: "Pay with the method you already have — no new setup.",
  },
  {
    icon: Timer,
    title: "Real-time confirmation",
    description: "Your dues status updates immediately, not days later.",
  },
  {
    icon: UserX,
    title: "No account required",
    description: "Just your index number — nothing to register or remember.",
  },
];

export default async function PayEntryPage({ params }: PageProps<"/pay/[orgSlug]">) {
  const { orgSlug } = await params;
  const organization = await getPublicOrganizationBySlug(orgSlug);
  if (!organization) {
    notFound();
  }

  const [faculties, departments, academicLevels, studentCategories] = await Promise.all([
    listPublicFaculties(organization.organizationId),
    listPublicDepartments(organization.organizationId),
    listPublicAcademicLevels(organization.organizationId),
    listPublicStudentCategories(organization.organizationId),
  ]);

  const initial = organization.name.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="space-y-8">
      {/* Organization branding */}
      <div className="animate-fade-up flex flex-col items-center gap-3 text-center">
        {organization.logoUrl ? (
          // Arbitrary Org Admin-supplied URL — a plain <img>, not next/image,
          // since there's no fixed set of remote hosts to allowlist here.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={organization.logoUrl}
            alt={`${organization.name} logo`}
            width={56}
            height={56}
            className="h-14 w-14 rounded-xl border border-border object-cover"
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-border bg-surface text-xl font-semibold text-ink">
            {initial}
          </div>
        )}
        <p className="text-sm font-medium text-ink-muted">{organization.name}</p>
      </div>

      {/* Heading + explanation */}
      <div
        className="animate-fade-up space-y-2 text-center"
        style={{ animationDelay: "80ms" }}
      >
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Pay Student Dues</h1>
        <p className="mx-auto max-w-sm text-sm text-ink-muted">
          Complete your dues payment in minutes — enter your index number, confirm your details,
          and pay securely online.
        </p>
      </div>

      {/* Secure payment indicator */}
      <div
        className="animate-fade-up flex justify-center"
        style={{ animationDelay: "140ms" }}
      >
        <div className="inline-flex items-center gap-2 rounded-full border border-success/30 bg-success-muted px-3.5 py-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-pulse-dot absolute inline-flex h-2 w-2 rounded-full bg-success" />
          </span>
          <ShieldCheck className="h-3.5 w-3.5 text-success" strokeWidth={2.25} />
          <span className="text-xs font-medium text-success">Secured &amp; encrypted transaction</span>
        </div>
      </div>

      {/* Payment benefits */}
      <div
        className="animate-fade-up grid grid-cols-1 gap-2.5 sm:grid-cols-2"
        style={{ animationDelay: "200ms" }}
      >
        {BENEFITS.map((benefit) => (
          <div
            key={benefit.title}
            className="flex items-start gap-2.5 rounded-lg border border-border bg-surface p-3"
          >
            <benefit.icon className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={2} />
            <div>
              <p className="text-xs font-semibold text-ink">{benefit.title}</p>
              <p className="text-xs text-ink-muted">{benefit.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Start Payment CTA */}
      <div
        className="animate-fade-up flex justify-center"
        style={{ animationDelay: "260ms" }}
      >
        <Button asChild size="lg" className="w-full max-w-xs group">
          <a href="#payment-form">
            Start Payment
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </a>
        </Button>
      </div>

      {/* Payment form */}
      <div
        id="payment-form"
        className="animate-fade-up scroll-mt-6 space-y-3 rounded-lg border border-border bg-surface p-5"
        style={{ animationDelay: "320ms" }}
      >
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-ink">Enter your details</h2>
          <p className="text-xs text-ink-muted">
            We&apos;ll look up your outstanding dues once you confirm below.
          </p>
        </div>
        <PaymentForm
          orgSlug={orgSlug}
          faculties={faculties}
          departments={departments}
          academicLevels={academicLevels}
          studentCategories={studentCategories}
        />
      </div>

      {/* QR / USSD compatibility */}
      <div className="flex items-start gap-2.5 rounded-lg border border-border bg-surface-muted p-3.5">
        <QrCode className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" strokeWidth={2} />
        <p className="text-xs text-ink-muted">
          No internet on hand? Scan the QR code posted at your Faculty or Department office, or pay
          via USSD from any mobile phone — no smartphone or data required.
        </p>
      </div>

      {/* Support / contact */}
      <div className="space-y-2 rounded-lg border border-border bg-surface p-3.5">
        <p className="text-xs font-semibold text-ink">Need help?</p>
        <div className="space-y-1.5">
          <a
            href={`mailto:${organization.contactEmail}`}
            className="flex items-center gap-2 text-xs text-ink-muted hover:text-accent"
          >
            <Mail className="h-3.5 w-3.5" strokeWidth={2} />
            {organization.contactEmail}
          </a>
          {organization.contactPhone && (
            <a
              href={`tel:${organization.contactPhone}`}
              className="flex items-center gap-2 text-xs text-ink-muted hover:text-accent"
            >
              <Phone className="h-3.5 w-3.5" strokeWidth={2} />
              {organization.contactPhone}
            </a>
          )}
        </div>
      </div>

      <p className="pb-2 text-center text-[11px] leading-relaxed text-ink-muted">
        Payments are encrypted end-to-end and processed by a licensed payment provider. This portal
        never stores your card or Mobile Money PIN.
      </p>
    </div>
  );
}
