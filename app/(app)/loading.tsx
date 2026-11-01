export default function Loading() {
  return (
    <div className="grid gap-4" aria-busy="true" aria-label="Loading">
      <div className="h-9 w-48 animate-pulse rounded-lg bg-panel2" />
      <div className="h-28 animate-pulse rounded-2xl bg-panel" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl bg-panel" />
        ))}
      </div>
    </div>
  );
}
