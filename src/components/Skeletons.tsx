// Placeholder shapes rendered by the route-level loading.tsx files while a
// server page fetches its Airtable / LMS data.

function Block({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-rise-brown/10 ${className}`} />;
}

export function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-20" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** Generic dashboard section: title, stat cards, table rows. */
export function PageSkeleton() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8" aria-busy="true" aria-label="Loading">
      <div className="flex items-center gap-3 mb-6 text-rise-green">
        <Spinner className="h-5 w-5" />
        <span className="text-sm font-medium">Loading…</span>
      </div>
      <Block className="h-8 w-64 mb-6" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <Block key={i} className="h-24" />
        ))}
      </div>
      <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Block key={i} className="h-10" />
        ))}
      </div>
    </div>
  );
}

/** Mirrors the layout of /partner/[slug]: header, funnel stats, student table. */
export function PartnerPageSkeleton() {
  return (
    <div className="min-h-screen bg-rise-cream" aria-busy="true" aria-label="Loading partner">
      <div className="bg-rise-green h-1.5" />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6 text-rise-green">
          <Spinner className="h-5 w-5" />
          <span className="text-sm font-medium">Loading partner…</span>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
          <Block className="h-8 w-72 mb-3" />
          <Block className="h-4 w-48" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Block key={i} className="h-20" />
          ))}
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Block key={i} className="h-10" />
          ))}
        </div>
      </div>
    </div>
  );
}
