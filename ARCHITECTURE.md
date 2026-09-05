# Architecture

Student Dues Payment SaaS — multi-tenant platform for educational organizations to configure dues, accept payments, distribute funds between faculty/department, and maintain financial and audit records.

This document is the durable reference for decisions made in Phase 0. It is expected to be extended (not replaced) as later phases add models, services, and features.

## Next.js version notes

This project runs Next.js 16.3.4, which has real breaking changes from older versions. Before writing framework-facing code, consult `node_modules/next/dist/docs/` — do not assume older Next.js conventions apply. Notably:

- `middleware.ts` is deprecated and renamed to **`proxy.ts`** (`proxy()` export, not `middleware()`).
- **Cache Components** (`"use cache"`, `cacheComponents: true`) are opt-in and **intentionally disabled** in this project (see `next.config.ts`). This app is almost entirely authenticated, tenant-scoped, real-money data with no static/marketing surface — the PPR/Suspense discipline Cache Components require buys nothing here and adds real risk of caching one tenant's financial data where another could see it. All authenticated routes render dynamically per request.
- `params`/`searchParams` are `Promise`s; use the auto-generated `LayoutProps<'/path'>`, `PageProps<'/path'>`, `RouteContext<'/path'>` helpers instead of hand-written param types.

## Application architecture

`src/` layout, App Router, route groups per audience so layouts differ without affecting the URL:

```
src/
├── app/
│   ├── (auth)/                     # /login — public, unauthenticated
│   ├── (platform)/super-admin/     # Super Admin console
│   ├── (org)/admin/                # Organization Admin
│   ├── (org)/faculty/[facultyId]/  # Faculty Dean/President/Treasurer
│   ├── (org)/department/[deptId]/  # HOD/President/Treasurer
│   ├── (org)/pay/[orgSlug]/        # Public student payment flow (by index number)
│   ├── student/                    # Student receipt/history lookup
│   └── api/webhooks/hubtel/route.ts
├── components/{ui,dashboard,finance,payments,tables,forms,charts}/
├── lib/{auth,db,permissions,payments,finance,audit,notifications,reports,validation}/
├── models/       # Mongoose schemas
├── services/     # orchestration over models + lib
├── types/
├── hooks/
└── utils/
proxy.ts          # repo root, optimistic auth redirect only
```

Route groups are an organizational convenience only. **Scope enforcement (an org admin can't see another org, a faculty exec can't see another faculty, etc.) is never trusted from the URL** — it happens in the DAL/services layer on every read and write. See `src/lib/permissions/`.

## Database architecture

- MongoDB + Mongoose, single cluster, **shared multi-tenant collections**. Every tenant-owned document carries `organizationId` (and `facultyId`/`departmentId` where applicable), indexed, compared against the session's scope before any query runs.
- Financial state transitions (payment confirmed → ledger entries → faculty/department balance split) use Mongoose **multi-document transactions** so a payment is never marked successful without its ledger entries being written atomically.
- `src/lib/db/connection.ts`: `globalThis`-cached connection singleton, safe across Next.js dev-mode hot reloads.

## Authentication & session architecture

Custom, DAL-based — not a third-party auth library — because the 8-level scoped role hierarchy doesn't map cleanly onto a generic library's session model.

- Passwords: bcrypt (`src/lib/auth/password.ts`).
- Session: JWT signed with `jose` (HS256), minimal payload (`userId`, `role`, `organizationId?`, `facultyId?`, `departmentId?`, `expiresAt`) — no PII (`src/lib/auth/session.ts`). Stored in an `httpOnly`, `secure`, `sameSite=lax` cookie.
- `src/lib/auth/dal.ts`: `getSession()` / `verifySession()`, wrapped in React's `cache()` — the single source of truth, called from every page, Server Action, and Route Handler that touches data. A layout-level check alone is not sufficient (layouts don't re-run on client-side navigation), and Server Actions are not covered by a proxy matcher change, so every mutation re-verifies.
- `proxy.ts`: optimistic redirect only (unauthenticated → `/login`, authenticated hitting `/login` → dashboard). Reads the cookie, does not hit the database, and is never the actual security boundary.

