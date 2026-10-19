export default function PayLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-surface-muted">
      <header className="border-b border-border bg-surface px-4 py-3">
        <div className="mx-auto flex max-w-md items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-ink text-sm font-bold text-white">
            D
          </span>
          <span className="text-sm font-semibold text-ink">Dues Platform</span>
        </div>
      </header>
      <main className="flex flex-1 justify-center px-4 py-8">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
