"use client";

export default function DiscoveryOverviewCards({
  summary,
}: {
  summary: { totalLeads: number; totalConsultations: number; totalFormSent: number };
}) {
  const cards = [
    { label: "Leads Created", value: summary.totalLeads, bg: "bg-amber-50", text: "text-amber-800" },
    { label: "Consultations Held", value: summary.totalConsultations, bg: "bg-blue-50", text: "text-blue-800" },
    { label: "Form Sent", value: summary.totalFormSent, bg: "bg-emerald-50", text: "text-emerald-800" },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {cards.map((card) => (
        <div key={card.label} className={`${card.bg} rounded-xl p-4 sm:p-5`}>
          <p className={`text-xs font-medium ${card.text} opacity-70 uppercase tracking-wide`}>{card.label}</p>
          <p className={`text-2xl sm:text-3xl font-bold ${card.text} mt-1`}>{card.value}</p>
        </div>
      ))}
    </div>
  );
}