## RBAC & tenant isolation

Roles (`src/lib/permissions/roles.ts`): `SUPER_ADMIN`, `ORG_ADMIN`, `FACULTY_DEAN`, `FACULTY_PRESIDENT`, `FACULTY_TREASURER`, `DEPT_HOD`, `DEPT_PRESIDENT`, `DEPT_TREASURER`, `STUDENT`.

- `src/lib/permissions/scope.ts`: structural guards (`inOrganization`, `inFaculty`, `inDepartment`) comparing a resource's own scope fields against the session's scope — this is what actually stops cross-tenant access.
- `src/lib/permissions/can.ts`: capability-based checks (`can(user, 'withdrawal:approve', { departmentId })`) so a permission's scope rule is defined once and reused everywhere, instead of `role === 'x'` checks scattered through pages.
- Every service function that reads or writes tenant data takes the authenticated session and asserts scope membership before querying.

## Payment gateway architecture (Hubtel)

- `src/lib/payments/provider.ts`: a `PaymentProvider` interface (`initiate`, `verify`, `parseWebhook`) so Hubtel is a swappable implementation.
- Hubtel (Receive Money / Checkout — MTN MoMo, Vodafone Cash, AirtelTigo, cards) is the first and only implementation. Flow: student looks up dues by **index number** → initiates payment → Hubtel calls `app/api/webhooks/hubtel/route.ts` → the handler verifies the transaction status server-side (a webhook payload is authenticated, never trusted on receipt alone) → on confirmed success, a DB transaction atomically marks the payment successful, writes ledger entries, and applies the faculty/department split. **Receipts are generated only after this confirmed state**, never speculatively.
- Hubtel credentials live in env vars, read only inside `src/lib/payments/hubtel.ts` (Phase 1+).

## Audit architecture

Single `recordAudit(actorId, action, target, metadata)` helper (`src/lib/audit/`, Phase 1+). Every mutating service call is expected to call it — audit logging is a service-layer responsibility, not bolted on in the UI.

## Notification architecture

Provider-agnostic email/SMS interface (`src/lib/notifications/`, Phase 1+), consumed by payment confirmation, withdrawal approval, and student-list-match flows.

## File upload architecture

Official student list imports go through Route Handlers using `Request.formData()`, parsed server-side, matched against payment records by index number (Phase 2+, once the Student model exists).

## Reporting architecture

Query-builder helpers under `src/lib/reports/` built out once ledger/payment models exist (Phase 2+): reconciliation reports, ledger exports, per-faculty/department balances.

## Design system

Tailwind v4, CSS-first `@theme` tokens (`src/app/globals.css`) — a deliberate fintech palette (ink/navy neutrals, one restrained teal accent, semantic success/pending/danger colors), not a purple/blue gradient template look. UI primitives (`src/components/ui/`) are hand-built on Radix primitives + `class-variance-authority` + a `cn()` helper (`src/utils/cn.ts`), not a stock component-library skin.

## Phase status

- **Phase 0:** architecture, folder structure, config, auth/db/permissions/payments scaffolding. No models, no working login, no live payment calls.
- **Phase 1:** the full database layer — see below.
- **Phase 2:** working authentication and RBAC — see below.
- **Phase 3:** the design system and navigation shell — see below.
- **Phase 4:** the Super Admin platform — see below.
- **Phase 5:** the Organization Admin platform — see below.
- **Phase 6 (this):** Faculty/Department management depth — see below.
- **Phase 7+:** the payment flow (Hubtel integration, ledger, revenue distribution) — built and verified sequentially per `AGENTS.md`.

## Phase 1: Database

