"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Settings,
  Building2,
  History,
  CreditCard,
  Percent,
  IdCard,
  Network,
  Layers,
  Tags,
  CalendarRange,
  Receipt,
  Copy,
  Activity,
  FileBarChart,
  ScrollText,
  Banknote,
  ClipboardCheck,
  GraduationCap,
  ListChecks,
} from "lucide-react";
import type { NavSection, NavIconKey } from "@/lib/navigation/nav-config";
import { cn } from "@/utils/cn";

const ICONS: Record<NavIconKey, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  users: Users,
  settings: Settings,
  organizations: Building2,
  audit: History,
  payments: CreditCard,
  revenue: Percent,
  profile: IdCard,
  faculties: Building2,
  departments: Network,
  "academic-levels": Layers,
  "student-categories": Tags,
  "payment-periods": CalendarRange,
  dues: Receipt,
  "duplicate-review": Copy,
  monitoring: Activity,
  reports: FileBarChart,
  ledger: ScrollText,
  withdrawals: Banknote,
  approvals: ClipboardCheck,
  students: GraduationCap,
  matching: ListChecks,
};

function getActiveHref(pathname: string, hrefs: string[]): string | null {
  const matches = hrefs.filter((href) => pathname === href || pathname.startsWith(`${href}/`));
  if (matches.length === 0) return null;
  return matches.reduce((longest, candidate) =>
    candidate.length > longest.length ? candidate : longest,
  );
}

export function NavContent({
  sections,
  onNavigate,
}: {
  sections: NavSection[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const activeHref = getActiveHref(
    pathname,
    sections.flatMap((section) => section.items.map((item) => item.href)),
  );

  return (
    <nav className="flex flex-col gap-5">
      {sections.map((section) => (
        <div key={section.id}>
          <p className="px-3 text-xs font-medium uppercase tracking-wide text-ink-muted">
            {section.label}
          </p>
          <div className="mt-1.5 flex flex-col gap-0.5">
            {section.items.map((item) => {
              const isActive = item.href === activeHref;
              const Icon = ICONS[item.icon];
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-accent-muted text-accent"
                      : "text-ink-muted hover:bg-surface-muted hover:text-ink",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
