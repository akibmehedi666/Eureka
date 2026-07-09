export default function DashboardLoading() {
  return (
    <div className="min-h-screen w-full bg-paper text-ink flex flex-col font-sans">
      {/* Header skeleton */}
      <header className="border-b border-border py-3 px-6 md:px-8 bg-paper flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-accent-forest/20 animate-pulse" />
          <div className="h-5 w-20 bg-border animate-pulse" />
          <div className="h-4 w-px bg-border" />
          <div className="h-6 w-32 bg-border/60 animate-pulse" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-16 bg-border/50 animate-pulse" />
          <div className="h-8 w-8 bg-border/40 animate-pulse" />
          <div className="h-8 w-24 bg-border/40 animate-pulse" />
        </div>
      </header>

      {/* Content skeleton */}
      <div className="flex-1 max-w-4xl w-full mx-auto px-4 md:px-8 py-6 space-y-4">
        <div className="flex gap-2 py-4 border-b border-border">
          {[80, 70, 80, 60, 90].map((w, i) => (
            <div key={i} className={`h-7 w-${w / 4} bg-border/50 animate-pulse`} style={{ width: w }} />
          ))}
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="border border-border/60 p-4 space-y-2 animate-pulse">
            <div className="h-4 bg-border/60 w-3/4" />
            <div className="h-3 bg-border/40 w-1/2" />
            <div className="flex gap-2 mt-2">
              <div className="h-5 w-16 bg-border/40" />
              <div className="h-5 w-20 bg-border/30" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
