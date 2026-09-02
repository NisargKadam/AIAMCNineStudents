export default function Loading() {
  return (
    <div className="animate-pulse space-y-5">
      <div className="h-9 w-56 rounded-xl bg-white/[.07]" />
      <div className="h-4 w-96 max-w-full rounded bg-white/[.04]" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-36 rounded-2xl bg-white/[.05]" />
        ))}
      </div>
      <div className="h-80 rounded-2xl bg-white/[.05]" />
    </div>
  );
}
