import Link from "next/link";

export type PartnerTab = "pipeline" | "invoices";

const TABS: { key: PartnerTab; label: string; href: string }[] = [
  { key: "pipeline", label: "Student Pipeline", href: "?tab=pipeline" },
  { key: "invoices", label: "Invoices", href: "?tab=invoices" },
];

export default function PartnerTabs({ active }: { active: PartnerTab }) {
  return (
    <div className="flex gap-1 border-b border-gray-200 mb-6">
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            className={`px-4 py-3 text-sm font-medium -mb-px border-b-2 transition-colors ${
              isActive
                ? "border-rise-green text-rise-green"
                : "border-transparent text-rise-brown hover:text-rise-black"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
