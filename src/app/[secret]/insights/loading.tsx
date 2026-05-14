export default function InsightsLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      {/* Animated top bar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-0.5 bg-gray-100 overflow-hidden">
        <div className="h-full bg-rise-green animate-loading-bar" />
      </div>

      {/* Skeleton content */}
      <div className="animate-pulse space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-5 bg-gray-200 rounded w-48" />
          <div className="h-7 bg-gray-200 rounded-full w-20" />
        </div>
        <div className="h-3 bg-gray-100 rounded w-64" />

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-100 rounded-xl p-5 space-y-2">
              <div className="h-3 bg-gray-200 rounded w-20" />
              <div className="h-8 bg-gray-200 rounded w-16" />
            </div>
          ))}
        </div>

        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          <div className="divide-y divide-gray-50">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex gap-4 px-4 py-3">
                <div className="h-4 bg-gray-100 rounded w-24 shrink-0" />
                <div className="h-4 bg-gray-100 rounded w-32" />
                <div className="h-4 bg-gray-100 rounded w-40" />
                <div className="h-4 bg-gray-100 rounded w-16 ml-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
