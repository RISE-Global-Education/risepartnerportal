export default function Loading() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-12 bg-white rounded-xl border border-gray-200 animate-pulse" />
      ))}
    </div>
  );
}