All 29 collections from the product spec are implemented under `src/models/`, one file per model, sharing two fragments from `src/models/shared/`: `auditFieldsSchemaDefinition` (`createdById`/`updatedById`, nullable for system/webhook writes — `createdAt`/`updatedAt` come from Mongoose's `{ timestamps: true }`) and `deactivationFieldsSchemaDefinition` (`isActive`/`deactivatedAt`/`deactivatedById`). Every model uses the `models.X ?? model<X>(...)` guard to survive Next.js dev hot-reload without `OverwriteModelError`.

**Money and percentages are always integers.** Amounts are `amountPesewas` (integer minor units); revenue splits are integer basis points (10000 = 100%), validated by a schema-level check on `RevenueAllocationRule.splits`. No float currency math anywhere in the schema layer.

**RBAC is normalized: `Role` (catalog) + `UserRole` (assignment) + `User` (credentials only).** `User` carries no role or scope fields — a `UserRole` row assigns one `Role` to one user within a scope (`organizationId`/`facultyId`/`departmentId`, as required by that role's level). A partial unique index on `UserRole` (`{ userId }`, filtered to `isActive: true`) allows at most one active assignment per user, so login stays a single lookup while full role-change history is preserved (old rows are deactivated, never deleted or overwritten). `Role` is seeded from the `ROLES` enum in `src/lib/permissions/roles.ts`, which remains the source of truth for TypeScript types and the `can()`/scope rules — the DB catalog exists for referential integrity and Super Admin visibility, not to replace the code-level rules.

**Students are roster rows, not accounts.** `Student` holds no password — the public payment flow looks students up by index number (see Phase 0). The `STUDENT` role enum value is reserved for a possible future student portal; nothing in Phase 1 creates a `User`/`UserRole` for a student.

**Historical integrity is structural, not just referential.** `Payment.studentSnapshot` freezes the student's faculty/department/level/category *as they were at payment time*; `RevenueAllocation` freezes the rule name and percentage used. A later reorganization (renaming a faculty, changing a student's department) can never retroactively alter what a historical transaction "was for."

**Financial collections are append-only**: `Payment`, `PaymentStatusHistory`, `RevenueAllocation`, `WalletTransaction`, `WithdrawalRequest`/`WithdrawalApproval`/`WithdrawalSettlement`, `Refund`, `AuditLog` have no soft-delete field and no code path ever deletes or overwrites a historical row — state only moves forward (new rows, or a `status` transition). Structural/config collections get the shared soft-deactivation fields instead.

**Wallet balances are ledger-derived.** `FacultyWallet`/`DepartmentWallet.balancePesewas` is only ever changed in the same multi-document transaction that inserts the corresponding `WalletTransaction` row; that row's unique `{walletType, walletId, sourceType, sourceId}` index makes reposting the same source event (e.g. a payment's revenue allocation, or a withdrawal settlement) a no-op instead of a double-credit.

**Seeding**: `npm run db:seed` (`scripts/seed.ts` → `src/lib/db/seed.ts`) inserts the 9-row `Role` catalog and, if `SUPER_ADMIN_EMAIL`/`SUPER_ADMIN_PASSWORD` are set and no Super Admin exists yet, bootstraps one. Idempotent — safe to re-run.

**Note on `server-only`**: Phase 0 used the `server-only` npm package in `lib/auth/`, `lib/db/`, `lib/validation/`. That package throws unconditionally outside Next.js's own webpack build (it has no way to detect a plain Node process), which broke the seed script run via `tsx`. It's replaced by `src/lib/serverOnly.ts`, a one-line `typeof window !== "undefined"` guard — the same runtime protection (a Client Component bundle can never evaluate this code), but it also works correctly under Node scripts and future test runners.

## Phase 2: Authentication & RBAC

**Session truth moved from the JWT to the database.** The session cookie (`src/lib/auth/session.ts`) now carries only `{ userId, expiresAt }` — role and org/faculty/department scope are no longer embedded in the token. `src/lib/auth/dal.ts`'s `getSession()` (still `cache()`-wrapped, one DB round trip per request) loads the `User` (must be `isActive`) and their active `UserRole` fresh on every call and builds `SessionUser` from that live data. This is why deactivating a user or changing their role takes effect on their very next request instead of waiting out a 7-day token — verified live: deactivating a signed-in user immediately turned their existing session cookie into a 401/redirect, with no token refresh or logout involved.

