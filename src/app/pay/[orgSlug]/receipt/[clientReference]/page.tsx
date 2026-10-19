import { notFound, redirect } from "next/navigation";
import { getPaymentByClientReference } from "@/services/payment.service";
import { Money } from "@/components/finance/money";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="font-medium text-ink">{value}</dd>
    </div>
  );
}

export default async function ReceiptPage({
  params,
}: PageProps<"/pay/[orgSlug]/receipt/[clientReference]">) {
  const { orgSlug, clientReference } = await params;
  const payment = await getPaymentByClientReference(clientReference);
  if (!payment) {
    notFound();
  }

  if (payment.status !== "SUCCESSFUL") {
    redirect(`/pay/${orgSlug}/status/${clientReference}`);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-surface p-6 text-center">
        <p className="text-xs font-medium uppercase tracking-wide text-success">
          Payment successful
        </p>
        <p className="mt-2 text-3xl font-semibold text-ink">
          <Money amountPesewas={payment.amountPesewas} />
        </p>
        <p className="mt-1 text-sm text-ink-muted">{payment.duesConfigurationName}</p>
      </div>

      <div className="rounded-lg border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold text-ink">Receipt</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <Row label="Receipt number" value={payment.receiptNumber ?? "—"} />
          <Row label="Student" value={payment.studentFullName} />
          <Row label="Index number" value={payment.studentIndexNumber} />
          {payment.facultyName && <Row label="Faculty" value={payment.facultyName} />}
          {payment.departmentName && <Row label="Department" value={payment.departmentName} />}
          {payment.academicLevelName && (
            <Row label="Academic level" value={payment.academicLevelName} />
          )}
          {payment.studentCategoryName && (
            <Row label="Student category" value={payment.studentCategoryName} />
          )}
          <Row
            label="Date paid"
            value={payment.paidAt ? new Date(payment.paidAt).toLocaleString() : "—"}
          />
          <Row label="Transaction reference" value={payment.providerReference ?? "—"} />
        </dl>
      </div>

      <p className="text-center text-xs text-ink-muted">
        Save this link or a screenshot of this page as your proof of payment.
      </p>
    </div>
  );
}
