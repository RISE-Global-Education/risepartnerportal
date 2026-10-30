// Shown by each loading.tsx while a page's server data is fetched, so a click
// gets instant feedback instead of the UI freezing until the data arrives.
export default function PageLoading() {
  return (
    <div className="flex items-center justify-center gap-3 py-24 text-sm text-rise-brown" role="status">
      <span className="h-5 w-5 rounded-full border-2 border-rise-green/30 border-t-rise-green animate-spin" />
      Loading…
    </div>
  );
}
