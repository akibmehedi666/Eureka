export default function TeamsLoading() {
  return (
    <div className="min-h-screen bg-paper text-ink font-sans">
      <div className="fixed left-0 top-0 bottom-0 w-3 bg-accent-forest/10 border-r border-border z-10" />
      <div className="max-w-4xl mx-auto px-6 pl-10 py-12 space-y-6">
        <div className="h-3 w-24 bg-border/50 animate-pulse mb-8" />
        <div className="h-8 w-48 bg-border/60 animate-pulse" />
        <div className="h-4 w-64 bg-border/40 animate-pulse" />
        <div className="grid gap-4 mt-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border border-border p-5 space-y-3 animate-pulse">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="h-5 w-40 bg-border/60" />
                  <div className="h-3 w-64 bg-border/40" />
                </div>
                <div className="h-5 w-16 bg-border/50" />
              </div>
              <div className="flex gap-4">
                <div className="h-3 w-20 bg-border/40" />
                <div className="h-3 w-20 bg-border/40" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
