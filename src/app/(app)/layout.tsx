import { verifySession } from "@/lib/auth/dal";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await verifySession();

  return (
    <div className="flex min-h-full flex-1">
      <Sidebar user={session} />
      <div className="flex min-h-full flex-1 flex-col overflow-x-hidden">
        <Header user={session} />
        <main className="flex-1 px-4 py-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1600px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