**Password reset invalidates every existing session immediately.** `User.passwordChangedAt` is set on reset; `getSession()` rejects any token whose `iat` (issued-at) predates it. Verified live: a session created before a password reset stopped working the instant the reset completed, and the pre-reset password was rejected on a fresh login attempt while the new one succeeded.

**`PasswordResetToken`** (`src/models/PasswordResetToken.ts`) — a small addition to the Phase 1 schema list. Single-use: `tokenHash` (SHA-256 of a random 32-byte token; the raw token is never persisted, only emailed), `expiresAt` (1 hour, backed by a Mongo TTL index), `usedAt`. Requesting a reset behaves identically whether or not the email exists, to prevent account enumeration.

**Notifications** (`src/lib/notifications/`): a `NotificationProvider` interface mirroring `lib/payments/provider.ts`, with a `console` implementation that logs to the server console instead of sending real email — a deliberate, scoped-down choice for this phase. Swapping in a real provider (Resend, SendGrid, SES, ...) later is a one-file change; no call site depends on the console implementation directly.

**Authorization**: `src/lib/permissions/can.ts` gained `assertCan()`/`ForbiddenError` — every service function in `src/services/` calls it before touching data, so authorization is enforced at the data-access boundary regardless of which page or action called in. `can.ts` also gained the `user:manage` capability (org-scoped, plus Super Admin) backing account activation/deactivation.

**Audit logging** (`src/lib/audit/recordAudit.ts`): writes one `AuditLog` row per sensitive action (`auth.login`, `auth.login_failed`, `auth.logout`, `auth.password_reset_requested`, `auth.password_reset_completed`, `user.deactivated`, `user.reactivated`). Never throws — a failed audit write is logged to the console rather than blocking the underlying operation, since audit logging must not become a new way to break login.

**Privileged-action confirmation**: `src/components/ui/confirm-dialog.tsx`, a reusable Radix-`Dialog`-based gate — the underlying action only runs after an explicit confirm, and an error from it is shown inline rather than silently closing the dialog. First used for account deactivation/reactivation in `/admin/users`.

**MFA**: schema reservation only, per the spec's "optional... architecture" wording. `User` has nullable `mfaEnabled`/`totpSecretEncrypted` fields; no TOTP flow is implemented. A future phase would add a challenge step between password verification and `createSession()` in `authenticateUser()`.

**UI is intentionally minimal in this phase** — `Button`/`Input`/`Label` primitives and bare Tailwind utility classes, no design-system polish. Per `AGENTS.md`'s own ordering, Phase 3 builds the real design system and rebuilds these shells/dashboards on top of the now-working auth underneath. The role-landing pages (`/super-admin`, `/admin`, `/faculty/[facultyId]`, `/department/[departmentId]`) exist to prove org/faculty/department isolation end-to-end, not as final dashboards — this was verified live for every role tier, including that a Faculty Dean is denied a different faculty's page, a department page, and the org-admin page.

**Known limitation, accepted for this phase**: a password reset invalidates sessions (via `passwordChangedAt`), but there is no "log out all other devices" affordance and no session listing — deactivation and password-reset cover the security-critical revocation cases without building session-management UI.

## Phase 3: Design System & Navigation

Fintech-toned tokens from Phase 0 (`src/app/globals.css`) are now backed by a real component set and a permission-aware navigation shell, replacing the one-line header from Phase 2.

**The nav is data-driven and honest about what exists.** `src/lib/navigation/nav-config.ts#getNavSections(user)` returns Main/Financial/Reports/Administration/Settings sections, but **a section only renders once it has an item for that role** — Financial and Reports are defined as section types with no items yet (no payments/wallets/reports exist), rather than padded with "coming soon" links. `ORG_ADMIN` currently sees Administration → Users; every role sees Settings → Account settings. Phase 4 adds Super Admin's Administration items (Organizations, Platform Users, Audit Logs) directly into this same config — the system doesn't need to change shape, only grow.

