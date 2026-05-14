"use client";

function formatDate(dateStr: string): string {
  if (!dateStr) return "Never";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function daysSince(dateStr: string): number {
  if (!dateStr) return Infinity;
  return Math.round((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

export default function CounselorActivityChart({
  data,
}: {
  data: {
    name: string;
    lastReferralDate: string;
    totalStudents: number;
    isActive: boolean;
  }[];
}) {
  const active = data.filter((d) => d.isActive);
  const cold = data.filter((d) => !d.isActive);

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <h3 className="text-sm font-semibold text-rise-black mb-4">Counselor Activity</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-medium text-emerald-700 uppercase tracking-wide mb-2">
            Active ({active.length})
          </p>
          <div className="space-y-1.5 max-h-56 overflow-y-auto">
            {active.length === 0 ? (
              <p className="text-xs text-rise-brown">No active counselors</p>
            ) : (
              active.map((c) => (
                <div key={c.name} className="flex items-center justify-between bg-emerald-50 rounded-lg px-3 py-2">
                  <div>
                    <span className="text-sm font-medium text-rise-black">{c.name}</span>
                    <span className="text-xs text-rise-brown ml-2">{c.totalStudents} students</span>
                  </div>
                  <span className="text-xs text-emerald-600">{daysSince(c.lastReferralDate)}d ago</span>
                </div>
              ))
            )}
          </div>
        </div>
        <div>
          <p className="text-xs font-medium text-red-600 uppercase tracking-wide mb-2">
            Cold / 60+ days ({cold.length})
          </p>
          <div className="space-y-1.5 max-h-56 overflow-y-auto">
            {cold.length === 0 ? (
              <p className="text-xs text-rise-brown">All counselors active</p>
            ) : (
              cold.map((c) => (
                <div key={c.name} className="flex items-center justify-between bg-red-50 rounded-lg px-3 py-2">
                  <div>
                    <span className="text-sm font-medium text-rise-black">{c.name}</span>
                    <span className="text-xs text-rise-brown ml-2">{c.totalStudents} students</span>
                  </div>
                  <span className="text-xs text-red-500">{formatDate(c.lastReferralDate)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
