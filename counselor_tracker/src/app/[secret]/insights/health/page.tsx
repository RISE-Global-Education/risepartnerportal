import { getHealth } from "@/lib/health";

export default function HealthPage() {
  const { vars, checkedAt } = getHealth();
  const present = vars.filter((v) => v.present);
  const missing = vars.filter((v) => !v.present);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-lg font-bold text-rise-black font-heading">Environment Health</h1>
        <span
          className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
            missing.length === 0
              ? "bg-emerald-100 text-emerald-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {missing.length === 0 ? "All OK" : `${missing.length} missing`}
        </span>
      </div>
      <p className="text-xs text-rise-brown/60 mb-6">
        Checked at{" "}
        <span className="font-medium text-rise-brown">
          {new Date(checkedAt).toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          })}{" "}
          IST
        </span>
      </p>

      {missing.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2">
            Missing ({missing.length})
          </h2>
          <div className="space-y-2">
            {missing.map((v) => (
              <div
                key={v.key}
                className="flex items-start justify-between bg-red-50 border border-red-200 rounded-xl px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-red-800">{v.label}</p>
                  <p className="text-xs text-red-600/80 mt-0.5">{v.description}</p>
                  <code className="text-xs text-red-500 mt-1 block">{v.key}</code>
                </div>
                <span className="text-xs font-medium bg-red-200 text-red-800 px-2 py-0.5 rounded-full mt-0.5 shrink-0">
                  Missing
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-2">
          Present ({present.length})
        </h2>
        <div className="space-y-2">
          {present.map((v) => (
            <div
              key={v.key}
              className="flex items-start justify-between bg-white border border-gray-100 rounded-xl px-4 py-3"
            >
              <div>
                <p className="text-sm font-semibold text-rise-black">{v.label}</p>
                <p className="text-xs text-rise-brown/70 mt-0.5">{v.description}</p>
                <code className="text-xs text-rise-brown/50 mt-1 block">{v.key}</code>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="text-xs font-medium bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                  Set
                </span>
                {v.preview && (
                  <code className="text-xs text-gray-400">{v.preview}</code>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
