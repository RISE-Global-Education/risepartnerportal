"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";

export default function InsightsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const params = useParams<{ secret: string }>();
  const base = `/dashboard/${params.secret}/insights`;

  const tabs = [
    { label: "Mixmax", href: `${base}/mixmax` },
    { label: "Acceptance", href: `${base}/airtable` },
    { label: "Shortlisting", href: `${base}/shortlisting` },
    { label: "PD Booking", href: `${base}/parents-discovery-booking` },
    { label: "PD Form", href: `${base}/parents-discovery-form` },
  ];

  return (
    <div>
      {/* Sub-tab bar */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-1 h-10">
          {tabs.map((tab) => {
            const active = pathname.includes(tab.href);
            return (
              <Link
                key={tab.label}
                href={tab.href}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  active
                    ? "bg-rise-black/5 text-rise-black"
                    : "text-rise-brown hover:text-rise-black hover:bg-gray-50"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>
      {children}
    </div>
  );
}
