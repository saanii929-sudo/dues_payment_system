import { getFlattenedNavItems, getNavSections } from "@/lib/navigation/nav-config";
import { MobileSidebar } from "./mobile-sidebar";
import { NavSearch } from "./nav-search";
import { NotificationsMenu } from "./notifications-menu";
import { ProfileMenu } from "./profile-menu";
import { HelpMenu } from "./help-menu";
import { PageBreadcrumb } from "./page-breadcrumb";
import { listRecentNotifications } from "@/services/notification.service";
import { getCurrentUserProfile } from "@/services/user.service";
import { logoutAction } from "@/app/(app)/actions";
import type { SessionUser } from "@/lib/permissions/roles";

export async function Header({ user }: { user: SessionUser }) {
  const [profile, notifications] = await Promise.all([
    getCurrentUserProfile(user),
    listRecentNotifications(user),
  ]);
  const sections = getNavSections(user);
  const flatItems = getFlattenedNavItems(user);

  return (
    <header className="flex h-14 items-center justify-between gap-3 border-b border-border bg-surface px-4 lg:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <MobileSidebar sections={sections} />
        <PageBreadcrumb />
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <NavSearch items={flatItems} />
        <NotificationsMenu notifications={notifications} />
        <HelpMenu />
        <ProfileMenu displayName={profile.fullName} role={user.role} logoutAction={logoutAction} />
      </div>
    </header>
  );
}
