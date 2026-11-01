export const dynamic = "force-static";

export default function OfflinePage() {
  return (
    <main className="grid min-h-dvh place-items-center px-6 text-center">
      <div className="grid gap-2">
        <div className="text-2xl font-bold">You&apos;re offline</div>
        <p className="text-muted">Jimmy&apos;s Split needs a connection to load your workouts. It&apos;ll pick up where you left off once you&apos;re back online.</p>
      </div>
    </main>
  );
}
