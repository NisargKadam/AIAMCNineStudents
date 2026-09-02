export function Progress({ value, label }: { value: number; label?: string }) {
  return (
    <div className="space-y-2">
      {label && (
        <div className="text-muted flex justify-between text-xs">
          <span>{label}</span>
          <span>{Math.round(value)}%</span>
        </div>
      )}
      <div
        className="h-2 overflow-hidden rounded-full bg-white/[.07]"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(value)}
      >
        <div
          className="from-accent h-full rounded-full bg-gradient-to-r to-[#ef7658] transition-all duration-500"
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}
