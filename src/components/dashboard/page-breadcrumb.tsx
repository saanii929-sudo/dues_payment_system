"use client";

import { usePathname } from "next/navigation";
import { getRouteTitle } from "@/lib/navigation/route-titles";

export function PageBreadcrumb() {
  const pathname = usePathname();
  const { title, breadcrumb } = getRouteTitle(pathname);

  return (
    <div className="min-w-0">
      <p className="truncate text-xs text-ink-muted">{breadcrumb.join(" / ")}</p>
      <p className="truncate text-sm font-semibold text-ink">{title}</p>
    </div>
  );
}
