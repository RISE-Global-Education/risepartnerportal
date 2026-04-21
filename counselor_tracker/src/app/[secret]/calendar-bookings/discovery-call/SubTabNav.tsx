"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function DiscoverySubTabNav({ secret }: { secret: string }) {
  const pathname = usePathname();
  const base = `/${secret}/calendar-bookings/discovery-call`;

  const tabs = [
    { label: "Upcoming", href: `${base}/upcoming` },
    { label: "Past", href: `${base}/past` },
    { label: "Unqualified", href: `${base}/unqualified` },
    { label: "Duplicate Leads", href: `${base}/duplicate-leads` },
  ];

  return (
    <div className="flex gap-1 mt-3 border-b border-gray-200">
      {tabs.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              active
                ? "border-rise-green text-rise-green"
                : "border-transparent text-rise-brown hover:text-rise-black hover:border-gray-300"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