**Icons are passed as string keys (`NavIconKey`), never component references**, because `nav-config.ts` is imported from both Server Components (`Sidebar`) and Client Components (`NavSearch`) — a raw component/function reference does not survive serialization across that boundary, but a string does. The actual Lucide icon components are looked up from the key in the one client file that needs them, `nav-content.tsx`.

**Org switcher, search, and notifications are real, not decorative.** `OrgIdentity` shows the organization's actual name (no dropdown, since no user belongs to more than one organization in this schema); `NavSearch` filters and navigates the user's actual nav items client-side; `NotificationsMenu` queries the real (currently empty) `Notification` collection. None of these fabricate data — see the Phase 3 plan's "nav is real" and "notifications are real-but-currently-empty" decisions. Each has a documented extension point for when Phase 4+ gives it more to work with (org management → a real switcher; students/payments → real search; payment/withdrawal events → populated notifications).

**One new real feature**: authenticated change-password (`services/auth.service.ts#changePassword`, `/settings`) — reuses the `passwordChangedAt` session-invalidation mechanism from Phase 2, so changing your password signs you out immediately and redirects to `/login`.

**Responsive shell**: persistent sidebar at `lg:` (1024px+, covers both 1280 and 1440 targets, content capped at `max-w-[1600px]`); a Radix-`Dialog`-based drawer below that, sharing the same `NavContent` list component as the desktop sidebar so the navigation logic exists once. Verified visually (Playwright + real screenshots, not just a passing build) at 1440, 1280, 820 (tablet), and 390 (mobile) widths, logged in as a real seeded Org Admin.

**Bug caught and fixed during visual verification**: the active-nav-item check originally used `pathname.startsWith(item.href + '/')`, which made `/admin/users` match both "Dashboard" (`/admin`) and "Users" (`/admin/users`) as prefixes, highlighting both simultaneously. Fixed in `nav-content.tsx#getActiveHref` to pick the *longest* matching href among a user's nav items, so only the most specific match highlights.

## Phase 4: Super Admin Platform

Super Admin can now actually run the platform end to end — every `Organization`/`Faculty`/`Department`/user before this phase existed only because a throwaway seed script put it there.

**New singleton `PlatformSettings`** (`src/models/PlatformSettings.ts`, fixed `_id: "platform"`, upserted on first read) backs three screens — Platform Settings (name/support email), Global Payment Configuration (environment, currency, card/mobile-money toggles), and Global Revenue Rules (basis-point splits, same sum-to-10000 validation as `RevenueAllocationRule`). It isn't decorative: `organization.service.ts#createOrganization` seeds a new org's first `RevenueAllocationRule` from `defaultRevenueSplits`, so editing the global default has a real, visible downstream effect — verified live by creating an org and confirming its rule matched the platform default.

**Organization admin provisioning reuses Phase 2's password-reset flow instead of a new invite system.** `assignOrgAdmin` creates a `User` with an unusable random password hash and `mustResetPassword: true`, creates the `ORG_ADMIN` `UserRole`, then calls the existing `requestPasswordReset`. Verified live end to end: created an org, added an admin, pulled the console-logged reset link, set a real password through it, and logged in as that admin landing on `/admin`.

**Deactivating an organization now actually cuts off its admins**, not just the UI badge. `src/lib/auth/dal.ts#getSession()` gained a check: if the session's `UserRole.organizationId` points at an `Organization` that is no longer `isActive`, the session is rejected — the same live-DB-check pattern Phase 2 established for user deactivation, extended to the org level since Phase 4 is what makes organization deactivation a real, reachable action for the first time. Verified live: deactivating an org while its admin was signed in killed that session on the very next request.

