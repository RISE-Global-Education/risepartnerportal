"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function SubTabNav({ secret }: { secret: string }) {
  const pathname = usePathname();
  const base = `/${secret}/student-pipeline`;

  const tabs = [
    { label: "Interview Stage", href: `${base}/interview-stage` },
    { label: "Shortlisting Stage", href: `${base}/shortlisting` },
    { label: "Acceptance Stage", href: `${base}/acceptance` },
    { label: "Parent Discovery Stage", href: `${base}/parent-discovery` },
    { label: "2025 Cohort", href: `${base}/cohort-2025` },
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
