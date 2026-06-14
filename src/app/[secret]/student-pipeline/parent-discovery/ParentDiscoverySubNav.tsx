"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function ParentDiscoverySubNav({ secret }: { secret: string }) {
  const pathname = usePathname();
  const base = `/${secret}/student-pipeline/parent-discovery`;

  const tabs = [
    { label: "Missed Calls", href: `${base}/missed-calls` },
    { label: "Not Booked Calls (Emails Opened)", href: `${base}/not-booked-opened` },
    { label: "Not Booked Calls (Emails Not Opened)", href: `${base}/not-booked-not-opened` },
    { label: "Not Booked Calls (No Email Sent)", href: `${base}/not-booked-no-email` },
    { label: "Missed Application Form", href: `${base}/missed-application-form` },
  ];

  return (
    <div className="flex gap-1 mt-4 border-b border-gray-100">
      {tabs.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-3 py-1.5 text-xs font-medium border-b-2 -mb-px transition-colors ${
              active
                ? "border-rise-brown text-rise-brown"
                : "border-transparent text-gray-400 hover:text-rise-black hover:border-gray-300"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