**Dashboard metrics are real aggregation queries** (`dashboard.service.ts`) across `Organization`, `Student`, `Payment`, `FacultyWallet`, `DepartmentWallet`, `WithdrawalRequest`, `WithdrawalSettlement` — and mostly return zero today, honestly, since no payment flow exists yet (Hubtel integration is still just the Phase 0 interface). Nothing is fabricated to make the dashboard look busier than the platform actually is.

**Only one chart was built.** Running the `dataviz` skill's palette validator against the existing success/pending/danger status trio as a categorical chart palette failed colorblind-adjacency (`ΔE 5.3` protan, `12.7` normal-vision — both below the required floor) — reworking colors already shipped across every status badge in the app wasn't worth it for a payments-by-status chart when those counts are already required as individually-labeled stat tiles (the allowed pattern: status color **with** a label, never color alone). The one real chart — transaction volume, last 14 days — is a hand-rolled single-hue SVG bar chart (`components/finance/volume-trend-chart.tsx`), so no adjacency problem applies, with a hover tooltip and a visually-hidden data table for accessibility, per the skill's mark spec.

**A real bug was caught by live verification, not by `tsc`/`lint`/`build`.** `platform.service.ts#getPlatformSettings` originally returned `doc.defaultRevenueSplits` — a Mongoose subdocument array — straight through to `PaymentConfigForm`/`RevenueRulesForm` (Client Components). Mongoose subdocuments carry circular internal references (parent pointers, schema refs) that are not plain, RSC-serializable data; passing them across the server/client boundary crashed every settings page with a 500 (`RangeError: Maximum call stack size exceeded`, `Object.hasOwn`) — invisible to the type checker, since Mongoose's types don't distinguish a subdocument from a plain object. Fixed by mapping to plain `{ beneficiaryType, percentageBps }` objects in the DTO. Caught by actually driving the built app with Playwright and reading the dev server's error log, not by trusting a passing build — the same lesson as Phase 3's nav-highlighting bug, now for a server-side crash instead of a visual glitch.

**Known limitation, accepted for this phase**: Audit Logs is a plain latest-200 list, no filtering or pagination yet — real data (Phase 2 wired `recordAudit` into every sensitive action), just not filterable yet. Platform Users has no bulk actions. Revoking an org admin deactivates the `UserRole`, not the `User` — consistent with Phase 1's role-history model, the account can be reassigned a role later without recreating it.

## Phase 5: Organization Admin

Org Admin can now actually stand up their organization — before this phase, every `Faculty`/`Department`/`AcademicLevel`/`StudentCategory`/`PaymentPeriod` in the database existed only because a throwaway seed script put it there, and the only role ever assignable was another Org Admin (Phase 4).

**One shared activation helper replaced three duplicated blocks.** `src/lib/db/scoped-activation.ts#setEntityActive` is now used by `Organization`, `User`, `Faculty`, `Department`, `AcademicLevel`, `StudentCategory`, `PaymentPeriod`, and `DuesConfiguration` — the exact activate/deactivate block that used to be hand-duplicated in `organization.service.ts` and `user.service.ts` is now one function. Re-verified live afterward (org and user deactivate/reactivate still work).

**New capability `organization:administer`, kept separate from `organization:manage`.** Org Admin needed real authority over their own org's structure and profile, but `organization:manage` gates Super-Admin-only actions from Phase 4 (deactivating an organization, assigning/revoking its Org Admin). Broadening that capability instead would have let an Org Admin deactivate their own organization or revoke a peer Org Admin — a privilege-escalation bug, not a convenience. `organization:administer` is scoped identically (`isSuperAdmin(user) || (ORG_ADMIN && inOrganization(...))`) but reserved for the new Phase 5 actions (profile edit, academic level/student category/payment period CRUD, org-scoped audit log, org dashboard). `faculty:manage`, `department:manage`, and `dues:configure` (all from Phase 0) were reused as-is.

