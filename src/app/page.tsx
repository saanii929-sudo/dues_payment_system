import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  ShieldCheck,
  Wallet,
  GitBranch,
  ClipboardCheck,
  GraduationCap,
  ScrollText,
  Users,
  Building2,
  Lock,
  LayoutDashboard,
  UploadCloud,
  KeyRound,
  Receipt,
  CheckCircle2,
} from "lucide-react";
import { getSession } from "@/lib/auth/dal";
import { resolveHomePath } from "@/lib/auth/redirectHome";
import { getPlatformSettings } from "@/services/platform.service";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/marketing/reveal";

const TRUST_CHIPS = [
  "Multi-tenant by organization",
  "Ledger-first wallets",
  "Capability-based access",
  "Full audit trail",
];

const PERSONAS = [
  {
    icon: Building2,
    title: "Organization Admins",
    description:
      "Configure dues by period, faculty, department, level, and category. Set revenue-split rules once — every payment routes itself.",
  },
  {
    icon: GraduationCap,
    title: "Faculty & Department leadership",
    description:
      "See your wallet, request withdrawals, and approve as Dean or HOD — with balances that only ever move on a confirmed transaction.",
  },
  {
    icon: Users,
    title: "Students",
    description:
      "Pay in under a minute with Mobile Money or card — no account, no app, no password to lose.",
  },
];

const STEPS = [
  {
    number: "01",
    title: "A student pays",
    description: "Index number, a few details, Mobile Money or card. No login required.",
  },
  {
    number: "02",
    title: "Revenue splits automatically",
    description: "Your configured rules divide every payment across organization, faculty, and department wallets.",
  },
  {
    number: "03",
    title: "Withdrawals go through review",
    description: "Treasurer requests, Dean or HOD approves, Super Admin gives final release — never fewer steps.",
  },
  {
    number: "04",
    title: "Everything stays traceable",
    description: "Every hold, release, correction, and decision is a ledger entry — not a number someone edited.",
  },
];

const FEATURES = [
  {
    icon: ScrollText,
    title: "Dues Configuration Engine",
    description: "Scope charges by payment period, faculty, department, level, or category — as broad or specific as you need.",
  },
  {
    icon: GitBranch,
    title: "Revenue Distribution",
    description: "Configurable split rules divide every payment between organization, faculty, and department automatically.",
  },
  {
    icon: Wallet,
    title: "Wallet & Settlement Ledger",
    description: "Six transaction types — allocation, hold, release, refund reversal, adjustment, correction. Balances are always derived, never edited.",
  },
  {
    icon: ClipboardCheck,
    title: "Multi-Stage Withdrawal Approval",
    description: "Request, approve, and release are three distinct steps held by three distinct roles — approval is never fund release.",
  },
  {
    icon: LayoutDashboard,
    title: "Centralized Approval Queue",
    description: "Every Dean, HOD, and Super Admin sees exactly what's waiting on them, in one place.",
  },
  {
    icon: UploadCloud,
    title: "Student List Matching",
    description: "Upload the official roster as CSV or Excel and reconcile it against payments by index number — paid, pending, failed, or unmatched.",
  },
  {
    icon: Receipt,
    title: "Refunds & Duplicate Review",
    description: "Flag duplicate payments and process refunds without breaking the ledger's own accounting.",
  },
  {
    icon: KeyRound,
    title: "Role-Based Access Control",
    description: "Nine distinct roles, each scoped to exactly the organization, faculty, or department they belong to.",
  },
];

const TRUST_PILLARS = [
  {
    icon: Lock,
    title: "Ledger-first, always",
    description: "No balance is ever updated without a corresponding transaction recording why. The ledger is the source of truth, not a cached number.",
  },
  {
    icon: ShieldCheck,
    title: "Approval ≠ release",
    description: "A withdrawal being approved never moves money by itself. Funds only leave a wallet on an explicit, separately-audited release.",
  },
  {
    icon: Users,
    title: "Segregation of duties",
    description: "Nobody approves their own request by default — enforced in code, not just policy, with an explicit override an administrator must opt into.",
  },
  {
    icon: ScrollText,
    title: "Nothing happens quietly",
    description: "Every request, decision, correction, and release is written to an audit log tied to the person who made it.",
  },
];

