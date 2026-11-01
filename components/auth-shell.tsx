export function AuthShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="safe-top grid min-h-dvh place-items-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="text-3xl font-bold tracking-tight">
            Jimmy&apos;s <span className="text-accent">Split</span>
          </div>
          <p className="mt-1 text-[14px] text-muted">The lifting log by ICT_Jimmy</p>
        </div>
        <h1 className="mb-3 text-[17px] font-semibold">{title}</h1>
        {children}
      </div>
    </main>
  );
}