**User & Role Management generalizes Phase 4's org-admin-only flow via refactor, not duplication.** `src/services/role-assignment.service.ts#assignRole`/`revokeRoleAssignment` handle any of the 7 org-scoped roles, with role-appropriate scope validation (a faculty role requires a real `Faculty` in this org; a department role requires a real `Department`, and derives its `facultyId` automatically). `organization.service.ts#assignOrgAdmin`/`revokeOrgAdmin`/`listOrgAdmins` (Phase 4) became thin wrappers around these — Phase 4's Super Admin screen needed zero changes and was re-verified live to still work. `/admin/users` now shows role, faculty/department scope, and account status together, with both "revoke role" (removes access, keeps the account for later reassignment) and "deactivate account" (blocks login outright) as distinct actions, since they're genuinely different things.

**Payment period "current" toggle is sequential updates, not a transaction** — deliberately. This is non-financial housekeeping, and the local standalone MongoDB (no replica set) doesn't support multi-document transactions at all; true transactions stay reserved for actual money movement once that's built. A partial failure here just means no period is marked current for a moment, recoverable by re-clicking.

**Dues Configuration's optional scoping selects are independent, not cross-filtered** — no client-side "faculty narrows department options" logic in this pass, kept simple for an MVP config screen.

**Verified live end to end** (Playwright, same approach as Phases 3–4): created a faculty, a department under it, an academic level, a student category, and a payment period (marked current) as a real seeded Org Admin; assigned a Faculty Dean and a Department HOD through the new role-assignment flow (not a seed script) and confirmed both could set their password via the real console-logged reset link and land on their existing Phase 2 `/faculty/[id]`/`/department/[id]` pages; created a dues configuration referencing the new period and faculty; confirmed the dashboard's stat tiles and recent-activity feed reflected all of it. Zero console errors throughout.

## Phase 6: Academic Structure depth

Faculty and Department management from Phase 5 gained edit, a detail/statistics view, executive visibility, and two validation rules the spec called out that Phase 5 didn't enforce.

**Duplicate-name checks are case-insensitive and safely escaped.** `src/lib/db/escape-regex.ts#escapeRegExp` sanitizes user input before it's used to build a MongoDB case-insensitive regex match — without it, a name containing regex metacharacters (`(`, `.`, `*`, ...) could throw, match too broadly, or become a ReDoS vector. Used by both `faculty.service.ts#assertUniqueFacultyName` and `department.service.ts#assertUniqueDepartmentName` (the latter scoped to `{organizationId, facultyId}`, matching the existing code-uniqueness scope). Verified live: creating "faculty of science" when "Faculty of Science" already existed was correctly rejected.

**"A department may belong to only one active faculty at a time" is now an enforced rule, not just the data model's shape.** `department.service.ts#assertActiveFacultyInOrganization` rejects `createDepartment`/`updateDepartment` when the target faculty is deactivated. Verified live: after deactivating a test faculty, it correctly disappeared from the department-creation faculty `<select>`.

**Edit is a view+edit combined detail page**, matching the `/admin/profile` pattern from Phase 5 — `/admin/faculties/[facultyId]` and `/admin/departments/[departmentId]` show statistics, the executives/HOD list, and an inline pre-filled edit form together, rather than a separate `/edit` route. Both list pages (`FacultiesTable`/`DepartmentsTable`) gained a "View" link per row.

**"Statistics" and "executives" are direct queries added to the existing services**, the same shape Phase 4/5's dashboard metrics already use — `getFacultyDetails` adds a department count, a student count, and a `UserRole` query filtered to the three faculty-level roles; `getDepartmentDetails` mirrors it for the three department-level roles and additionally calls out the `DEPT_HOD` row specifically. No new shared abstraction needed.

**Verified live end to end**: duplicate-name rejection (case-insensitive), faculty edit (name/code) persisting correctly, an existing faculty's detail page showing its real Dean and department count, a deactivated faculty correctly excluded from department assignment, and an existing department's detail page showing its real HOD by name and email. Zero console errors throughout.