export default async function Home() {
  const session = await getSession();
  if (session) {
    redirect(resolveHomePath(session));
  }
  const platformSettings = await getPlatformSettings();

  return (
    <div className="min-h-full bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-surface/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink text-sm font-bold text-white">
              D
            </span>
            <span className="text-sm font-semibold text-ink">{platformSettings.platformName}</span>
          </div>
          <Button asChild variant="secondary" size="sm">
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,var(--color-accent-muted),transparent)]"
          />
          <div className="relative mx-auto max-w-6xl px-6 py-20 sm:py-28">
            <div className="mx-auto max-w-2xl text-center">
              <div className="animate-fade-up inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-ink-muted">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                Built for universities and colleges
              </div>
              <h1
                className="animate-fade-up mt-5 text-4xl font-semibold tracking-tight text-ink sm:text-5xl"
                style={{ animationDelay: "80ms" }}
              >
                Dues collection and fund distribution, built for how universities actually work.
              </h1>
              <p
                className="animate-fade-up mx-auto mt-5 max-w-xl text-base leading-7 text-ink-muted"
                style={{ animationDelay: "160ms" }}
              >
                One platform to collect student dues online, split revenue across faculties and
                departments automatically, and approve every withdrawal — with a complete,
                tamper-evident record of where every cedi went.
              </p>
              <div
                className="animate-fade-up mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
                style={{ animationDelay: "240ms" }}
              >
                <Button asChild size="lg" className="group w-full sm:w-auto">
                  <Link href="/login">
                    Sign in
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </Button>
                <Button asChild variant="secondary" size="lg" className="w-full sm:w-auto">
                  <a href="#how-it-works">See how it works</a>
                </Button>
              </div>
              <div
                className="animate-fade-up mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2"
                style={{ animationDelay: "300ms" }}
              >
                {TRUST_CHIPS.map((chip) => (
                  <span key={chip} className="flex items-center gap-1.5 text-xs text-ink-muted">
                    <CheckCircle2 className="h-3.5 w-3.5 text-accent" strokeWidth={2} />
                    {chip}
                  </span>
                ))}
              </div>
            </div>

            {/* Product glimpse */}
            <Reveal delayMs={0} className="mt-16">
              <div className="mx-auto max-w-3xl rounded-xl border border-border bg-surface p-2 shadow-[0_1px_0_rgba(15,23,32,0.03),0_20px_50px_-20px_rgba(15,23,32,0.18)]">
                <div className="flex items-center gap-1.5 border-b border-border px-3 py-2.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-danger/40" />
                  <span className="h-2.5 w-2.5 rounded-full bg-pending/40" />
                  <span className="h-2.5 w-2.5 rounded-full bg-success/40" />
                  <span className="ml-3 text-xs text-ink-muted">Faculty of Science — Financial dashboard</span>
                </div>
                <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
                  {[
                    { label: "Total dues collected", value: "GHS 482,300", accent: "text-ink" },
                    { label: "Faculty share earned", value: "GHS 96,460", accent: "text-success" },
                    { label: "Available balance", value: "GHS 41,200", accent: "text-success" },
                    { label: "Pending withdrawals", value: "GHS 8,500", accent: "text-pending" },
                  ].map((tile) => (
                    <div key={tile.label} className="rounded-lg border border-border p-3">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">
                        {tile.label}
                      </p>
                      <p className={`mt-1.5 text-lg font-semibold tabular-nums ${tile.accent}`}>{tile.value}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-2 border-t border-border p-4">
                  {[
                    { name: "Withdrawal — Lab equipment", status: "Pending Super Admin approval", tone: "text-pending" },
                    { name: "Revenue allocation — 214 payments", status: "Released", tone: "text-success" },
                  ].map((row) => (
                    <div key={row.name} className="flex items-center justify-between text-xs">
                      <span className="text-ink-muted">{row.name}</span>
                      <span className={`font-medium ${row.tone}`}>{row.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Personas */}
        <section className="border-b border-border bg-surface-muted">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <Reveal className="mx-auto max-w-xl text-center">
              <h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
                One platform, built for every role in the finance office
              </h2>
              <p className="mt-3 text-sm leading-6 text-ink-muted">
                Each person sees exactly what belongs to them — nothing more, nothing less.
              </p>
            </Reveal>
            <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-3">
              {PERSONAS.map((persona, index) => (
                <Reveal key={persona.title} delayMs={index * 100}>
                  <div className="h-full rounded-xl border border-border bg-surface p-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-muted">
                      <persona.icon className="h-5 w-5 text-accent" strokeWidth={2} />
                    </div>
                    <h3 className="mt-4 text-sm font-semibold text-ink">{persona.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-ink-muted">{persona.description}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="border-b border-border scroll-mt-16">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <Reveal className="mx-auto max-w-xl text-center">
              <h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
                From payment to release, every step is accounted for
              </h2>
            </Reveal>
            <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((step, index) => (
                <Reveal key={step.number} delayMs={index * 100}>
                  <div className="relative pl-0">
                    <span className="text-3xl font-semibold text-border">{step.number}</span>
                    <h3 className="mt-3 text-sm font-semibold text-ink">{step.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-ink-muted">{step.description}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Feature grid */}
        <section className="border-b border-border bg-surface-muted">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <Reveal className="mx-auto max-w-xl text-center">
              <h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
                Everything the finance office needs, none of the spreadsheets
              </h2>
            </Reveal>
            <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((feature, index) => (
                <Reveal key={feature.title} delayMs={(index % 4) * 80}>
                  <div className="h-full rounded-xl border border-border bg-surface p-5 transition-shadow hover:shadow-[0_8px_24px_-12px_rgba(15,23,32,0.15)]">
                    <feature.icon className="h-5 w-5 text-accent" strokeWidth={2} />
                    <h3 className="mt-3 text-sm font-semibold text-ink">{feature.title}</h3>
                    <p className="mt-1.5 text-xs leading-5 text-ink-muted">{feature.description}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Trust / architecture */}
        <section className="border-b border-border bg-ink">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <Reveal className="mx-auto max-w-xl text-center">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1 text-xs font-medium text-white/70">
                <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2} />
                How the money is actually handled
              </div>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Trust isn&apos;t a feature you bolt on afterward
              </h2>
              <p className="mt-3 text-sm leading-6 text-white/60">
                These aren&apos;t marketing claims — they&apos;re how the ledger is built.
              </p>
            </Reveal>
            <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2">
              {TRUST_PILLARS.map((pillar, index) => (
                <Reveal key={pillar.title} delayMs={index * 100}>
                  <div className="flex h-full gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-5">
                    <pillar.icon className="mt-0.5 h-5 w-5 shrink-0 text-accent" strokeWidth={2} />
                    <div>
                      <h3 className="text-sm font-semibold text-white">{pillar.title}</h3>
                      <p className="mt-1.5 text-sm leading-6 text-white/60">{pillar.description}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section>
          <div className="mx-auto max-w-6xl px-6 py-20">
            <Reveal className="mx-auto flex max-w-2xl flex-col items-center gap-5 rounded-2xl border border-border bg-surface px-8 py-12 text-center">
              <h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
                Already set up on the platform?
              </h2>
              <p className="max-w-md text-sm leading-6 text-ink-muted">
                Sign in to your organization&apos;s dashboard. New institutions are onboarded directly by
                our team — reach out and we&apos;ll get your faculties, departments, and dues structure
                configured.
              </p>
              <div className="flex flex-col items-center gap-3 sm:flex-row">
                <Button asChild size="lg">
                  <Link href="/login">
                    Sign in
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <a
                  href={`mailto:${platformSettings.supportEmail}`}
                  className="text-sm font-medium text-ink-muted hover:text-accent"
                >
                  Talk to us about onboarding →
                </a>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-6 py-8 text-center sm:flex-row sm:justify-between sm:text-left">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-ink text-xs font-bold text-white">
              D
            </span>
            <span className="text-xs font-medium text-ink-muted">{platformSettings.platformName}</span>
          </div>
          <p className="text-xs text-ink-muted">
            © {new Date().getFullYear()} {platformSettings.platformName}. Built for institutional finance offices.
          </p>
        </div>
      </footer>
    </div>
  );
}
