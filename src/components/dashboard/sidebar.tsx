import { getNavSections } from "@/lib/navigation/nav-config";
import { NavContent } from "./nav-content";
import { OrgIdentity } from "./org-identity";
import type { SessionUser } from "@/lib/permissions/roles";

export function Sidebar({ user }: { user: SessionUser }) {
  const sections = getNavSections(user);

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface lg:flex">
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-ink text-sm font-bold text-white">
          D
        </span>
        <span className="text-sm font-semibold text-ink">Dues Platform</span>
      </div>
      <div className="border-b border-border">
        <OrgIdentity user={user} />
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <NavContent sections={sections} />
      </div>
    </aside>
  );
}
